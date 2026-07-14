-- Etapa 3: pedidos de fornecedor unitários/em lote, recebimento parcial e vendas casadas.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists suppliers_name_unique_ci
  on public.suppliers (lower(btrim(name)));

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

insert into public.suppliers(name, active, notes)
select distinct on (lower(btrim(p.name)))
  btrim(p.name), coalesce(p.active, true), nullif(btrim(p.notes), '')
from public.partners p
where lower(coalesce(p.partner_type, '')) = 'supplier'
   or p.source_sheet = 'LISTA_FORNECEDORES'
order by lower(btrim(p.name)), p.created_at
on conflict do nothing;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  ordered_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  destination_location_id uuid not null references public.locations(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','partial','received','cancelled')),
  notes text,
  legacy_supplier_order_id uuid unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_order_id, product_id)
);

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_item_id uuid not null references public.purchase_order_items(id) on delete restrict,
  quantity_received integer not null check (quantity_received > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  received_on date not null,
  inventory_movement_id uuid not null references public.inventory_movements(id) on delete restrict,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists purchase_orders_status_ordered_idx on public.purchase_orders(status, ordered_on desc);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders(supplier_id);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items(purchase_order_id);
create index if not exists purchase_order_items_product_idx on public.purchase_order_items(product_id);
create index if not exists purchase_receipts_item_idx on public.purchase_receipts(purchase_order_item_id, received_on desc);

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists purchase_order_items_set_updated_at on public.purchase_order_items;
create trigger purchase_order_items_set_updated_at before update on public.purchase_order_items
for each row execute function public.set_updated_at();

-- Normaliza os 74 pedidos importados. Cada linha antiga vira um pedido unitário.
insert into public.purchase_orders(
  supplier_id, ordered_on, destination_location_id, status, notes,
  legacy_supplier_order_id, created_at, updated_at
)
select
  s.id,
  coalesce((so.ordered_at at time zone 'UTC')::date, so.created_at::date),
  l.id,
  case when coalesce(so.stock_updated, false) then 'received' else 'pending' end,
  so.notes,
  so.id,
  so.created_at,
  so.created_at
from public.supplier_orders so
left join public.partners p on p.id = so.supplier_id
left join public.suppliers s on lower(btrim(s.name)) = lower(btrim(p.name))
cross join lateral (select id from public.locations where code = 'CS' limit 1) l
where s.id is not null
on conflict (legacy_supplier_order_id) do nothing;

insert into public.purchase_order_items(
  purchase_order_id, product_id, quantity_ordered, quantity_received,
  unit_cost, notes, created_at, updated_at
)
select
  po.id,
  so.product_id,
  greatest(round(so.quantity)::integer, 1),
  case when coalesce(so.stock_updated, false) then greatest(round(so.quantity)::integer, 1) else 0 end,
  coalesce(so.unit_cost, 0),
  so.notes,
  so.created_at,
  so.created_at
from public.purchase_orders po
join public.supplier_orders so on so.id = po.legacy_supplier_order_id
where not exists (
  select 1 from public.purchase_order_items poi where poi.purchase_order_id = po.id
);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_receipts enable row level security;

drop policy if exists suppliers_read on public.suppliers;
create policy suppliers_read on public.suppliers for select to authenticated using (true);
drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers for all to authenticated using (public.can_write()) with check (public.can_write());

drop policy if exists purchase_orders_read on public.purchase_orders;
create policy purchase_orders_read on public.purchase_orders for select to authenticated using (true);
drop policy if exists purchase_orders_write on public.purchase_orders;
create policy purchase_orders_write on public.purchase_orders for all to authenticated using (public.can_write()) with check (public.can_write());

drop policy if exists purchase_order_items_read on public.purchase_order_items;
create policy purchase_order_items_read on public.purchase_order_items for select to authenticated using (true);
drop policy if exists purchase_order_items_write on public.purchase_order_items;
create policy purchase_order_items_write on public.purchase_order_items for all to authenticated using (public.can_write()) with check (public.can_write());

drop policy if exists purchase_receipts_read on public.purchase_receipts;
create policy purchase_receipts_read on public.purchase_receipts for select to authenticated using (true);
drop policy if exists purchase_receipts_write on public.purchase_receipts;
create policy purchase_receipts_write on public.purchase_receipts for all to authenticated using (public.can_write()) with check (public.can_write());

grant select on public.suppliers, public.purchase_orders, public.purchase_order_items, public.purchase_receipts to authenticated;

create or replace view public.supplier_order_summary as
select
  po.id,
  po.supplier_id,
  s.name as supplier_name,
  po.ordered_on,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  po.status,
  po.notes,
  po.legacy_supplier_order_id,
  count(poi.id)::integer as item_count,
  coalesce(sum(poi.quantity_ordered), 0)::integer as ordered_units,
  coalesce(sum(poi.quantity_received), 0)::integer as received_units,
  coalesce(sum(poi.quantity_ordered - poi.quantity_received), 0)::integer as pending_units,
  coalesce(sum(poi.quantity_ordered * poi.unit_cost), 0)::numeric(12,2) as order_total,
  string_agg(p.name || ' ×' || poi.quantity_ordered::text, ', ' order by p.name) as product_summary,
  coalesce(sum((
    select count(*)
    from public.stock_reservations sr
    where sr.product_id = poi.product_id
      and sr.location_id = po.destination_location_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved < sr.quantity_requested
  )), 0)::integer as waiting_sales_count,
  po.created_at,
  po.updated_at
from public.purchase_orders po
join public.suppliers s on s.id = po.supplier_id
join public.locations l on l.id = po.destination_location_id
left join public.purchase_order_items poi on poi.purchase_order_id = po.id
left join public.products p on p.id = poi.product_id
group by po.id, s.name, l.code, l.name;

create or replace view public.supplier_order_items_overview as
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
  (poi.quantity_ordered - poi.quantity_received)::integer as quantity_pending,
  poi.unit_cost,
  (poi.quantity_ordered * poi.unit_cost)::numeric(12,2) as total_cost,
  case
    when poi.quantity_received = 0 then 'pending'
    when poi.quantity_received < poi.quantity_ordered then 'partial'
    else 'received'
  end as item_status,
  poi.notes,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  coalesce((
    select sum(sr.quantity_requested - sr.quantity_reserved)::integer
    from public.stock_reservations sr
    where sr.product_id = poi.product_id
      and sr.location_id = po.destination_location_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved < sr.quantity_requested
  ), 0) as waiting_sales_units,
  coalesce((
    select count(*)::integer
    from public.stock_reservations sr
    where sr.product_id = poi.product_id
      and sr.location_id = po.destination_location_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved < sr.quantity_requested
  ), 0) as waiting_sales_count,
  poi.created_at,
  poi.updated_at
from public.purchase_order_items poi
join public.purchase_orders po on po.id = poi.purchase_order_id
join public.products p on p.id = poi.product_id
join public.locations l on l.id = po.destination_location_id;

create or replace view public.supplier_waiting_sales as
select
  poi.id as purchase_order_item_id,
  sr.sale_id,
  s.customer_id,
  c.name as customer_name,
  (s.quoted_at at time zone 'UTC')::date as sale_date,
  sr.quantity_requested,
  sr.quantity_reserved,
  (sr.quantity_requested - sr.quantity_reserved)::integer as quantity_missing,
  sr.status as reservation_status,
  sr.created_at
from public.purchase_order_items poi
join public.purchase_orders po on po.id = poi.purchase_order_id
join public.stock_reservations sr
  on sr.product_id = poi.product_id
 and sr.location_id = po.destination_location_id
 and sr.status in ('awaiting_stock','partial')
 and sr.quantity_reserved < sr.quantity_requested
join public.sales s on s.id = sr.sale_id
left join public.customers c on c.id = s.customer_id;

create or replace view public.product_incoming_stock as
with incoming as (
  select
    poi.product_id,
    coalesce(sum(poi.quantity_ordered - poi.quantity_received), 0)::integer as incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id = poi.purchase_order_id
  where po.status in ('pending','partial')
  group by poi.product_id
), waiting as (
  select
    sr.product_id,
    coalesce(sum(sr.quantity_requested - sr.quantity_reserved), 0)::integer as awaiting_sales_quantity
  from public.stock_reservations sr
  where sr.status in ('awaiting_stock','partial')
    and sr.quantity_reserved < sr.quantity_requested
  group by sr.product_id
)
select
  p.id as product_id,
  coalesce(i.incoming_quantity, 0)::integer as incoming_quantity,
  coalesce(w.awaiting_sales_quantity, 0)::integer as awaiting_sales_quantity
from public.products p
left join incoming i on i.product_id = p.id
left join waiting w on w.product_id = p.id;

create or replace view public.product_details as
select
  p.id,
  p.name,
  p.category,
  p.brand,
  p.description,
  p.objective,
  p.ideal_profile,
  p.duration_days,
  p.information,
  p.quick_message,
  p.keywords,
  p.level,
  p.sales_category,
  p.image_url,
  p.secondary_image_url,
  p.active,
  p.sale_price,
  coalesce(p.installment_price, p.sale_price) as installment_price,
  coalesce(i.incoming_quantity, 0)::integer as incoming_quantity,
  coalesce(i.awaiting_sales_quantity, 0)::integer as awaiting_sales_quantity
from public.products p
left join public.product_incoming_stock i on i.product_id = p.id;

grant select on public.supplier_order_summary, public.supplier_order_items_overview,
  public.supplier_waiting_sales, public.product_incoming_stock, public.product_details to authenticated;
revoke all on public.supplier_order_summary, public.supplier_order_items_overview,
  public.supplier_waiting_sales, public.product_incoming_stock from anon;

create or replace function public.create_supplier(
  p_name text,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cadastrar fornecedores';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'Informe o nome do fornecedor';
  end if;
  select id into v_id from public.suppliers where lower(btrim(name)) = lower(v_name);
  if v_id is not null then return v_id; end if;
  insert into public.suppliers(name, notes) values(v_name, nullif(btrim(p_notes), '')) returning id into v_id;
  insert into public.audit_events(entity_type, entity_id, action, details)
  values('supplier', v_id, 'created', jsonb_build_object('name', v_name));
  return v_id;
end;
$$;

create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_ordered_on date,
  p_destination_location_id uuid,
  p_items jsonb,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item record;
  v_supplier public.suppliers%rowtype;
  v_location public.locations%rowtype;
  v_product public.products%rowtype;
  v_ordered_on date := coalesce(p_ordered_on, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para criar pedidos'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto ao pedido';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'O pedido pode ter no máximo 50 itens'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_cost numeric)
    group by product_id having count(*) > 1
  ) then raise exception 'O mesmo produto foi adicionado mais de uma vez'; end if;

  select * into v_supplier from public.suppliers where id = p_supplier_id and active;
  if not found then raise exception 'Fornecedor inválido ou inativo'; end if;
  select * into v_location from public.locations where id = p_destination_location_id and active and tracks_inventory;
  if not found then raise exception 'Estoque de destino inválido'; end if;

  insert into public.purchase_orders(supplier_id, ordered_on, destination_location_id, notes)
  values(v_supplier.id, v_ordered_on, v_location.id, nullif(btrim(p_notes), ''))
  returning id into v_order_id;

  for v_item in
    select product_id, quantity, unit_cost, notes
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_cost numeric, notes text)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then raise exception 'Quantidade inválida'; end if;
    if v_item.unit_cost is null or v_item.unit_cost < 0 then raise exception 'Custo inválido'; end if;
    select * into v_product from public.products where id = v_item.product_id and active;
    if not found then raise exception 'Produto inválido ou inativo'; end if;
    insert into public.purchase_order_items(purchase_order_id, product_id, quantity_ordered, unit_cost, notes)
    values(v_order_id, v_product.id, v_item.quantity, v_item.unit_cost, nullif(btrim(v_item.notes), ''));
  end loop;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('purchase_order', v_order_id, 'created', jsonb_build_object(
    'supplier_id', v_supplier.id,
    'ordered_on', v_ordered_on,
    'destination_location_id', v_location.id,
    'item_count', jsonb_array_length(p_items)
  ));
  return v_order_id;
end;
$$;

create or replace function public.receive_purchase_order_item(
  p_item_id uuid,
  p_quantity integer,
  p_received_on date,
  p_unit_cost numeric,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.purchase_order_items%rowtype;
  v_order public.purchase_orders%rowtype;
  v_product public.products%rowtype;
  v_remaining integer;
  v_received_at timestamptz;
  v_movement_id uuid;
  v_receipt_id uuid := gen_random_uuid();
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_res record;
  v_missing integer;
  v_allocate integer;
  v_allocated_total integer := 0;
  v_new_status text;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para receber pedidos'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  if p_received_on is null then raise exception 'Informe a data do recebimento'; end if;
  if p_unit_cost is null or p_unit_cost < 0 then raise exception 'Informe um custo válido'; end if;

  select * into v_item from public.purchase_order_items where id = p_item_id for update;
  if not found then raise exception 'Item do pedido não encontrado'; end if;
  select * into v_order from public.purchase_orders where id = v_item.purchase_order_id for update;
  if v_order.status = 'cancelled' then raise exception 'Pedido cancelado não pode ser recebido'; end if;
  v_remaining := v_item.quantity_ordered - v_item.quantity_received;
  if v_remaining <= 0 then raise exception 'Este item já foi totalmente recebido'; end if;
  if p_quantity > v_remaining then raise exception 'Quantidade maior que o saldo pendente (%)', v_remaining; end if;
  select * into v_product from public.products where id = v_item.product_id for update;
  v_received_at := (p_received_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(
    product_id, location_id, movement_type, quantity_delta, notes, idempotency_key, created_at
  ) values(
    v_item.product_id, v_order.destination_location_id, 'purchase', p_quantity,
    'Recebimento do pedido de fornecedor ' || v_order.id::text,
    'app:purchase-receipt:' || v_receipt_id::text,
    v_received_at
  ) returning id into v_movement_id;

  insert into public.purchase_receipts(
    id, purchase_order_item_id, quantity_received, unit_cost, received_on,
    inventory_movement_id, notes, created_at
  ) values(
    v_receipt_id, v_item.id, p_quantity, p_unit_cost, p_received_on,
    v_movement_id, nullif(btrim(p_notes), ''), v_received_at
  );

  update public.purchase_order_items
  set quantity_received = quantity_received + p_quantity,
      unit_cost = p_unit_cost,
      updated_at = now()
  where id = v_item.id;

  update public.products
  set cost_price = p_unit_cost, updated_at = now()
  where id = v_item.product_id;

  select quantity into v_physical
  from public.stock_balances
  where product_id = v_item.product_id and location_id = v_order.destination_location_id
  for update;

  select coalesce(sum(quantity_reserved), 0)::integer into v_reserved
  from public.stock_reservations
  where product_id = v_item.product_id
    and location_id = v_order.destination_location_id
    and status in ('reserved','partial');
  v_available := greatest(coalesce(v_physical, 0) - v_reserved, 0);

  for v_res in
    select sr.*
    from public.stock_reservations sr
    join public.sales s on s.id = sr.sale_id
    where sr.product_id = v_item.product_id
      and sr.location_id = v_order.destination_location_id
      and sr.status in ('awaiting_stock','partial')
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
        reserved_at = coalesce(reserved_at, v_received_at),
        notes = case when quantity_reserved + v_allocate >= quantity_requested then 'Reserva completada pelo recebimento do fornecedor' else 'Reserva parcial após recebimento do fornecedor' end,
        updated_at = now()
    where id = v_res.id;
    v_available := v_available - v_allocate;
    v_allocated_total := v_allocated_total + v_allocate;
  end loop;

  select case
    when bool_and(quantity_received >= quantity_ordered) then 'received'
    when bool_or(quantity_received > 0) then 'partial'
    else 'pending'
  end into v_new_status
  from public.purchase_order_items
  where purchase_order_id = v_order.id;

  update public.purchase_orders set status = v_new_status, updated_at = now() where id = v_order.id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('purchase_order_item', v_item.id, 'received', jsonb_build_object(
    'purchase_order_id', v_order.id,
    'quantity', p_quantity,
    'received_on', p_received_on,
    'unit_cost', p_unit_cost,
    'inventory_movement_id', v_movement_id,
    'reservations_allocated', v_allocated_total,
    'order_status', v_new_status
  ));

  return jsonb_build_object(
    'purchase_order_id', v_order.id,
    'item_id', v_item.id,
    'quantity_received', p_quantity,
    'quantity_remaining', v_remaining - p_quantity,
    'reservations_allocated', v_allocated_total,
    'order_status', v_new_status
  );
end;
$$;

revoke all on function public.create_supplier(text,text) from public, anon;
revoke all on function public.create_purchase_order(uuid,date,uuid,jsonb,text) from public, anon;
revoke all on function public.receive_purchase_order_item(uuid,integer,date,numeric,text) from public, anon;
grant execute on function public.create_supplier(text,text) to authenticated;
grant execute on function public.create_purchase_order(uuid,date,uuid,jsonb,text) to authenticated;
grant execute on function public.receive_purchase_order_item(uuid,integer,date,numeric,text) to authenticated;
