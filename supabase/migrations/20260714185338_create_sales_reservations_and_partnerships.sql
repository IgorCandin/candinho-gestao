-- Cria o fluxo de novas vendas com reserva de estoque, pagamento combinado
-- e vínculo opcional com parceiros. Vendas ainda não entregues reservam o
-- saldo disponível; a baixa física acontece somente na entrega.

alter table public.sales
  add column if not exists payment_due_at date,
  add column if not exists price_condition text,
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

alter table public.sale_items
  add column if not exists price_condition text;

create index if not exists sales_partner_id_idx on public.sales(partner_id);

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity_requested integer not null check (quantity_requested > 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0 and quantity_reserved <= quantity_requested),
  status text not null check (status in ('reserved','partial','awaiting_stock','fulfilled','released')),
  reserved_at timestamptz,
  fulfilled_at timestamptz,
  released_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_item_id)
);

create index if not exists stock_reservations_sale_id_idx on public.stock_reservations(sale_id);
create index if not exists stock_reservations_product_location_idx on public.stock_reservations(product_id, location_id);
create index if not exists stock_reservations_active_idx on public.stock_reservations(product_id, location_id, status)
  where status in ('reserved','partial');

alter table public.stock_reservations enable row level security;
drop policy if exists stock_reservations_read on public.stock_reservations;
create policy stock_reservations_read on public.stock_reservations for select to authenticated using (true);
revoke all on public.stock_reservations from public, anon;
grant select on public.stock_reservations to authenticated;
grant all on public.stock_reservations to service_role;

create table if not exists public.sale_payment_entries (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  received_at timestamptz not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists sale_payment_entries_sale_id_idx on public.sale_payment_entries(sale_id);
alter table public.sale_payment_entries enable row level security;
drop policy if exists sale_payment_entries_read on public.sale_payment_entries;
create policy sale_payment_entries_read on public.sale_payment_entries for select to authenticated using (true);
revoke all on public.sale_payment_entries from public, anon;
grant select on public.sale_payment_entries to authenticated;
grant all on public.sale_payment_entries to service_role;

create or replace view public.sale_stock_availability
with (security_invoker = true)
as
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.brand,
  p.image_url,
  p.cost_price,
  p.sale_price,
  l.id as location_id,
  l.code as location_code,
  l.name as location_name,
  coalesce(sb.quantity, 0)::integer as physical_quantity,
  coalesce(r.reserved_quantity, 0)::integer as reserved_quantity,
  greatest(coalesce(sb.quantity, 0) - coalesce(r.reserved_quantity, 0), 0)::integer as available_quantity
from public.products p
cross join public.locations l
left join public.stock_balances sb on sb.product_id = p.id and sb.location_id = l.id
left join lateral (
  select coalesce(sum(sr.quantity_reserved), 0)::integer as reserved_quantity
  from public.stock_reservations sr
  where sr.product_id = p.id
    and sr.location_id = l.id
    and sr.status in ('reserved','partial')
) r on true
where p.active
  and l.active
  and l.tracks_inventory;

revoke all on public.sale_stock_availability from public, anon;
grant select on public.sale_stock_availability to authenticated, service_role;

create or replace view public.sale_partner_options
with (security_invoker = true)
as
select id, name, partner_type, city, partnership_model, settlement_rule, commission_pct
from public.partners
where lower(partner_type) <> 'supplier'
  and coalesce(active, true)
  and coalesce(status, 'Ativo') <> 'Pausado'
order by name;

revoke all on public.sale_partner_options from public, anon;
grant select on public.sale_partner_options to authenticated, service_role;

create or replace function public.create_sale(
  p_customer_id uuid,
  p_location_id uuid,
  p_quoted_on date,
  p_items jsonb,
  p_payment_mode text default 'receivable',
  p_paid_on date default null,
  p_payment_method text default null,
  p_payment_due_on date default null,
  p_delivered boolean default false,
  p_delivered_on date default null,
  p_notes text default null,
  p_partner_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item_id uuid;
  v_customer public.customers%rowtype;
  v_location public.locations%rowtype;
  v_product public.products%rowtype;
  v_partner public.partners%rowtype;
  v_item record;
  v_quoted_on date := coalesce(p_quoted_on, (now() at time zone 'America/Sao_Paulo')::date);
  v_quoted_at timestamptz;
  v_paid_at timestamptz;
  v_delivered_at timestamptz;
  v_payment_status public.payment_status := 'receivable';
  v_delivery_status public.delivery_status := 'to_deliver';
  v_general_status public.sale_general_status := 'active';
  v_payment_condition text := 'A receber';
  v_item_condition text;
  v_sale_condition text;
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_reserve integer;
  v_reservation_status text;
  v_total numeric(12,2);
  v_allowed_methods constant text[] := array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'];
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar vendas';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto à venda';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'A venda pode ter no máximo 20 itens';
  end if;

  select * into v_customer from public.customers where id = p_customer_id and active;
  if not found then raise exception 'Cliente não encontrado ou inativo'; end if;

  select * into v_location from public.locations where id = p_location_id and active and tracks_inventory;
  if not found then raise exception 'Estoque de origem inválido'; end if;

  if p_partner_id is not null then
    select * into v_partner
    from public.partners
    where id = p_partner_id
      and lower(partner_type) <> 'supplier'
      and coalesce(active, true);
    if not found then raise exception 'Parceiro inválido ou inativo'; end if;
  end if;

  if p_payment_mode not in ('receivable','paid','combined') then
    raise exception 'Situação do pagamento inválida';
  end if;

  if p_payment_mode = 'paid' then
    if p_paid_on is null then raise exception 'Informe a data do pagamento'; end if;
    if p_payment_method is null or not (p_payment_method = any(v_allowed_methods)) then
      raise exception 'Forma de pagamento inválida';
    end if;
    v_payment_status := 'received';
    v_payment_condition := 'Pago';
    v_paid_at := (p_paid_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';
  elsif p_payment_mode = 'combined' then
    if p_payment_due_on is null then raise exception 'Informe a data combinada para pagamento'; end if;
    v_payment_condition := 'Pagamento combinado';
  end if;

  if p_delivered then
    if p_delivered_on is null then raise exception 'Informe a data da entrega'; end if;
    v_delivery_status := 'delivered';
    v_delivered_at := (p_delivered_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';
  end if;

  if v_payment_status = 'received' and v_delivery_status = 'delivered' then
    v_general_status := 'finalized';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_price numeric)
    group by product_id
    having count(*) > 1
  ) then
    raise exception 'O mesmo produto foi adicionado mais de uma vez';
  end if;

  v_quoted_at := (v_quoted_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  insert into public.sales(
    record_type, customer_id, location_id, reference, city, phone,
    general_status, payment_status, delivery_status, payment_method,
    payment_condition, payment_due_at, partnership, partner_id,
    quoted_at, paid_at, delivered_at, notes, stock_deducted,
    total_cost, total_amount, total_profit, idempotency_key
  ) values (
    'sale', v_customer.id, v_location.id, v_customer.reference, v_customer.city, v_customer.phone,
    v_general_status, v_payment_status, v_delivery_status,
    case when p_payment_mode = 'paid' then p_payment_method else null end,
    v_payment_condition,
    case when p_payment_mode = 'combined' then p_payment_due_on else null end,
    case when p_partner_id is not null then v_partner.name else null end,
    p_partner_id, v_quoted_at, v_paid_at, v_delivered_at,
    nullif(btrim(p_notes), ''), p_delivered, 0, 0, 0,
    'app:create-sale:' || gen_random_uuid()::text
  ) returning id into v_sale_id;

  for v_item in
    select product_id, quantity, unit_price
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_price numeric)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'A quantidade de cada produto deve ser maior que zero';
    end if;
    if v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'Preço de venda inválido';
    end if;

    select * into v_product from public.products where id = v_item.product_id and active;
    if not found then raise exception 'Produto não encontrado ou inativo'; end if;

    v_item_condition := case
      when v_item.unit_price = v_product.cost_price then 'Custo'
      when v_item.unit_price = v_product.sale_price then 'Preço normal'
      when v_item.unit_price < v_product.sale_price then 'Desconto'
      else 'Preço combinado'
    end;

    insert into public.sale_items(sale_id, product_id, quantity, unit_cost, unit_price, price_condition)
    values(v_sale_id, v_product.id, v_item.quantity, v_product.cost_price, v_item.unit_price, v_item_condition)
    returning id into v_item_id;

    insert into public.stock_balances(product_id, location_id, quantity)
    values(v_product.id, v_location.id, 0)
    on conflict (product_id, location_id) do nothing;

    select quantity into v_physical
    from public.stock_balances
    where product_id = v_product.id and location_id = v_location.id
    for update;

    select coalesce(sum(quantity_reserved), 0)::integer into v_reserved
    from public.stock_reservations
    where product_id = v_product.id
      and location_id = v_location.id
      and status in ('reserved','partial');

    v_available := greatest(v_physical - v_reserved, 0);

    if p_delivered then
      if v_available < v_item.quantity then
        raise exception 'Estoque disponível insuficiente para entregar %. Disponível em %: %', v_product.name, v_location.code, v_available;
      end if;

      insert into public.inventory_movements(
        product_id, location_id, movement_type, quantity_delta, sale_id, notes, idempotency_key
      ) values (
        v_product.id, v_location.id, 'sale', -v_item.quantity, v_sale_id,
        'Baixa automática na criação de venda entregue',
        'app:create-sale-delivery:' || v_sale_id::text || ':' || v_item_id::text
      );
    else
      v_reserve := least(v_item.quantity, v_available);
      v_reservation_status := case
        when v_reserve = v_item.quantity then 'reserved'
        when v_reserve > 0 then 'partial'
        else 'awaiting_stock'
      end;

      insert into public.stock_reservations(
        sale_id, sale_item_id, product_id, location_id,
        quantity_requested, quantity_reserved, status, reserved_at, notes
      ) values (
        v_sale_id, v_item_id, v_product.id, v_location.id,
        v_item.quantity, v_reserve, v_reservation_status,
        case when v_reserve > 0 then now() else null end,
        case when v_reserve < v_item.quantity then 'Aguardando reposição de estoque' else 'Reservado para a venda' end
      );
    end if;
  end loop;

  select case when count(distinct price_condition) = 1 then min(price_condition) else 'Preço combinado' end
  into v_sale_condition
  from public.sale_items
  where sale_id = v_sale_id;

  update public.sales set price_condition = v_sale_condition where id = v_sale_id;
  select total_amount into v_total from public.sales where id = v_sale_id;

  if p_payment_mode = 'paid' then
    insert into public.sale_payment_entries(sale_id, amount, payment_method, received_at, notes)
    values(v_sale_id, v_total, p_payment_method, v_paid_at, 'Pagamento registrado na criação da venda');
  end if;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('sale', v_sale_id, 'created', jsonb_build_object(
    'customer_id', v_customer.id,
    'location_id', v_location.id,
    'quoted_on', v_quoted_on,
    'payment_mode', p_payment_mode,
    'delivered', p_delivered,
    'partner_id', p_partner_id,
    'price_condition', v_sale_condition
  ));

  return v_sale_id;
end;
$$;

create or replace function public.mark_sale_received(
  p_sale_id uuid,
  p_received_on date,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_paid_at timestamptz;
  v_allowed_methods constant text[] := array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'];
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para alterar pagamentos'; end if;
  if p_received_on is null then raise exception 'Informe a data do recebimento'; end if;
  if p_payment_method is null or not (p_payment_method = any(v_allowed_methods)) then raise exception 'Forma de pagamento inválida'; end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or v_sale.record_type <> 'sale' then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status = 'cancelled' then raise exception 'Venda cancelada não pode ser recebida'; end if;
  if v_sale.payment_status = 'received' then return p_sale_id; end if;

  v_paid_at := (p_received_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  update public.sales
  set payment_status = 'received', paid_at = v_paid_at, payment_method = p_payment_method,
      payment_condition = 'Pago', payment_due_at = null,
      general_status = case when delivery_status = 'delivered' then 'finalized'::public.sale_general_status else 'active'::public.sale_general_status end,
      updated_at = now()
  where id = p_sale_id;

  insert into public.sale_payment_entries(sale_id, amount, payment_method, received_at, notes)
  values(p_sale_id, v_sale.total_amount, p_payment_method, v_paid_at, 'Pagamento integral registrado');

  update public.payments
  set status = 'Recebido', amount = v_sale.total_amount, payment_method = p_payment_method, paid_at = v_paid_at
  where sale_id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values('sale', p_sale_id, 'payment_received', jsonb_build_object('received_on',p_received_on,'payment_method',p_payment_method,'previous_payment_status',v_sale.payment_status));

  return p_sale_id;
end;
$$;

create or replace function public.mark_sale_delivered(
  p_sale_id uuid,
  p_delivered_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_delivered_at timestamptz;
  v_item record;
  v_physical integer;
  v_other_reserved integer;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para alterar entregas'; end if;
  if p_delivered_on is null then raise exception 'Informe a data da entrega'; end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or v_sale.record_type <> 'sale' then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status = 'cancelled' then raise exception 'Venda cancelada não pode ser entregue'; end if;
  if v_sale.delivery_status = 'delivered' then return p_sale_id; end if;

  v_delivered_at := (p_delivered_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  if not v_sale.stock_deducted then
    -- Primeiro valida todos os itens; qualquer falha desfaz a função inteira.
    for v_item in
      select si.id as sale_item_id, si.product_id, si.quantity, p.name as product_name
      from public.sale_items si join public.products p on p.id = si.product_id
      where si.sale_id = p_sale_id
      order by si.id
    loop
      insert into public.stock_balances(product_id, location_id, quantity)
      values(v_item.product_id, v_sale.location_id, 0)
      on conflict (product_id, location_id) do nothing;

      select quantity into v_physical
      from public.stock_balances
      where product_id = v_item.product_id and location_id = v_sale.location_id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer into v_other_reserved
      from public.stock_reservations
      where product_id = v_item.product_id
        and location_id = v_sale.location_id
        and sale_id <> p_sale_id
        and status in ('reserved','partial');

      if v_physical - v_other_reserved < v_item.quantity then
        raise exception 'Estoque insuficiente para entregar %. Disponível para esta venda: %', v_item.product_name, greatest(v_physical-v_other_reserved,0);
      end if;
    end loop;

    for v_item in
      select si.id as sale_item_id, si.product_id, si.quantity
      from public.sale_items si
      where si.sale_id = p_sale_id
      order by si.id
    loop
      insert into public.inventory_movements(product_id,location_id,movement_type,quantity_delta,sale_id,notes,idempotency_key)
      values(v_item.product_id,v_sale.location_id,'sale',-v_item.quantity,p_sale_id,'Baixa automática na entrega da venda','app:deliver-sale:'||p_sale_id::text||':'||v_item.sale_item_id::text);

      update public.stock_reservations
      set status='fulfilled', quantity_reserved=quantity_requested, fulfilled_at=v_delivered_at, updated_at=now(), notes='Reserva consumida na entrega'
      where sale_item_id=v_item.sale_item_id;
    end loop;
  end if;

  update public.sales
  set delivery_status='delivered', delivered_at=v_delivered_at, stock_deducted=true,
      general_status=case when payment_status='received' then 'finalized'::public.sale_general_status else 'active'::public.sale_general_status end,
      updated_at=now()
  where id=p_sale_id;

  update public.deliveries set status='Entregue', delivered_at=v_delivered_at where sale_id=p_sale_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('sale',p_sale_id,'delivered',jsonb_build_object('delivered_on',p_delivered_on,'previous_delivery_status',v_sale.delivery_status,'stock_deducted_now',not v_sale.stock_deducted));

  return p_sale_id;
end;
$$;

revoke all on function public.create_sale(uuid,uuid,date,jsonb,text,date,text,date,boolean,date,text,uuid) from public, anon;
revoke all on function public.mark_sale_received(uuid,date,text) from public, anon;
revoke all on function public.mark_sale_delivered(uuid,date) from public, anon;
grant execute on function public.create_sale(uuid,uuid,date,jsonb,text,date,text,date,boolean,date,text,uuid) to authenticated, service_role;
grant execute on function public.mark_sale_received(uuid,date,text) to authenticated, service_role;
grant execute on function public.mark_sale_delivered(uuid,date) to authenticated, service_role;

create or replace view public.sales_history
with (security_invoker = true)
as
select
  s.id, s.customer_id, c.name as customer_name, s.location_id, l.code as location_code, l.name as location_name,
  coalesce(s.delivered_at,s.quoted_at) as business_at,
  (coalesce(s.delivered_at,s.quoted_at) at time zone 'UTC')::date as business_date,
  s.quoted_at, s.delivered_at, s.general_status, s.payment_status, s.delivery_status,
  s.payment_method, s.payment_condition, s.total_amount, s.total_profit, s.notes,
  items.product_summary, items.total_items,
  s.paid_at, s.payment_due_at, s.price_condition, s.partner_id, pr.name as partner_name,
  items.primary_product_id, items.primary_image_url,
  coalesce(res.reservation_status, case when s.stock_deducted then 'fulfilled' else null end) as reservation_status
from public.sales s
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=s.location_id
left join public.partners pr on pr.id=s.partner_id
left join lateral (
  select string_agg(p.name||' ×'||si.quantity::text,', ' order by p.name) product_summary,
         coalesce(sum(si.quantity),0)::integer total_items,
         (array_agg(p.id order by si.id))[1] primary_product_id,
         (array_agg(p.image_url order by si.id) filter(where p.image_url is not null))[1] primary_image_url
  from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
) items on true
left join lateral (
  select case
    when bool_and(sr.status='fulfilled') then 'fulfilled'
    when bool_or(sr.status='awaiting_stock') then 'awaiting_stock'
    when bool_or(sr.status='partial') then 'partial'
    when bool_and(sr.status='reserved') then 'reserved'
    else null end as reservation_status
  from public.stock_reservations sr where sr.sale_id=s.id
) res on true
where s.record_type='sale';

create or replace view public.pending_orders
with (security_invoker = true)
as
select
  s.id, s.customer_id, c.name as customer_name, s.location_id, l.code as location_code,
  coalesce(s.delivered_at,s.quoted_at) as business_at,
  (coalesce(s.delivered_at,s.quoted_at) at time zone 'UTC')::date as business_date,
  s.quoted_at as order_at, s.delivered_at, s.payment_status, s.delivery_status,
  s.payment_method, s.payment_condition, s.total_amount, s.total_profit,
  items.product_summary, items.total_items, l.name as location_name, s.paid_at, s.general_status,
  items.primary_product_id, items.primary_image_url,
  s.payment_due_at, s.price_condition, s.partner_id, pr.name as partner_name,
  coalesce(res.reservation_status, case when s.stock_deducted then 'fulfilled' else null end) as reservation_status
from public.sales s
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=s.location_id
left join public.partners pr on pr.id=s.partner_id
left join lateral (
  select string_agg(p.name||' ×'||si.quantity::text,', ' order by p.name) product_summary,
         coalesce(sum(si.quantity),0)::integer total_items,
         (array_agg(p.id order by si.id))[1] primary_product_id,
         (array_agg(p.image_url order by si.id) filter(where p.image_url is not null))[1] primary_image_url
  from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
) items on true
left join lateral (
  select case
    when bool_and(sr.status='fulfilled') then 'fulfilled'
    when bool_or(sr.status='awaiting_stock') then 'awaiting_stock'
    when bool_or(sr.status='partial') then 'partial'
    when bool_and(sr.status='reserved') then 'reserved'
    else null end as reservation_status
  from public.stock_reservations sr where sr.sale_id=s.id
) res on true
where s.record_type='sale'
  and s.general_status<>'cancelled'
  and (s.payment_status='receivable' or s.delivery_status='to_deliver');

revoke all on public.sales_history from public, anon;
revoke all on public.pending_orders from public, anon;
grant select on public.sales_history to authenticated, service_role;
grant select on public.pending_orders to authenticated, service_role;
