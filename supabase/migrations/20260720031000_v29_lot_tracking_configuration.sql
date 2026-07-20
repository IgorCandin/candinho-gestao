-- Candinho Company V29
-- Ativação de rastreio, classificação de estoque legado e quarentena.
-- Já aplicado diretamente no Supabase de produção.

begin;

create or replace view public.supplier_order_items_overview
with (security_invoker=true)
as
select
  poi.id,
  poi.purchase_order_id,
  poi.product_id,
  p.name as product_name,
  p.image_url as product_image_url,
  p.category,
  p.brand,
  poi.quantity_ordered,
  poi.quantity_received,
  (
    poi.quantity_ordered
    -poi.quantity_received
  ) as quantity_pending,
  poi.unit_cost,
  (
    poi.quantity_ordered::numeric
    *poi.unit_cost
  )::numeric(12,2) as total_cost,
  case
    when poi.quantity_received=0
      then 'pending'::text
    when poi.quantity_received<
      poi.quantity_ordered
      then 'partial'::text
    else 'received'::text
  end as item_status,
  poi.notes,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  coalesce((
    select
      sum(
        sr.quantity_requested
        -sr.quantity_reserved
      )::integer
    from public.stock_reservations sr
    where sr.product_id=poi.product_id
      and sr.location_id=
        po.destination_location_id
      and not (
        sr.flavor_id
        is distinct from poi.flavor_id
      )
      and sr.status in (
        'awaiting_stock',
        'partial'
      )
      and sr.quantity_reserved<
        sr.quantity_requested
  ),0) as waiting_sales_units,
  coalesce((
    select count(*)::integer
    from public.stock_reservations sr
    where sr.product_id=poi.product_id
      and sr.location_id=
        po.destination_location_id
      and not (
        sr.flavor_id
        is distinct from poi.flavor_id
      )
      and sr.status in (
        'awaiting_stock',
        'partial'
      )
      and sr.quantity_reserved<
        sr.quantity_requested
  ),0) as waiting_sales_count,
  poi.created_at,
  poi.updated_at,
  poi.flavor_id,
  pf.name as flavor_name,
  p.lot_tracking_enabled
from public.purchase_order_items poi
join public.purchase_orders po
  on po.id=poi.purchase_order_id
join public.products p
  on p.id=poi.product_id
left join public.product_flavors pf
  on pf.id=poi.flavor_id
join public.locations l
  on l.id=po.destination_location_id;

grant select
on public.supplier_order_items_overview
to authenticated,service_role;

create or replace function
public.set_product_lot_tracking(
  p_product_id uuid,
  p_enabled boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_current boolean;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para configurar rastreio de lote';
  end if;

  select lot_tracking_enabled
  into v_current
  from public.products
  where id=p_product_id
    and active
  for update;

  if not found then
    raise exception
      'Produto não encontrado ou inativo';
  end if;

  if coalesce(v_current,false)
     and not coalesce(p_enabled,false)
     and (
       exists(
         select 1
         from public.inventory_lots
         where product_id=p_product_id
       )
       or exists(
         select 1
         from public.inventory_lot_movements
         where product_id=p_product_id
       )
     )
  then
    raise exception
      'O rastreio não pode ser desativado porque já existe histórico de lotes';
  end if;

  update public.products
  set lot_tracking_enabled=
        coalesce(p_enabled,false),
      updated_at=now()
  where id=p_product_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'product',
    p_product_id,
    'lot_tracking_configured',
    jsonb_build_object(
      'enabled',
      coalesce(p_enabled,false)
    )
  );

  return p_product_id;
end;
$$;

revoke all
on function public.set_product_lot_tracking(
  uuid,
  boolean
)
from public,anon;

grant execute
on function public.set_product_lot_tracking(
  uuid,
  boolean
)
to authenticated,service_role;

create or replace function
public.classify_legacy_inventory_lot(
  p_product_id uuid,
  p_location_id uuid,
  p_flavor_id uuid,
  p_lot_number text,
  p_expires_on date,
  p_quantity integer,
  p_received_on date default null,
  p_unit_cost numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_physical integer:=0;
  v_tracked integer:=0;
  v_untracked integer:=0;
  v_lot_id uuid;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para classificar estoque legado';
  end if;

  if p_quantity is null
     or p_quantity<=0
  then
    raise exception
      'Informe uma quantidade maior que zero';
  end if;

  if nullif(
       btrim(p_lot_number),
       ''
     ) is null
  then
    raise exception 'Informe o lote';
  end if;

  if p_expires_on is null then
    raise exception 'Informe a validade';
  end if;

  select *
  into v_product
  from public.products
  where id=p_product_id
    and active
  for update;

  if not found then
    raise exception
      'Produto não encontrado ou inativo';
  end if;

  if not v_product.lot_tracking_enabled then
    raise exception
      'Ative o controle de lote para este produto antes da classificação';
  end if;

  if not exists(
    select 1
    from public.locations
    where id=p_location_id
      and active
      and tracks_inventory
  ) then
    raise exception
      'Local de estoque inválido';
  end if;

  if v_product.flavor_tracking_enabled then
    if p_flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=p_flavor_id
           and product_id=p_product_id
           and active
       )
    then
      raise exception
        'Selecione o sabor correto';
    end if;

    select coalesce(quantity,0)
    into v_physical
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id=p_location_id;
  else
    if p_flavor_id is not null then
      raise exception
        'Este produto não utiliza sabores';
    end if;

    select coalesce(quantity,0)
    into v_physical
    from public.stock_balances
    where product_id=p_product_id
      and location_id=p_location_id;
  end if;

  select
    coalesce(
      sum(quantity_on_hand),
      0
    )::integer
  into v_tracked
  from public.inventory_lots
  where product_id=p_product_id
    and location_id=p_location_id
    and flavor_id
      is not distinct from p_flavor_id;

  v_untracked:=
    greatest(
      coalesce(v_physical,0)
      -coalesce(v_tracked,0),
      0
    );

  if p_quantity>v_untracked then
    raise exception
      'A classificação excede o estoque ainda sem lote. Disponível para classificar: %',
      v_untracked;
  end if;

  v_lot_id:=
    public.get_or_create_inventory_lot(
      p_product_id,
      p_flavor_id,
      p_location_id,
      p_lot_number,
      p_expires_on,
      p_received_on,
      coalesce(
        p_unit_cost,
        v_product.cost_price
      ),
      null,
      p_notes
    );

  update public.inventory_lots
  set quantity_on_hand=
        quantity_on_hand+p_quantity,
      status=case
        when status='quarantined'
          then status
        else 'active'
      end,
      updated_at=now()
  where id=v_lot_id;

  insert into public.inventory_lot_movements(
    inventory_movement_id,
    lot_id,
    product_id,
    flavor_id,
    location_id,
    quantity_delta,
    allocation_kind,
    movement_type,
    lot_number_snapshot,
    expires_on_snapshot,
    notes
  )
  values(
    null,
    v_lot_id,
    p_product_id,
    p_flavor_id,
    p_location_id,
    p_quantity,
    'tracked',
    'legacy_classification',
    btrim(p_lot_number),
    p_expires_on,
    coalesce(
      nullif(
        btrim(p_notes),
        ''
      ),
      'Classificação de estoque existente sem nova movimentação física'
    )
  );

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'inventory_lot',
    v_lot_id,
    'legacy_stock_classified',
    jsonb_build_object(
      'product_id',
        p_product_id,
      'flavor_id',
        p_flavor_id,
      'location_id',
        p_location_id,
      'lot_number',
        btrim(p_lot_number),
      'expires_on',
        p_expires_on,
      'quantity',
        p_quantity,
      'physical_stock_unchanged',
        true
    )
  );

  return v_lot_id;
end;
$$;

revoke all
on function public.classify_legacy_inventory_lot(
  uuid,
  uuid,
  uuid,
  text,
  date,
  integer,
  date,
  numeric,
  text
)
from public,anon;

grant execute
on function public.classify_legacy_inventory_lot(
  uuid,
  uuid,
  uuid,
  text,
  date,
  integer,
  date,
  numeric,
  text
)
to authenticated,service_role;

create or replace function
public.set_inventory_lot_quarantine(
  p_lot_id uuid,
  p_quarantined boolean,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_lot public.inventory_lots%rowtype;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para alterar lotes';
  end if;

  select *
  into v_lot
  from public.inventory_lots
  where id=p_lot_id
  for update;

  if not found then
    raise exception
      'Lote não encontrado';
  end if;

  update public.inventory_lots
  set status=case
        when coalesce(
          p_quarantined,
          false
        ) then 'quarantined'
        when quantity_on_hand=0
          then 'depleted'
        else 'active'
      end,
      notes=case
        when nullif(
          btrim(p_notes),
          ''
        ) is null
          then notes
        when notes is null
          then btrim(p_notes)
        else
          notes
          ||' | '
          ||btrim(p_notes)
      end,
      updated_at=now()
  where id=p_lot_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'inventory_lot',
    p_lot_id,
    case
      when coalesce(
        p_quarantined,
        false
      )
        then 'quarantined'
      else 'quarantine_released'
    end,
    jsonb_build_object(
      'notes',
        nullif(
          btrim(p_notes),
          ''
        ),
      'quantity_on_hand',
        v_lot.quantity_on_hand
    )
  );

  return p_lot_id;
end;
$$;

revoke all
on function public.set_inventory_lot_quarantine(
  uuid,
  boolean,
  text
)
from public,anon;

grant execute
on function public.set_inventory_lot_quarantine(
  uuid,
  boolean,
  text
)
to authenticated,service_role;

commit;
