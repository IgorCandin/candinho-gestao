begin;

create or replace view public.inventory_control_overview
with (security_invoker = true)
as
with physical as (
  select sb.product_id, coalesce(sum(sb.quantity), 0)::integer as physical_quantity
  from public.stock_balances sb
  join public.locations l on l.id = sb.location_id
  where l.active and l.tracks_inventory
  group by sb.product_id
), reserved as (
  select sr.product_id, coalesce(sum(sr.quantity_reserved), 0)::integer as reserved_quantity
  from public.stock_reservations sr
  where sr.status in ('reserved', 'partial')
  group by sr.product_id
), incoming as (
  select poi.product_id,
         coalesce(sum(greatest(poi.quantity_ordered - poi.quantity_received, 0)), 0)::integer as incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id = poi.purchase_order_id
  where po.status in ('pending', 'partial')
    and poi.quantity_received < poi.quantity_ordered
  group by poi.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.brand,
  p.image_url,
  p.min_stock,
  coalesce(nullif(p.ideal_stock, 0), p.min_stock) as ideal_stock,
  p.cost_price,
  p.sale_price,
  coalesce(ph.physical_quantity, 0) as physical_quantity,
  coalesce(r.reserved_quantity, 0) as reserved_quantity,
  greatest(coalesce(ph.physical_quantity, 0) - coalesce(r.reserved_quantity, 0), 0) as available_quantity,
  coalesce(i.incoming_quantity, 0) as incoming_quantity,
  (coalesce(ph.physical_quantity, 0) * p.cost_price)::numeric(12,2) as stock_cost_value,
  (coalesce(ph.physical_quantity, 0) * p.sale_price)::numeric(12,2) as stock_sale_value,
  case
    when coalesce(ph.physical_quantity, 0) = 0 and coalesce(i.incoming_quantity, 0) > 0 then 'incoming_only'
    when coalesce(ph.physical_quantity, 0) = 0 then 'out_of_stock'
    when greatest(coalesce(ph.physical_quantity, 0) - coalesce(r.reserved_quantity, 0), 0) = 0
      and coalesce(r.reserved_quantity, 0) > 0 then 'fully_reserved'
    when p.min_stock > 0
      and greatest(coalesce(ph.physical_quantity, 0) - coalesce(r.reserved_quantity, 0), 0) <= p.min_stock then 'below_minimum'
    when coalesce(i.incoming_quantity, 0) > 0 then 'incoming'
    else 'healthy'
  end as stock_status
from public.products p
left join physical ph on ph.product_id = p.id
left join reserved r on r.product_id = p.id
left join incoming i on i.product_id = p.id
where p.active;

create or replace view public.inventory_control_summary
with (security_invoker = true)
as
select
  count(*)::integer as active_products,
  count(*) filter (where physical_quantity > 0)::integer as products_with_stock,
  coalesce(sum(physical_quantity), 0)::integer as physical_units,
  coalesce(sum(reserved_quantity), 0)::integer as reserved_units,
  coalesce(sum(available_quantity), 0)::integer as available_units,
  coalesce(sum(incoming_quantity), 0)::integer as incoming_units,
  coalesce(sum(stock_cost_value), 0)::numeric(12,2) as stock_cost_value,
  coalesce(sum(stock_sale_value), 0)::numeric(12,2) as stock_sale_value,
  count(*) filter (where stock_status in ('out_of_stock', 'fully_reserved', 'below_minimum'))::integer as attention_products
from public.inventory_control_overview;

create or replace view public.inventory_location_overview
with (security_invoker = true)
as
with reserved as (
  select sr.product_id, sr.location_id, coalesce(sum(sr.quantity_reserved), 0)::integer as reserved_quantity
  from public.stock_reservations sr
  where sr.status in ('reserved', 'partial')
  group by sr.product_id, sr.location_id
), incoming as (
  select poi.product_id, po.destination_location_id as location_id,
         coalesce(sum(greatest(poi.quantity_ordered - poi.quantity_received, 0)), 0)::integer as incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id = poi.purchase_order_id
  where po.status in ('pending', 'partial')
    and poi.quantity_received < poi.quantity_ordered
  group by poi.product_id, po.destination_location_id
)
select
  p.id as product_id,
  p.name as product_name,
  l.id as location_id,
  l.code as location_code,
  l.name as location_name,
  l.city as location_city,
  coalesce(sb.quantity, 0)::integer as physical_quantity,
  coalesce(r.reserved_quantity, 0)::integer as reserved_quantity,
  greatest(coalesce(sb.quantity, 0) - coalesce(r.reserved_quantity, 0), 0)::integer as available_quantity,
  coalesce(i.incoming_quantity, 0)::integer as incoming_quantity,
  (coalesce(sb.quantity, 0) * p.cost_price)::numeric(12,2) as stock_cost_value,
  (coalesce(sb.quantity, 0) * p.sale_price)::numeric(12,2) as stock_sale_value
from public.products p
cross join public.locations l
left join public.stock_balances sb on sb.product_id = p.id and sb.location_id = l.id
left join reserved r on r.product_id = p.id and r.location_id = l.id
left join incoming i on i.product_id = p.id and i.location_id = l.id
where p.active and l.active and l.tracks_inventory;

create or replace view public.inventory_product_reservations
with (security_invoker = true)
as
select
  sr.id,
  sr.product_id,
  sr.location_id,
  l.code as location_code,
  l.name as location_name,
  sr.sale_id,
  s.customer_id,
  coalesce(c.name, 'Cliente não informado') as customer_name,
  (s.quoted_at at time zone 'UTC')::date as sale_date,
  sr.quantity_requested,
  sr.quantity_reserved,
  greatest(sr.quantity_requested - sr.quantity_reserved, 0)::integer as quantity_missing,
  sr.status,
  sr.reserved_at,
  sr.fulfilled_at,
  sr.notes
from public.stock_reservations sr
join public.sales s on s.id = sr.sale_id
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = sr.location_id;

create or replace view public.inventory_movement_history
with (security_invoker = true)
as
select
  im.id,
  im.product_id,
  p.name as product_name,
  im.location_id,
  l.code as location_code,
  l.name as location_name,
  im.movement_type,
  im.quantity_delta,
  im.sale_id,
  s.customer_id,
  c.name as customer_name,
  im.transfer_group_id,
  counterpart.location_code as counterpart_location_code,
  counterpart.location_name as counterpart_location_name,
  im.notes,
  im.created_at as occurred_at,
  im.created_by
from public.inventory_movements im
join public.products p on p.id = im.product_id
join public.locations l on l.id = im.location_id
left join public.sales s on s.id = im.sale_id
left join public.customers c on c.id = s.customer_id
left join lateral (
  select l2.code as location_code, l2.name as location_name
  from public.inventory_movements im2
  join public.locations l2 on l2.id = im2.location_id
  where im.transfer_group_id is not null
    and im2.transfer_group_id = im.transfer_group_id
    and im2.id <> im.id
  order by im2.created_at, im2.id
  limit 1
) counterpart on true;

create or replace function public.allocate_available_stock(
  p_product_id uuid,
  p_location_id uuid,
  p_reason text default 'Reposição manual de estoque'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_res record;
  v_missing integer;
  v_allocate integer;
  v_total integer := 0;
begin
  insert into public.stock_balances(product_id, location_id, quantity)
  values (p_product_id, p_location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity into v_physical
  from public.stock_balances
  where product_id = p_product_id and location_id = p_location_id
  for update;

  select coalesce(sum(quantity_reserved), 0)::integer into v_reserved
  from public.stock_reservations
  where product_id = p_product_id
    and location_id = p_location_id
    and status in ('reserved', 'partial');

  v_available := greatest(coalesce(v_physical, 0) - v_reserved, 0);

  for v_res in
    select sr.*
    from public.stock_reservations sr
    join public.sales s on s.id = sr.sale_id
    where sr.product_id = p_product_id
      and sr.location_id = p_location_id
      and sr.status in ('awaiting_stock', 'partial')
      and sr.quantity_reserved < sr.quantity_requested
    order by s.quoted_at, sr.created_at, sr.id
    for update of sr
  loop
    exit when v_available <= 0;
    v_missing := v_res.quantity_requested - v_res.quantity_reserved;
    v_allocate := least(v_missing, v_available);
    update public.stock_reservations
    set quantity_reserved = quantity_reserved + v_allocate,
        status = case when quantity_reserved + v_allocate >= quantity_requested then 'reserved' else 'partial' end,
        reserved_at = coalesce(reserved_at, now()),
        notes = case
          when quantity_reserved + v_allocate >= quantity_requested then p_reason || ' · reserva completada'
          else p_reason || ' · reserva parcial'
        end,
        updated_at = now()
    where id = v_res.id;
    v_available := v_available - v_allocate;
    v_total := v_total + v_allocate;
  end loop;

  return v_total;
end;
$$;

create or replace function public.register_inventory_adjustment(
  p_product_id uuid,
  p_location_id uuid,
  p_quantity_delta integer,
  p_occurred_on date default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_location public.locations%rowtype;
  v_current integer;
  v_reserved integer;
  v_new integer;
  v_occurred_at timestamptz;
  v_movement_id uuid;
  v_allocated integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para ajustar estoque'; end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then raise exception 'Informe uma quantidade diferente de zero'; end if;

  select * into v_product from public.products where id = p_product_id and active;
  if not found then raise exception 'Produto não encontrado ou inativo'; end if;
  select * into v_location from public.locations where id = p_location_id and active and tracks_inventory;
  if not found then raise exception 'Local de estoque inválido ou inativo'; end if;

  insert into public.stock_balances(product_id, location_id, quantity)
  values (p_product_id, p_location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity into v_current
  from public.stock_balances
  where product_id = p_product_id and location_id = p_location_id
  for update;

  select coalesce(sum(quantity_reserved), 0)::integer into v_reserved
  from public.stock_reservations
  where product_id = p_product_id
    and location_id = p_location_id
    and status in ('reserved', 'partial');

  v_new := v_current + p_quantity_delta;
  if v_new < 0 then raise exception 'O saldo físico não pode ficar negativo'; end if;
  if v_new < v_reserved then raise exception 'O saldo não pode ficar abaixo das % unidade(s) já reservadas', v_reserved; end if;

  v_occurred_at := ((coalesce(p_occurred_on, (now() at time zone 'America/Sao_Paulo')::date))::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, notes, idempotency_key, created_at)
  values(p_product_id, p_location_id, 'adjustment', p_quantity_delta, nullif(btrim(p_notes), ''), 'app:inventory-adjustment:' || gen_random_uuid()::text, v_occurred_at)
  returning id into v_movement_id;

  if p_quantity_delta > 0 then
    v_allocated := public.allocate_available_stock(p_product_id, p_location_id, 'Entrada manual de estoque');
  end if;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('inventory_movement', v_movement_id, 'manual_adjustment', jsonb_build_object(
    'product_id', p_product_id,
    'location_id', p_location_id,
    'previous_quantity', v_current,
    'quantity_delta', p_quantity_delta,
    'new_quantity', v_new,
    'reservations_allocated', v_allocated,
    'occurred_on', coalesce(p_occurred_on, (now() at time zone 'America/Sao_Paulo')::date)
  ));

  return jsonb_build_object('movement_id', v_movement_id, 'previous_quantity', v_current, 'new_quantity', v_new, 'reservations_allocated', v_allocated);
end;
$$;

create or replace function public.register_inventory_count(
  p_product_id uuid,
  p_location_id uuid,
  p_counted_quantity integer,
  p_counted_on date default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_location public.locations%rowtype;
  v_current integer;
  v_reserved integer;
  v_delta integer;
  v_occurred_at timestamptz;
  v_movement_id uuid;
  v_allocated integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para contar estoque'; end if;
  if p_counted_quantity is null or p_counted_quantity < 0 then raise exception 'Informe uma contagem válida'; end if;

  select * into v_product from public.products where id = p_product_id and active;
  if not found then raise exception 'Produto não encontrado ou inativo'; end if;
  select * into v_location from public.locations where id = p_location_id and active and tracks_inventory;
  if not found then raise exception 'Local de estoque inválido ou inativo'; end if;

  insert into public.stock_balances(product_id, location_id, quantity)
  values (p_product_id, p_location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity into v_current
  from public.stock_balances
  where product_id = p_product_id and location_id = p_location_id
  for update;

  select coalesce(sum(quantity_reserved), 0)::integer into v_reserved
  from public.stock_reservations
  where product_id = p_product_id
    and location_id = p_location_id
    and status in ('reserved', 'partial');

  if p_counted_quantity < v_reserved then
    raise exception 'A contagem não pode ficar abaixo das % unidade(s) já reservadas', v_reserved;
  end if;

  v_delta := p_counted_quantity - v_current;
  v_occurred_at := ((coalesce(p_counted_on, (now() at time zone 'America/Sao_Paulo')::date))::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  if v_delta <> 0 then
    insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, notes, idempotency_key, created_at)
    values(p_product_id, p_location_id, 'adjustment', v_delta, coalesce(nullif(btrim(p_notes), ''), 'Contagem física de estoque'), 'app:inventory-count:' || gen_random_uuid()::text, v_occurred_at)
    returning id into v_movement_id;
    if v_delta > 0 then
      v_allocated := public.allocate_available_stock(p_product_id, p_location_id, 'Contagem física de estoque');
    end if;
  end if;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('product', p_product_id, 'inventory_counted', jsonb_build_object(
    'location_id', p_location_id,
    'previous_quantity', v_current,
    'counted_quantity', p_counted_quantity,
    'quantity_delta', v_delta,
    'movement_id', v_movement_id,
    'reservations_allocated', v_allocated,
    'counted_on', coalesce(p_counted_on, (now() at time zone 'America/Sao_Paulo')::date)
  ));

  return jsonb_build_object('movement_id', v_movement_id, 'previous_quantity', v_current, 'counted_quantity', p_counted_quantity, 'quantity_delta', v_delta, 'reservations_allocated', v_allocated);
end;
$$;

create or replace function public.transfer_inventory(
  p_product_id uuid,
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_quantity integer,
  p_transferred_on date default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_source public.locations%rowtype;
  v_destination public.locations%rowtype;
  v_source_physical integer;
  v_source_reserved integer;
  v_source_available integer;
  v_group_id uuid := gen_random_uuid();
  v_occurred_at timestamptz;
  v_allocated integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para transferir estoque'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  if p_source_location_id = p_destination_location_id then raise exception 'Origem e destino precisam ser diferentes'; end if;

  select * into v_product from public.products where id = p_product_id and active;
  if not found then raise exception 'Produto não encontrado ou inativo'; end if;
  select * into v_source from public.locations where id = p_source_location_id and active and tracks_inventory;
  if not found then raise exception 'Estoque de origem inválido ou inativo'; end if;
  select * into v_destination from public.locations where id = p_destination_location_id and active and tracks_inventory;
  if not found then raise exception 'Estoque de destino inválido ou inativo'; end if;

  insert into public.stock_balances(product_id, location_id, quantity)
  values (p_product_id, p_source_location_id, 0), (p_product_id, p_destination_location_id, 0)
  on conflict (product_id, location_id) do nothing;

  perform 1
  from public.stock_balances
  where product_id = p_product_id and location_id in (p_source_location_id, p_destination_location_id)
  order by location_id
  for update;

  select quantity into v_source_physical
  from public.stock_balances
  where product_id = p_product_id and location_id = p_source_location_id;

  select coalesce(sum(quantity_reserved), 0)::integer into v_source_reserved
  from public.stock_reservations
  where product_id = p_product_id
    and location_id = p_source_location_id
    and status in ('reserved', 'partial');

  v_source_available := greatest(v_source_physical - v_source_reserved, 0);
  if v_source_available < p_quantity then
    raise exception 'Estoque disponível insuficiente em %. Disponível: %', v_source.code, v_source_available;
  end if;

  v_occurred_at := ((coalesce(p_transferred_on, (now() at time zone 'America/Sao_Paulo')::date))::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, transfer_group_id, notes, idempotency_key, created_at)
  values(p_product_id, p_source_location_id, 'transfer_out', -p_quantity, v_group_id, coalesce(nullif(btrim(p_notes), ''), 'Transferência para ' || v_destination.code), 'app:inventory-transfer-out:' || v_group_id::text, v_occurred_at);

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, transfer_group_id, notes, idempotency_key, created_at)
  values(p_product_id, p_destination_location_id, 'transfer_in', p_quantity, v_group_id, coalesce(nullif(btrim(p_notes), ''), 'Transferência de ' || v_source.code), 'app:inventory-transfer-in:' || v_group_id::text, v_occurred_at);

  v_allocated := public.allocate_available_stock(p_product_id, p_destination_location_id, 'Transferência recebida');

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('product', p_product_id, 'inventory_transferred', jsonb_build_object(
    'transfer_group_id', v_group_id,
    'source_location_id', p_source_location_id,
    'destination_location_id', p_destination_location_id,
    'quantity', p_quantity,
    'reservations_allocated', v_allocated,
    'transferred_on', coalesce(p_transferred_on, (now() at time zone 'America/Sao_Paulo')::date)
  ));

  return jsonb_build_object('transfer_group_id', v_group_id, 'quantity', p_quantity, 'reservations_allocated', v_allocated);
end;
$$;

revoke all on function public.allocate_available_stock(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.register_inventory_adjustment(uuid, uuid, integer, date, text) from public, anon;
revoke all on function public.register_inventory_count(uuid, uuid, integer, date, text) from public, anon;
revoke all on function public.transfer_inventory(uuid, uuid, uuid, integer, date, text) from public, anon;
grant execute on function public.register_inventory_adjustment(uuid, uuid, integer, date, text) to authenticated;
grant execute on function public.register_inventory_count(uuid, uuid, integer, date, text) to authenticated;
grant execute on function public.transfer_inventory(uuid, uuid, uuid, integer, date, text) to authenticated;

grant select on public.inventory_control_overview to authenticated;
grant select on public.inventory_control_summary to authenticated;
grant select on public.inventory_location_overview to authenticated;
grant select on public.inventory_product_reservations to authenticated;
grant select on public.inventory_movement_history to authenticated;

commit;
