-- Candinho Company V26
-- Ativação controlada do sabor + classificação do histórico.
-- Já aplicado diretamente no Supabase de produção.

create or replace function public.validate_product_flavor_activation(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists(
    select 1
    from public.stock_reservations sr
    where sr.product_id=p_product_id
      and sr.flavor_id is null
      and sr.status in ('reserved','partial','awaiting_stock')
  ) then
    raise exception
      'Existem vendas pendentes ou reservas antigas sem sabor para este produto. Resolva essas vendas antes de ativar o controle por sabor.';
  end if;

  if exists(
    select 1
    from public.purchase_order_items poi
    join public.purchase_orders po on po.id=poi.purchase_order_id
    where poi.product_id=p_product_id
      and poi.flavor_id is null
      and po.status in ('pending','partial')
      and poi.quantity_received<poi.quantity_ordered
  ) then
    raise exception
      'Existe pedido de fornecedor pendente sem sabor para este produto. Receba ou cancele o pedido antes de ativar o controle por sabor.';
  end if;
end;
$$;

revoke all on function public.validate_product_flavor_activation(uuid)
from public,anon,authenticated;

create or replace function public.enforce_product_flavor_activation_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(old.flavor_tracking_enabled,false)=false
     and coalesce(new.flavor_tracking_enabled,false)=true
  then
    perform public.validate_product_flavor_activation(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists products_validate_flavor_activation
on public.products;

create trigger products_validate_flavor_activation
before update of flavor_tracking_enabled
on public.products
for each row
execute function public.enforce_product_flavor_activation_guard();

create or replace function public.configure_product_flavors(
  p_product_id uuid,
  p_flavors jsonb,
  p_allocations jsonb default '[]'::jsonb,
  p_enable boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_row record;
  v_id uuid;
  v_seen uuid[] := '{}'::uuid[];
  v_name text;
  v_location record;
  v_physical integer;
  v_allocated integer;
  v_reserved integer;
  v_has_allocations boolean :=
    coalesce(jsonb_array_length(coalesce(p_allocations,'[]'::jsonb)),0)>0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para configurar sabores';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id
  for update;

  if not found then
    raise exception 'Produto não encontrado';
  end if;

  if not coalesce(p_enable,true)
     and v_product.flavor_tracking_enabled
  then
    raise exception
      'O controle por sabor já está ativo. Desativação não é permitida para preservar o histórico.';
  end if;

  if p_flavors is null
     or jsonb_typeof(p_flavors)<>'array'
     or jsonb_array_length(p_flavors)=0
  then
    raise exception 'Adicione pelo menos um sabor';
  end if;

  if exists(
    select 1
    from (
      select lower(btrim(name)) name_key,count(*)
      from jsonb_to_recordset(p_flavors)
        as x(id uuid,name text,active boolean,display_order integer)
      where nullif(btrim(name),'') is not null
        and coalesce(active,true)
      group by lower(btrim(name))
      having count(*)>1
    ) d
  ) then
    raise exception 'O mesmo sabor foi informado mais de uma vez';
  end if;

  for v_row in
    select *
    from jsonb_to_recordset(p_flavors)
      as x(id uuid,name text,active boolean,display_order integer)
  loop
    v_name:=nullif(btrim(v_row.name),'');
    if v_name is null then
      raise exception 'Informe o nome de todos os sabores';
    end if;

    v_id:=v_row.id;

    if v_id is not null then
      if not exists(
        select 1
        from public.product_flavors
        where id=v_id
          and product_id=p_product_id
      ) then
        raise exception 'Sabor inválido para este produto';
      end if;

      update public.product_flavors
      set name=v_name,
          active=coalesce(v_row.active,true),
          display_order=coalesce(v_row.display_order,0),
          updated_at=now()
      where id=v_id;
    else
      select id into v_id
      from public.product_flavors
      where product_id=p_product_id
        and lower(btrim(name))=lower(v_name)
      limit 1;

      if v_id is null then
        insert into public.product_flavors(
          product_id,name,active,display_order
        )
        values(
          p_product_id,
          v_name,
          coalesce(v_row.active,true),
          coalesce(v_row.display_order,0)
        )
        returning id into v_id;
      else
        update public.product_flavors
        set name=v_name,
            active=coalesce(v_row.active,true),
            display_order=coalesce(v_row.display_order,0),
            updated_at=now()
        where id=v_id;
      end if;
    end if;

    v_seen:=array_append(v_seen,v_id);
  end loop;

  for v_row in
    select f.id,f.name
    from public.product_flavors f
    where f.product_id=p_product_id
      and f.active
      and not (f.id=any(v_seen))
  loop
    if exists(
      select 1
      from public.product_flavor_stock_balances
      where flavor_id=v_row.id
        and quantity>0
    )
    or exists(
      select 1
      from public.stock_reservations
      where flavor_id=v_row.id
        and status in ('reserved','partial','awaiting_stock')
    )
    or exists(
      select 1
      from public.purchase_order_items poi
      join public.purchase_orders po on po.id=poi.purchase_order_id
      where poi.flavor_id=v_row.id
        and po.status in ('pending','partial')
        and poi.quantity_received<poi.quantity_ordered
    ) then
      raise exception
        'O sabor % ainda possui estoque, reserva ou pedido pendente e não pode ser desativado',
        v_row.name;
    end if;

    update public.product_flavors
    set active=false,
        updated_at=now()
    where id=v_row.id;
  end loop;

  if coalesce(p_enable,true) then
    if not exists(
      select 1
      from public.product_flavors
      where product_id=p_product_id
        and active
    ) then
      raise exception 'Mantenha pelo menos um sabor ativo';
    end if;

    for v_location in
      select
        l.id,
        l.code,
        coalesce(sb.quantity,0)::integer physical_quantity
      from public.locations l
      left join public.stock_balances sb
        on sb.location_id=l.id
       and sb.product_id=p_product_id
      where l.active
        and l.tracks_inventory
    loop
      v_physical:=v_location.physical_quantity;

      select coalesce(sum((x.quantity)::integer),0)::integer
      into v_allocated
      from jsonb_to_recordset(coalesce(p_allocations,'[]'::jsonb))
        as x(location_id uuid,flavor_id uuid,flavor_name text,quantity integer)
      where x.location_id=v_location.id;

      if not v_product.flavor_tracking_enabled then
        if v_allocated<>v_physical then
          raise exception
            'Distribua exatamente % unidade(s) do estoque % entre os sabores. Distribuído: %',
            v_physical,
            v_location.code,
            v_allocated;
        end if;
      elsif v_has_allocations
        and exists(
          select 1
          from jsonb_to_recordset(p_allocations)
            as x(location_id uuid,flavor_id uuid,flavor_name text,quantity integer)
          where x.location_id=v_location.id
        )
        and v_allocated<>v_physical
      then
        raise exception
          'A distribuição do estoque % precisa somar %. Distribuído: %',
          v_location.code,
          v_physical,
          v_allocated;
      end if;
    end loop;

    insert into public.product_flavor_stock_balances(
      flavor_id,location_id,quantity
    )
    select f.id,l.id,0
    from public.product_flavors f
    cross join public.locations l
    where f.product_id=p_product_id
      and l.active
      and l.tracks_inventory
    on conflict(flavor_id,location_id) do nothing;

    if not v_product.flavor_tracking_enabled then
      update public.product_flavor_stock_balances b
      set quantity=0,
          updated_at=now()
      from public.product_flavors f
      where f.id=b.flavor_id
        and f.product_id=p_product_id;
    end if;

    for v_row in
      select *
      from jsonb_to_recordset(coalesce(p_allocations,'[]'::jsonb))
        as x(location_id uuid,flavor_id uuid,flavor_name text,quantity integer)
    loop
      if coalesce(v_row.quantity,0)<0 then
        raise exception 'Quantidade por sabor não pode ser negativa';
      end if;

      v_id:=v_row.flavor_id;

      if v_id is null then
        select id into v_id
        from public.product_flavors
        where product_id=p_product_id
          and active
          and lower(btrim(name))=lower(btrim(v_row.flavor_name))
        limit 1;
      end if;

      if v_id is null
         or not exists(
           select 1
           from public.product_flavors
           where id=v_id
             and product_id=p_product_id
             and active
         )
      then
        raise exception 'Sabor inválido na distribuição de estoque';
      end if;

      if not exists(
        select 1
        from public.locations
        where id=v_row.location_id
          and active
          and tracks_inventory
      ) then
        raise exception 'Local de estoque inválido na distribuição de sabores';
      end if;

      select coalesce(sum(quantity_reserved),0)::integer
      into v_reserved
      from public.stock_reservations
      where flavor_id=v_id
        and location_id=v_row.location_id
        and status in ('reserved','partial');

      if v_row.quantity<v_reserved then
        raise exception
          'O saldo do sabor não pode ficar abaixo das % unidade(s) reservadas',
          v_reserved;
      end if;

      insert into public.product_flavor_stock_balances(
        flavor_id,location_id,quantity
      )
      values(
        v_id,
        v_row.location_id,
        v_row.quantity
      )
      on conflict(flavor_id,location_id)
      do update
      set quantity=excluded.quantity,
          updated_at=now();
    end loop;

    update public.products
    set flavor_tracking_enabled=true,
        flavor_tracking_started_at=coalesce(flavor_tracking_started_at,now()),
        updated_at=now()
    where id=p_product_id;
  end if;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'product',
    p_product_id,
    'flavor_configuration_saved',
    jsonb_build_object(
      'enabled',coalesce(p_enable,true),
      'flavor_count',(
        select count(*)
        from public.product_flavors
        where product_id=p_product_id
          and active
      ),
      'allocations_supplied',v_has_allocations
    )
  );

  return p_product_id;
end;
$$;

create or replace function public.classify_historical_sale_item_flavors(
  p_sale_item_id uuid,
  p_allocations jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.sale_items%rowtype;
  v_product public.products%rowtype;
  v_sum integer;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para classificar histórico de sabores';
  end if;

  select * into v_item
  from public.sale_items
  where id=p_sale_item_id
  for update;

  if not found then
    raise exception 'Item de venda não encontrado';
  end if;

  select * into v_product
  from public.products
  where id=v_item.product_id;

  if not v_product.flavor_tracking_enabled then
    raise exception 'Este produto não possui controle por sabor ativo';
  end if;

  if v_item.flavor_id is not null then
    raise exception
      'Esta venda já foi registrada originalmente com sabor';
  end if;

  if p_allocations is null
     or jsonb_typeof(p_allocations)<>'array'
     or jsonb_array_length(p_allocations)=0
  then
    raise exception 'Informe a distribuição dos sabores desta venda';
  end if;

  select coalesce(sum(quantity),0)::integer
  into v_sum
  from jsonb_to_recordset(p_allocations)
    as x(flavor_id uuid,quantity integer);

  if v_sum<>v_item.quantity then
    raise exception
      'A classificação precisa somar exatamente % unidade(s). Informado: %',
      v_item.quantity,
      v_sum;
  end if;

  if exists(
    select 1
    from jsonb_to_recordset(p_allocations)
      as x(flavor_id uuid,quantity integer)
    left join public.product_flavors f
      on f.id=x.flavor_id
     and f.product_id=v_item.product_id
    where x.flavor_id is null
       or x.quantity is null
       or x.quantity<=0
       or f.id is null
  ) then
    raise exception 'Há sabor ou quantidade inválida na classificação';
  end if;

  if exists(
    select 1
    from jsonb_to_recordset(p_allocations)
      as x(flavor_id uuid,quantity integer)
    group by flavor_id
    having count(*)>1
  ) then
    raise exception 'O mesmo sabor foi informado mais de uma vez';
  end if;

  delete from public.sale_item_flavor_allocations
  where sale_item_id=p_sale_item_id;

  insert into public.sale_item_flavor_allocations(
    sale_item_id,flavor_id,quantity
  )
  select
    p_sale_item_id,
    x.flavor_id,
    x.quantity
  from jsonb_to_recordset(p_allocations)
    as x(flavor_id uuid,quantity integer);

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'sale_item',
    p_sale_item_id,
    'historical_flavor_classified',
    jsonb_build_object('allocations',p_allocations)
  );

  return p_sale_item_id;
end;
$$;

create or replace view public.product_flavor_inventory_overview
with (security_invoker=true)
as
with reserved as (
  select
    flavor_id,
    location_id,
    coalesce(sum(quantity_reserved),0)::integer reserved_quantity
  from public.stock_reservations
  where flavor_id is not null
    and status in ('reserved','partial')
  group by flavor_id,location_id
),
incoming as (
  select
    poi.flavor_id,
    po.destination_location_id location_id,
    coalesce(
      sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),
      0
    )::integer incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id=poi.purchase_order_id
  where poi.flavor_id is not null
    and po.status in ('pending','partial')
    and poi.quantity_received<poi.quantity_ordered
  group by poi.flavor_id,po.destination_location_id
)
select
  f.product_id,
  f.id flavor_id,
  f.name flavor_name,
  f.active,
  f.display_order,
  l.id location_id,
  l.code location_code,
  l.name location_name,
  coalesce(b.quantity,0)::integer physical_quantity,
  coalesce(r.reserved_quantity,0)::integer reserved_quantity,
  greatest(
    coalesce(b.quantity,0)-coalesce(r.reserved_quantity,0),
    0
  )::integer available_quantity,
  coalesce(i.incoming_quantity,0)::integer incoming_quantity
from public.product_flavors f
cross join public.locations l
left join public.product_flavor_stock_balances b
  on b.flavor_id=f.id
 and b.location_id=l.id
left join reserved r
  on r.flavor_id=f.id
 and r.location_id=l.id
left join incoming i
  on i.flavor_id=f.id
 and i.location_id=l.id
where l.active
  and l.tracks_inventory;

grant select on public.product_flavor_inventory_overview
to authenticated,service_role;

create or replace view public.product_flavor_summary
with (security_invoker=true)
as
select
  p.id product_id,
  p.name product_name,
  p.flavor_tracking_enabled,
  p.flavor_tracking_started_at,
  count(distinct f.id) filter(where f.active)::integer active_flavor_count,
  coalesce(sum(v.physical_quantity) filter(where v.active),0)::integer
    flavor_physical_quantity,
  coalesce(sum(v.reserved_quantity) filter(where v.active),0)::integer
    flavor_reserved_quantity,
  coalesce(sum(v.available_quantity) filter(where v.active),0)::integer
    flavor_available_quantity,
  coalesce(sum(v.incoming_quantity) filter(where v.active),0)::integer
    flavor_incoming_quantity
from public.products p
left join public.product_flavors f on f.product_id=p.id
left join public.product_flavor_inventory_overview v on v.flavor_id=f.id
group by p.id;

grant select on public.product_flavor_summary
to authenticated,service_role;

create or replace view public.product_flavor_history_pending
with (security_invoker=true)
as
with allocated as (
  select
    sale_item_id,
    coalesce(sum(quantity),0)::integer allocated_quantity,
    string_agg(
      f.name||' ×'||a.quantity::text,
      ', ' order by f.name
    ) allocation_summary
  from public.sale_item_flavor_allocations a
  join public.product_flavors f on f.id=a.flavor_id
  group by sale_item_id
)
select
  si.id sale_item_id,
  si.sale_id,
  si.product_id,
  p.name product_name,
  si.quantity,
  coalesce(a.allocated_quantity,0)::integer allocated_quantity,
  greatest(
    si.quantity-coalesce(a.allocated_quantity,0),
    0
  )::integer pending_quantity,
  a.allocation_summary,
  s.customer_id,
  coalesce(c.name,s.reference,'Cliente') customer_name,
  (s.quoted_at at time zone 'America/Sao_Paulo')::date sale_date,
  s.general_status,
  si.created_at
from public.sale_items si
join public.products p
  on p.id=si.product_id
 and p.flavor_tracking_enabled
join public.sales s on s.id=si.sale_id
left join public.customers c on c.id=s.customer_id
left join allocated a on a.sale_item_id=si.id
where si.flavor_id is null
  and coalesce(a.allocated_quantity,0)<si.quantity
  and s.record_type='sale'
  and s.general_status<>'cancelled';

grant select on public.product_flavor_history_pending
to authenticated,service_role;

create or replace view public.sale_item_flavor_display
with (security_invoker=true)
as
select
  si.id sale_item_id,
  si.sale_id,
  si.product_id,
  case
    when si.flavor_id is not null then f.name
    when a.summary is not null then a.summary
    else null
  end flavor_summary,
  case
    when si.flavor_id is not null then 'native'
    when a.summary is not null then 'historical_classified'
    else 'unclassified'
  end flavor_status
from public.sale_items si
left join public.product_flavors f on f.id=si.flavor_id
left join lateral (
  select string_agg(
    pf.name||' ×'||x.quantity::text,
    ', ' order by pf.name
  ) summary
  from public.sale_item_flavor_allocations x
  join public.product_flavors pf on pf.id=x.flavor_id
  where x.sale_item_id=si.id
) a on true;

grant select on public.sale_item_flavor_display
to authenticated,service_role;

-- Wrappers atômicos: produto + sabores salvam na mesma transação.
create or replace function public.create_product_record_v2(
  p_name text,
  p_category text,
  p_brand text default null,
  p_sku text default null,
  p_cost_price numeric default 0,
  p_sale_price numeric default 0,
  p_installment_price numeric default null,
  p_min_stock integer default 0,
  p_ideal_stock integer default null,
  p_default_supplier_id uuid default null,
  p_description text default null,
  p_objective text default null,
  p_ideal_profile text default null,
  p_duration_days integer default null,
  p_information text default null,
  p_quick_message text default null,
  p_keywords text default null,
  p_level text default null,
  p_sales_category text default null,
  p_restricted boolean default false,
  p_active boolean default true,
  p_enable_flavors boolean default false,
  p_flavors jsonb default null,
  p_flavor_allocations jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cadastrar produtos';
  end if;

  v_id:=public.create_product_record(
    p_name,
    p_category,
    p_brand,
    p_sku,
    p_cost_price,
    p_sale_price,
    p_installment_price,
    p_min_stock,
    p_ideal_stock,
    p_default_supplier_id,
    p_description,
    p_objective,
    p_ideal_profile,
    p_duration_days,
    p_information,
    p_quick_message,
    p_keywords,
    p_level,
    p_sales_category,
    p_restricted,
    p_active
  );

  if coalesce(p_enable_flavors,false) then
    perform public.configure_product_flavors(
      v_id,
      p_flavors,
      coalesce(p_flavor_allocations,'[]'::jsonb),
      true
    );
  end if;

  return v_id;
end;
$$;

create or replace function public.update_product_record_v2(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_brand text default null,
  p_sku text default null,
  p_cost_price numeric default 0,
  p_sale_price numeric default 0,
  p_installment_price numeric default null,
  p_min_stock integer default 0,
  p_ideal_stock integer default null,
  p_default_supplier_id uuid default null,
  p_description text default null,
  p_objective text default null,
  p_ideal_profile text default null,
  p_duration_days integer default null,
  p_information text default null,
  p_quick_message text default null,
  p_keywords text default null,
  p_level text default null,
  p_sales_category text default null,
  p_restricted boolean default false,
  p_active boolean default true,
  p_enable_flavors boolean default false,
  p_flavors jsonb default null,
  p_flavor_allocations jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar produtos';
  end if;

  v_id:=public.update_product_record(
    p_product_id,
    p_name,
    p_category,
    p_brand,
    p_sku,
    p_cost_price,
    p_sale_price,
    p_installment_price,
    p_min_stock,
    p_ideal_stock,
    p_default_supplier_id,
    p_description,
    p_objective,
    p_ideal_profile,
    p_duration_days,
    p_information,
    p_quick_message,
    p_keywords,
    p_level,
    p_sales_category,
    p_restricted,
    p_active
  );

  if coalesce(p_enable_flavors,false) then
    perform public.configure_product_flavors(
      v_id,
      p_flavors,
      coalesce(p_flavor_allocations,'[]'::jsonb),
      true
    );
  end if;

  return v_id;
end;
$$;

revoke all
on function public.configure_product_flavors(uuid,jsonb,jsonb,boolean)
from public,anon;

revoke all
on function public.classify_historical_sale_item_flavors(uuid,jsonb)
from public,anon;

revoke all
on function public.create_product_record_v2(
  text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,
  text,text,text,integer,text,text,text,text,text,boolean,boolean,
  boolean,jsonb,jsonb
)
from public,anon;

revoke all
on function public.update_product_record_v2(
  uuid,text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,
  text,text,text,integer,text,text,text,text,text,boolean,boolean,
  boolean,jsonb,jsonb
)
from public,anon;

grant execute
on function public.configure_product_flavors(uuid,jsonb,jsonb,boolean)
to authenticated,service_role;

grant execute
on function public.classify_historical_sale_item_flavors(uuid,jsonb)
to authenticated,service_role;

grant execute
on function public.create_product_record_v2(
  text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,
  text,text,text,integer,text,text,text,text,text,boolean,boolean,
  boolean,jsonb,jsonb
)
to authenticated,service_role;

grant execute
on function public.update_product_record_v2(
  uuid,text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,
  text,text,text,integer,text,text,text,text,text,boolean,boolean,
  boolean,jsonb,jsonb
)
to authenticated,service_role;
