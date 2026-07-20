-- Candinho Company V29
-- Núcleo de lote, validade, FEFO e rastreabilidade.
-- Já aplicado diretamente no Supabase de produção.

begin;

alter table public.products
  add column if not exists lot_tracking_enabled boolean not null default false;

alter table public.purchase_receipts
  add column if not exists lot_number text,
  add column if not exists expires_on date;

alter table public.inventory_movements
  add column if not exists lot_number text,
  add column if not exists expires_on date;

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  lot_number text not null,
  expires_on date,
  received_on date,
  unit_cost numeric(12,2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  status text not null default 'active'
    check (status in ('active','quarantined','depleted')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_lots_identity_uidx
on public.inventory_lots (
  product_id,
  location_id,
  coalesce(flavor_id,'00000000-0000-0000-0000-000000000000'::uuid),
  lower(lot_number),
  coalesce(expires_on,'9999-12-31'::date)
);

create index if not exists inventory_lots_expiry_idx
on public.inventory_lots(expires_on, status)
where quantity_on_hand > 0;

create index if not exists inventory_lots_product_location_idx
on public.inventory_lots(product_id, location_id, flavor_id)
where quantity_on_hand > 0;

create table if not exists public.inventory_lot_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_movement_id uuid references public.inventory_movements(id) on delete cascade,
  source_lot_movement_id uuid references public.inventory_lot_movements(id) on delete set null,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  allocation_kind text not null
    check (allocation_kind in ('tracked','untracked')),
  movement_type text not null,
  sale_id uuid references public.sales(id) on delete set null,
  transfer_group_id uuid,
  lot_number_snapshot text,
  expires_on_snapshot date,
  restored_quantity integer not null default 0
    check (restored_quantity >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_lot_movements_lot_idx
on public.inventory_lot_movements(lot_id, created_at desc);

create index if not exists inventory_lot_movements_sale_idx
on public.inventory_lot_movements(sale_id, product_id, flavor_id, created_at);

create index if not exists inventory_lot_movements_transfer_idx
on public.inventory_lot_movements(transfer_group_id, product_id, flavor_id, created_at);

alter table public.inventory_lots enable row level security;
alter table public.inventory_lot_movements enable row level security;

drop policy if exists inventory_lots_read
on public.inventory_lots;

create policy inventory_lots_read
on public.inventory_lots
for select
to authenticated
using ((select public.can_access_operation('supplements')));

drop policy if exists inventory_lot_movements_read
on public.inventory_lot_movements;

create policy inventory_lot_movements_read
on public.inventory_lot_movements
for select
to authenticated
using ((select public.can_access_operation('supplements')));

revoke insert,update,delete,truncate
on public.inventory_lots
from authenticated,anon;

revoke insert,update,delete,truncate
on public.inventory_lot_movements
from authenticated,anon;

grant select
on public.inventory_lots
to authenticated,service_role;

grant select
on public.inventory_lot_movements
to authenticated,service_role;

create or replace function public.get_or_create_inventory_lot(
  p_product_id uuid,
  p_flavor_id uuid,
  p_location_id uuid,
  p_lot_number text,
  p_expires_on date,
  p_received_on date default null,
  p_unit_cost numeric default null,
  p_supplier_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(p_lot_number),'') is null then
    raise exception 'Informe o número do lote';
  end if;

  select id
  into v_id
  from public.inventory_lots
  where product_id=p_product_id
    and location_id=p_location_id
    and flavor_id is not distinct from p_flavor_id
    and lower(lot_number)=lower(btrim(p_lot_number))
    and expires_on is not distinct from p_expires_on
  for update;

  if v_id is null then
    insert into public.inventory_lots(
      product_id,
      flavor_id,
      location_id,
      lot_number,
      expires_on,
      received_on,
      unit_cost,
      supplier_id,
      quantity_on_hand,
      status,
      notes
    )
    values(
      p_product_id,
      p_flavor_id,
      p_location_id,
      btrim(p_lot_number),
      p_expires_on,
      p_received_on,
      p_unit_cost,
      p_supplier_id,
      0,
      'depleted',
      nullif(btrim(p_notes),'')
    )
    returning id into v_id;
  else
    update public.inventory_lots
    set received_on=coalesce(received_on,p_received_on),
        unit_cost=coalesce(p_unit_cost,unit_cost),
        supplier_id=coalesce(supplier_id,p_supplier_id),
        notes=coalesce(nullif(btrim(p_notes),''),notes),
        updated_at=now()
    where id=v_id;
  end if;

  return v_id;
end;
$$;

revoke all
on function public.get_or_create_inventory_lot(
  uuid,uuid,uuid,text,date,date,numeric,uuid,text
)
from public,anon,authenticated;

grant execute
on function public.get_or_create_inventory_lot(
  uuid,uuid,uuid,text,date,date,numeric,uuid,text
)
to service_role;

create or replace function public.apply_inventory_lot_tracking()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enabled boolean:=false;
  v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
  v_lot_id uuid;
  v_dest_lot_id uuid;
  v_remaining integer;
  v_take integer;
  v_current_after integer:=0;
  v_aggregate_before integer:=0;
  v_tracked_before integer:=0;
  v_untracked_before integer:=0;
  v_row record;
  v_source_lot record;
begin
  select coalesce(lot_tracking_enabled,false)
  into v_enabled
  from public.products
  where id=new.product_id;

  if not v_enabled
     and new.lot_number is null
     and not exists(
       select 1
       from public.inventory_lots
       where product_id=new.product_id
         and location_id=new.location_id
         and flavor_id is not distinct from new.flavor_id
     )
  then
    return new;
  end if;

  if new.quantity_delta > 0 then
    if new.movement_type='cancellation'
       and new.sale_id is not null
    then
      v_remaining:=new.quantity_delta;

      for v_row in
        select ilm.*
        from public.inventory_lot_movements ilm
        join public.inventory_movements im
          on im.id=ilm.inventory_movement_id
        where im.sale_id=new.sale_id
          and im.movement_type='sale'
          and ilm.product_id=new.product_id
          and ilm.flavor_id is not distinct from new.flavor_id
          and ilm.quantity_delta<0
          and ilm.restored_quantity<abs(ilm.quantity_delta)
        order by ilm.created_at,ilm.id
      loop
        exit when v_remaining<=0;

        v_take:=least(
          v_remaining,
          abs(v_row.quantity_delta)-v_row.restored_quantity
        );

        if v_row.allocation_kind='tracked'
           and v_row.lot_id is not null
        then
          update public.inventory_lots
          set quantity_on_hand=quantity_on_hand+v_take,
              status=case
                when status='depleted'
                  then 'active'
                else status
              end,
              updated_at=now()
          where id=v_row.lot_id;
        end if;

        insert into public.inventory_lot_movements(
          inventory_movement_id,
          source_lot_movement_id,
          lot_id,
          product_id,
          flavor_id,
          location_id,
          quantity_delta,
          allocation_kind,
          movement_type,
          sale_id,
          transfer_group_id,
          lot_number_snapshot,
          expires_on_snapshot,
          notes
        )
        values(
          new.id,
          v_row.id,
          v_row.lot_id,
          new.product_id,
          new.flavor_id,
          new.location_id,
          v_take,
          v_row.allocation_kind,
          'cancellation',
          new.sale_id,
          new.transfer_group_id,
          v_row.lot_number_snapshot,
          v_row.expires_on_snapshot,
          'Estorno do lote usado na venda'
        );

        update public.inventory_lot_movements
        set restored_quantity=restored_quantity+v_take
        where id=v_row.id;

        v_remaining:=v_remaining-v_take;
      end loop;

      if v_remaining>0 then
        insert into public.inventory_lot_movements(
          inventory_movement_id,
          product_id,
          flavor_id,
          location_id,
          quantity_delta,
          allocation_kind,
          movement_type,
          sale_id,
          transfer_group_id,
          notes
        )
        values(
          new.id,
          new.product_id,
          new.flavor_id,
          new.location_id,
          v_remaining,
          'untracked',
          'cancellation',
          new.sale_id,
          new.transfer_group_id,
          'Estorno de estoque legado sem lote rastreado'
        );
      end if;

      return new;
    end if;

    if new.movement_type='transfer_in'
       and new.transfer_group_id is not null
    then
      v_remaining:=new.quantity_delta;

      for v_row in
        select ilm.*
        from public.inventory_lot_movements ilm
        where ilm.transfer_group_id=new.transfer_group_id
          and ilm.product_id=new.product_id
          and ilm.flavor_id is not distinct from new.flavor_id
          and ilm.movement_type='transfer_out'
          and ilm.quantity_delta<0
        order by ilm.created_at,ilm.id
      loop
        exit when v_remaining<=0;

        v_take:=least(
          v_remaining,
          abs(v_row.quantity_delta)
        );

        if v_row.allocation_kind='tracked'
           and v_row.lot_id is not null
        then
          select *
          into v_source_lot
          from public.inventory_lots
          where id=v_row.lot_id;

          v_dest_lot_id:=
            public.get_or_create_inventory_lot(
              new.product_id,
              new.flavor_id,
              new.location_id,
              v_source_lot.lot_number,
              v_source_lot.expires_on,
              v_source_lot.received_on,
              v_source_lot.unit_cost,
              v_source_lot.supplier_id,
              v_source_lot.notes
            );

          update public.inventory_lots
          set quantity_on_hand=quantity_on_hand+v_take,
              status=case
                when status='quarantined'
                  then status
                else 'active'
              end,
              updated_at=now()
          where id=v_dest_lot_id;

          insert into public.inventory_lot_movements(
            inventory_movement_id,
            source_lot_movement_id,
            lot_id,
            product_id,
            flavor_id,
            location_id,
            quantity_delta,
            allocation_kind,
            movement_type,
            transfer_group_id,
            lot_number_snapshot,
            expires_on_snapshot,
            notes
          )
          values(
            new.id,
            v_row.id,
            v_dest_lot_id,
            new.product_id,
            new.flavor_id,
            new.location_id,
            v_take,
            'tracked',
            'transfer_in',
            new.transfer_group_id,
            v_source_lot.lot_number,
            v_source_lot.expires_on,
            'Transferência de lote rastreado'
          );
        else
          insert into public.inventory_lot_movements(
            inventory_movement_id,
            source_lot_movement_id,
            product_id,
            flavor_id,
            location_id,
            quantity_delta,
            allocation_kind,
            movement_type,
            transfer_group_id,
            notes
          )
          values(
            new.id,
            v_row.id,
            new.product_id,
            new.flavor_id,
            new.location_id,
            v_take,
            'untracked',
            'transfer_in',
            new.transfer_group_id,
            'Transferência de estoque legado sem lote'
          );
        end if;

        v_remaining:=v_remaining-v_take;
      end loop;

      if v_remaining>0 then
        insert into public.inventory_lot_movements(
          inventory_movement_id,
          product_id,
          flavor_id,
          location_id,
          quantity_delta,
          allocation_kind,
          movement_type,
          transfer_group_id,
          notes
        )
        values(
          new.id,
          new.product_id,
          new.flavor_id,
          new.location_id,
          v_remaining,
          'untracked',
          'transfer_in',
          new.transfer_group_id,
          'Transferência sem composição de lote disponível'
        );
      end if;

      return new;
    end if;

    if new.lot_number is not null then
      if v_enabled
         and new.expires_on is null
      then
        raise exception
          'Informe a validade do lote para este produto';
      end if;

      v_lot_id:=
        public.get_or_create_inventory_lot(
          new.product_id,
          new.flavor_id,
          new.location_id,
          new.lot_number,
          new.expires_on,
          (
            new.created_at
            at time zone 'America/Sao_Paulo'
          )::date,
          null,
          null,
          new.notes
        );

      update public.inventory_lots
      set quantity_on_hand=
            quantity_on_hand+new.quantity_delta,
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
        sale_id,
        transfer_group_id,
        lot_number_snapshot,
        expires_on_snapshot,
        notes
      )
      values(
        new.id,
        v_lot_id,
        new.product_id,
        new.flavor_id,
        new.location_id,
        new.quantity_delta,
        'tracked',
        new.movement_type,
        new.sale_id,
        new.transfer_group_id,
        btrim(new.lot_number),
        new.expires_on,
        new.notes
      );
    else
      if v_enabled
         and new.movement_type='purchase'
      then
        raise exception
          'Informe lote e validade antes de receber este produto';
      end if;

      insert into public.inventory_lot_movements(
        inventory_movement_id,
        product_id,
        flavor_id,
        location_id,
        quantity_delta,
        allocation_kind,
        movement_type,
        sale_id,
        transfer_group_id,
        notes
      )
      values(
        new.id,
        new.product_id,
        new.flavor_id,
        new.location_id,
        new.quantity_delta,
        'untracked',
        new.movement_type,
        new.sale_id,
        new.transfer_group_id,
        coalesce(
          new.notes,
          'Movimento positivo sem lote rastreado'
        )
      );
    end if;

    return new;
  end if;

  if new.quantity_delta < 0 then
    v_remaining:=abs(new.quantity_delta);

    if new.flavor_id is not null then
      select coalesce(quantity,0)
      into v_current_after
      from public.product_flavor_stock_balances
      where flavor_id=new.flavor_id
        and location_id=new.location_id;
    else
      select coalesce(quantity,0)
      into v_current_after
      from public.stock_balances
      where product_id=new.product_id
        and location_id=new.location_id;
    end if;

    v_aggregate_before:=
      coalesce(v_current_after,0)
      +abs(new.quantity_delta);

    select
      coalesce(sum(quantity_on_hand),0)::integer
    into v_tracked_before
    from public.inventory_lots
    where product_id=new.product_id
      and location_id=new.location_id
      and flavor_id is not distinct from new.flavor_id;

    v_untracked_before:=
      greatest(
        v_aggregate_before-v_tracked_before,
        0
      );

    if new.movement_type='adjustment'
       and v_untracked_before>0
    then
      v_take:=least(
        v_remaining,
        v_untracked_before
      );

      insert into public.inventory_lot_movements(
        inventory_movement_id,
        product_id,
        flavor_id,
        location_id,
        quantity_delta,
        allocation_kind,
        movement_type,
        sale_id,
        transfer_group_id,
        notes
      )
      values(
        new.id,
        new.product_id,
        new.flavor_id,
        new.location_id,
        -v_take,
        'untracked',
        'adjustment',
        new.sale_id,
        new.transfer_group_id,
        'Ajuste consumiu primeiro estoque legado sem lote'
      );

      v_remaining:=v_remaining-v_take;
    end if;

    for v_row in
      select *
      from public.inventory_lots
      where product_id=new.product_id
        and location_id=new.location_id
        and flavor_id is not distinct from new.flavor_id
        and quantity_on_hand>0
        and (
          new.movement_type='adjustment'
          or (
            status<>'quarantined'
            and (
              expires_on is null
              or expires_on>=v_today
            )
          )
        )
      order by
        case
          when expires_on is null then 1
          else 0
        end,
        expires_on,
        received_on nulls last,
        created_at,
        id
      for update
    loop
      exit when v_remaining<=0;

      v_take:=least(
        v_remaining,
        v_row.quantity_on_hand
      );

      update public.inventory_lots
      set quantity_on_hand=
            quantity_on_hand-v_take,
          status=case
            when quantity_on_hand-v_take=0
              then 'depleted'
            else status
          end,
          updated_at=now()
      where id=v_row.id;

      insert into public.inventory_lot_movements(
        inventory_movement_id,
        lot_id,
        product_id,
        flavor_id,
        location_id,
        quantity_delta,
        allocation_kind,
        movement_type,
        sale_id,
        transfer_group_id,
        lot_number_snapshot,
        expires_on_snapshot,
        notes
      )
      values(
        new.id,
        v_row.id,
        new.product_id,
        new.flavor_id,
        new.location_id,
        -v_take,
        'tracked',
        new.movement_type,
        new.sale_id,
        new.transfer_group_id,
        v_row.lot_number,
        v_row.expires_on,
        case
          when new.movement_type='sale'
            then 'Baixa FEFO do lote'
          else new.notes
        end
      );

      v_remaining:=v_remaining-v_take;
    end loop;

    if v_remaining>0
       and new.movement_type<>'adjustment'
       and v_untracked_before>0
    then
      v_take:=least(
        v_remaining,
        v_untracked_before
      );

      insert into public.inventory_lot_movements(
        inventory_movement_id,
        product_id,
        flavor_id,
        location_id,
        quantity_delta,
        allocation_kind,
        movement_type,
        sale_id,
        transfer_group_id,
        notes
      )
      values(
        new.id,
        new.product_id,
        new.flavor_id,
        new.location_id,
        -v_take,
        'untracked',
        new.movement_type,
        new.sale_id,
        new.transfer_group_id,
        'Saída consumiu estoque legado ainda sem lote classificado'
      );

      v_remaining:=v_remaining-v_take;
    end if;

    if v_remaining>0 then
      raise exception
        'Não há estoque válido/rastreável suficiente para concluir este movimento. Restante sem cobertura: % unidade(s)',
        v_remaining;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  zz_inventory_movements_apply_lot_tracking
on public.inventory_movements;

create trigger
  zz_inventory_movements_apply_lot_tracking
after insert
on public.inventory_movements
for each row
execute function public.apply_inventory_lot_tracking();

create or replace view public.inventory_lot_overview
with (security_invoker=true)
as
select
  il.id,
  il.product_id,
  p.name as product_name,
  p.category,
  p.brand,
  il.flavor_id,
  pf.name as flavor_name,
  il.location_id,
  l.code as location_code,
  l.name as location_name,
  il.lot_number,
  il.expires_on,
  il.received_on,
  il.unit_cost,
  il.supplier_id,
  s.name as supplier_name,
  il.quantity_on_hand,
  il.status,
  il.notes,
  case
    when il.status='quarantined'
      then 'quarantined'
    when il.expires_on is not null
      and il.expires_on<
        (now() at time zone 'America/Sao_Paulo')::date
      then 'expired'
    when il.expires_on is not null
      and il.expires_on<=
        (now() at time zone 'America/Sao_Paulo')::date+30
      then 'expires_30'
    when il.expires_on is not null
      and il.expires_on<=
        (now() at time zone 'America/Sao_Paulo')::date+60
      then 'expires_60'
    when il.expires_on is not null
      and il.expires_on<=
        (now() at time zone 'America/Sao_Paulo')::date+90
      then 'expires_90'
    else 'ok'
  end as expiry_status,
  case
    when il.expires_on is null
      then null
    else
      il.expires_on
      -(now() at time zone 'America/Sao_Paulo')::date
  end as days_to_expiry,
  il.created_at,
  il.updated_at
from public.inventory_lots il
join public.products p
  on p.id=il.product_id
left join public.product_flavors pf
  on pf.id=il.flavor_id
join public.locations l
  on l.id=il.location_id
left join public.suppliers s
  on s.id=il.supplier_id;

grant select
on public.inventory_lot_overview
to authenticated,service_role;

create or replace view public.inventory_lot_coverage_overview
with (security_invoker=true)
as
with stock_rows as (
  select
    p.id as product_id,
    null::uuid as flavor_id,
    sb.location_id,
    sb.quantity::integer as physical_quantity
  from public.products p
  join public.stock_balances sb
    on sb.product_id=p.id
  where p.active
    and p.lot_tracking_enabled
    and not p.flavor_tracking_enabled

  union all

  select
    p.id,
    pf.id,
    pfsb.location_id,
    pfsb.quantity::integer
  from public.products p
  join public.product_flavors pf
    on pf.product_id=p.id
   and pf.active
  join public.product_flavor_stock_balances pfsb
    on pfsb.flavor_id=pf.id
  where p.active
    and p.lot_tracking_enabled
    and p.flavor_tracking_enabled
),
tracked as (
  select
    product_id,
    flavor_id,
    location_id,
    coalesce(sum(quantity_on_hand),0)::integer
      as tracked_quantity
  from public.inventory_lots
  group by product_id,flavor_id,location_id
)
select
  sr.product_id,
  p.name as product_name,
  sr.flavor_id,
  pf.name as flavor_name,
  sr.location_id,
  l.code as location_code,
  l.name as location_name,
  sr.physical_quantity,
  coalesce(t.tracked_quantity,0)::integer
    as tracked_quantity,
  greatest(
    sr.physical_quantity
    -coalesce(t.tracked_quantity,0),
    0
  )::integer as untracked_quantity,
  (
    coalesce(t.tracked_quantity,0)
    -sr.physical_quantity
  )::integer as tracking_difference,
  case
    when coalesce(t.tracked_quantity,0)
      >sr.physical_quantity
      then 'mismatch'
    when sr.physical_quantity=0
      then 'empty'
    when coalesce(t.tracked_quantity,0)
      =sr.physical_quantity
      then 'fully_tracked'
    else 'legacy_untracked'
  end as tracking_status
from stock_rows sr
join public.products p
  on p.id=sr.product_id
left join public.product_flavors pf
  on pf.id=sr.flavor_id
join public.locations l
  on l.id=sr.location_id
left join tracked t
  on t.product_id=sr.product_id
 and t.location_id=sr.location_id
 and t.flavor_id is not distinct from sr.flavor_id;

grant select
on public.inventory_lot_coverage_overview
to authenticated,service_role;

create or replace view public.inventory_lot_traceability
with (security_invoker=true)
as
select
  ilm.id as lot_movement_id,
  ilm.lot_id,
  ilm.lot_number_snapshot as lot_number,
  ilm.expires_on_snapshot as expires_on,
  ilm.product_id,
  p.name as product_name,
  ilm.flavor_id,
  pf.name as flavor_name,
  ilm.location_id,
  l.code as location_code,
  ilm.quantity_delta,
  ilm.allocation_kind,
  ilm.movement_type,
  ilm.sale_id,
  s.quoted_at as sale_at,
  s.customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  ilm.transfer_group_id,
  ilm.created_at
from public.inventory_lot_movements ilm
join public.products p
  on p.id=ilm.product_id
left join public.product_flavors pf
  on pf.id=ilm.flavor_id
join public.locations l
  on l.id=ilm.location_id
left join public.sales s
  on s.id=ilm.sale_id
left join public.customers c
  on c.id=s.customer_id;

grant select
on public.inventory_lot_traceability
to authenticated,service_role;

commit;
