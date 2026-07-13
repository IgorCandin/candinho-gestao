-- Candinho Gestão — esquema inicial
-- Execute no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'operator', 'partner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_record_type as enum ('sale', 'lead');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_general_status as enum ('pending', 'active', 'finalized', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('not_applicable', 'receivable', 'received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('not_applicable', 'to_deliver', 'delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'opening', 'purchase', 'sale', 'cancellation', 'adjustment', 'transfer_out', 'transfer_in'
  );
exception when duplicate_object then null; end $$;

-- Utilitários ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Usuários e permissões ------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'partner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'partner'::public.app_role);
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and public.current_user_role() in ('admin', 'operator');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Locais ---------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text,
  location_type text not null default 'internal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_code_not_blank check (btrim(code) <> ''),
  constraint locations_name_not_blank check (btrim(name) <> '')
);

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();

-- Produtos -------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sku text unique,
  category text not null default 'Sem categoria',
  brand text,
  description text,
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  min_stock integer not null default 0,
  image_url text,
  active boolean not null default true,
  restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_prices_nonnegative check (cost_price >= 0 and sale_price >= 0),
  constraint products_min_stock_nonnegative check (min_stock >= 0)
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_active_idx on public.products(active);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

-- Clientes -------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  reference text,
  email text,
  notes text,
  sensitive_to_caffeine boolean not null default false,
  anxiety_or_insomnia boolean not null default false,
  prohibited_products text,
  approach_preferences text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_not_blank check (btrim(name) <> '')
);

create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index if not exists customers_phone_idx on public.customers(phone);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();

-- Vendas e leads -------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  record_type public.sale_record_type not null default 'sale',
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid references public.locations(id) on delete restrict,
  reference text,
  city text,
  phone text,
  general_status public.sale_general_status not null default 'pending',
  payment_status public.payment_status not null default 'receivable',
  delivery_status public.delivery_status not null default 'to_deliver',
  lead_status text,
  payment_method text,
  payment_condition text,
  partnership text,
  post_sale_status text,
  post_sale_due_at date,
  quoted_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  stock_deducted boolean not null default false,
  total_cost numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  total_profit numeric(12,2) not null default 0,
  notes text,
  idempotency_key text unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_cancel_consistency check (
    (general_status <> 'cancelled') or cancelled_at is not null
  )
);

create index if not exists sales_created_at_idx on public.sales(created_at desc);
create index if not exists sales_customer_idx on public.sales(customer_id);
create index if not exists sales_general_status_idx on public.sales(general_status);
create index if not exists sales_payment_status_idx on public.sales(payment_status);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at before update on public.sales
for each row execute function public.set_updated_at();

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null,
  unit_cost numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  total_cost numeric(12,2) generated always as (quantity * unit_cost) stored,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  total_profit numeric(12,2) generated always as (quantity * (unit_price - unit_cost)) stored,
  created_at timestamptz not null default now(),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_prices_nonnegative check (unit_cost >= 0 and unit_price >= 0)
);

create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_idx on public.sale_items(product_id);

create or replace function public.refresh_sale_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
begin
  v_sale_id := coalesce(new.sale_id, old.sale_id);
  update public.sales s
  set total_cost = coalesce(x.total_cost, 0),
      total_amount = coalesce(x.total_amount, 0),
      total_profit = coalesce(x.total_profit, 0),
      updated_at = now()
  from (
    select sale_id,
           sum(total_cost) as total_cost,
           sum(total_price) as total_amount,
           sum(total_profit) as total_profit
    from public.sale_items
    where sale_id = v_sale_id
    group by sale_id
  ) x
  where s.id = v_sale_id;

  if not found then
    update public.sales
    set total_cost = 0, total_amount = 0, total_profit = 0, updated_at = now()
    where id = v_sale_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sale_items_refresh_totals on public.sale_items;
create trigger sale_items_refresh_totals
after insert or update or delete on public.sale_items
for each row execute function public.refresh_sale_totals();

-- Estoque --------------------------------------------------------------------
create table if not exists public.stock_balances (
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id),
  constraint stock_balances_nonnegative check (quantity >= 0)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null,
  sale_id uuid references public.sales(id) on delete set null,
  transfer_group_id uuid,
  notes text,
  idempotency_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint inventory_movements_nonzero check (quantity_delta <> 0),
  constraint inventory_movement_sign check (
    (movement_type in ('opening', 'purchase', 'cancellation', 'transfer_in') and quantity_delta > 0)
    or (movement_type in ('sale', 'transfer_out') and quantity_delta < 0)
    or movement_type = 'adjustment'
  )
);

create index if not exists inventory_movements_created_idx on public.inventory_movements(created_at desc);
create index if not exists inventory_movements_product_location_idx on public.inventory_movements(product_id, location_id);
create index if not exists inventory_movements_sale_idx on public.inventory_movements(sale_id);

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
begin
  insert into public.stock_balances(product_id, location_id, quantity)
  values (new.product_id, new.location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity into v_current
  from public.stock_balances
  where product_id = new.product_id and location_id = new.location_id
  for update;

  if v_current + new.quantity_delta < 0 then
    raise exception 'Estoque insuficiente. Saldo atual: %, movimento solicitado: %', v_current, new.quantity_delta;
  end if;

  update public.stock_balances
  set quantity = quantity + new.quantity_delta,
      updated_at = now()
  where product_id = new.product_id and location_id = new.location_id;

  return new;
end;
$$;

drop trigger if exists inventory_movements_apply_balance on public.inventory_movements;
create trigger inventory_movements_apply_balance
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

-- Auditoria ------------------------------------------------------------------
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);

-- Funções transacionais ------------------------------------------------------
create or replace function public.create_sale(
  p_record_type public.sale_record_type,
  p_customer_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_reference text default null,
  p_city text default null,
  p_phone text default null,
  p_payment_method text default null,
  p_payment_condition text default null,
  p_notes text default null,
  p_deduct_stock boolean default true,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_item_id uuid;
  v_quantity integer;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar vendas';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A venda precisa ter ao menos um item';
  end if;

  if p_idempotency_key is not null then
    select id into v_sale_id from public.sales where idempotency_key = p_idempotency_key;
    if v_sale_id is not null then return v_sale_id; end if;
  end if;

  insert into public.sales (
    record_type, customer_id, location_id, reference, city, phone,
    general_status, payment_status, delivery_status,
    payment_method, payment_condition, notes, idempotency_key
  ) values (
    p_record_type, p_customer_id, p_location_id, p_reference, p_city, p_phone,
    case when p_record_type = 'lead' then 'pending'::public.sale_general_status else 'active'::public.sale_general_status end,
    case when p_record_type = 'lead' then 'not_applicable'::public.payment_status else 'receivable'::public.payment_status end,
    case when p_record_type = 'lead' then 'not_applicable'::public.delivery_status else 'to_deliver'::public.delivery_status end,
    p_payment_method, p_payment_condition, p_notes, p_idempotency_key
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);
    if v_quantity <= 0 then raise exception 'Quantidade inválida em item da venda'; end if;

    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and active = true;
    if not found then raise exception 'Produto inválido ou inativo'; end if;

    insert into public.sale_items(sale_id, product_id, quantity, unit_cost, unit_price)
    values (
      v_sale_id,
      v_product.id,
      v_quantity,
      coalesce((v_item->>'unit_cost')::numeric, v_product.cost_price),
      coalesce((v_item->>'unit_price')::numeric, v_product.sale_price)
    ) returning id into v_item_id;

    if p_record_type = 'sale' and p_deduct_stock then
      insert into public.inventory_movements(
        product_id, location_id, movement_type, quantity_delta, sale_id, notes, idempotency_key
      ) values (
        v_product.id, p_location_id, 'sale', -v_quantity, v_sale_id,
        'Baixa automática da venda ' || v_sale_id,
        'sale:' || v_sale_id || ':item:' || v_item_id
      );
    end if;
  end loop;

  update public.sales set stock_deducted = (p_record_type = 'sale' and p_deduct_stock) where id = v_sale_id;
  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('sale', v_sale_id, 'created', jsonb_build_object('record_type', p_record_type, 'deduct_stock', p_deduct_stock));
  return v_sale_id;
end;
$$;

create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item public.sale_items%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cancelar vendas';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status = 'cancelled' then return v_sale.id; end if;

  if v_sale.stock_deducted then
    for v_item in select * from public.sale_items where sale_id = p_sale_id
    loop
      insert into public.inventory_movements(
        product_id, location_id, movement_type, quantity_delta, sale_id, notes, idempotency_key
      ) values (
        v_item.product_id, v_sale.location_id, 'cancellation', v_item.quantity, v_sale.id,
        'Estorno do cancelamento da venda ' || v_sale.id,
        'cancel:' || v_sale.id || ':item:' || v_item.id
      ) on conflict (idempotency_key) do nothing;
    end loop;
  end if;

  update public.sales
  set general_status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason,
      stock_deducted = false, updated_at = now()
  where id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('sale', p_sale_id, 'cancelled', jsonb_build_object('reason', p_reason));
  return p_sale_id;
end;
$$;

create or replace function public.transfer_stock(
  p_product_id uuid,
  p_origin_location_id uuid,
  p_destination_location_id uuid,
  p_quantity integer,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := gen_random_uuid();
  v_key text := coalesce(p_idempotency_key, 'transfer:' || v_group::text);
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para transferir estoque'; end if;
  if p_quantity <= 0 then raise exception 'Quantidade deve ser maior que zero'; end if;
  if p_origin_location_id = p_destination_location_id then raise exception 'Origem e destino precisam ser diferentes'; end if;

  if exists (select 1 from public.inventory_movements where idempotency_key = v_key || ':out') then
    select transfer_group_id into v_group from public.inventory_movements where idempotency_key = v_key || ':out';
    return v_group;
  end if;

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, transfer_group_id, notes, idempotency_key)
  values (p_product_id, p_origin_location_id, 'transfer_out', -p_quantity, v_group, p_notes, v_key || ':out');

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, transfer_group_id, notes, idempotency_key)
  values (p_product_id, p_destination_location_id, 'transfer_in', p_quantity, v_group, p_notes, v_key || ':in');

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('stock_transfer', v_group, 'created', jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'origin', p_origin_location_id, 'destination', p_destination_location_id));
  return v_group;
end;
$$;

create or replace function public.set_stock_count(
  p_product_id uuid,
  p_location_id uuid,
  p_counted_quantity integer,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_delta integer;
  v_movement_id uuid;
  v_key text := coalesce(p_idempotency_key, 'adjustment:' || gen_random_uuid()::text);
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para ajustar estoque'; end if;
  if p_counted_quantity < 0 then raise exception 'Contagem não pode ser negativa'; end if;

  select quantity into v_current from public.stock_balances
  where product_id = p_product_id and location_id = p_location_id
  for update;
  v_current := coalesce(v_current, 0);
  v_delta := p_counted_quantity - v_current;

  if v_delta = 0 then return null; end if;

  insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, notes, idempotency_key)
  values (p_product_id, p_location_id, 'adjustment', v_delta, coalesce(p_notes, 'Ajuste por contagem física'), v_key)
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- Views ----------------------------------------------------------------------
create or replace view public.inventory_overview
with (security_invoker = true)
as
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  l.id as location_id,
  l.code as location_code,
  l.name as location_name,
  coalesce(sb.quantity, 0) as quantity,
  p.min_stock,
  p.cost_price,
  p.sale_price,
  coalesce(sb.quantity, 0) * p.cost_price as stock_cost_value,
  coalesce(sb.quantity, 0) * p.sale_price as stock_sale_value
from public.products p
cross join public.locations l
left join public.stock_balances sb on sb.product_id = p.id and sb.location_id = l.id
where p.active and l.active;

create or replace view public.customer_summary
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.city,
  c.phone,
  count(s.id) filter (where s.record_type = 'sale' and s.general_status <> 'cancelled')::integer as purchase_count,
  coalesce(sum(s.total_amount) filter (where s.record_type = 'sale' and s.general_status <> 'cancelled'), 0)::numeric(12,2) as total_spent,
  max(s.created_at) filter (where s.record_type = 'sale' and s.general_status <> 'cancelled') as last_purchase_at
from public.customers c
left join public.sales s on s.customer_id = c.id
group by c.id, c.name, c.city, c.phone;

-- Segurança RLS --------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_balances enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Leitura para usuários autenticados.
do $$
declare t text;
begin
  foreach t in array array['locations','products','customers','sales','sale_items','stock_balances','inventory_movements','audit_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- Escrita direta apenas para admin/operator. Movimentos continuam imutáveis.
do $$
declare t text;
begin
  foreach t in array array['locations','products','customers','sales','sale_items']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_write()) with check (public.can_write())', t || '_write', t);
  end loop;
end $$;

drop policy if exists stock_balances_insert on public.stock_balances;
create policy stock_balances_insert on public.stock_balances for insert to authenticated with check (public.can_write());
drop policy if exists stock_balances_update on public.stock_balances;
create policy stock_balances_update on public.stock_balances for update to authenticated using (public.can_write()) with check (public.can_write());

drop policy if exists inventory_movements_insert on public.inventory_movements;
create policy inventory_movements_insert on public.inventory_movements for insert to authenticated with check (public.can_write());

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert on public.audit_events for insert to authenticated with check (auth.uid() is not null);

-- Grants ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.profiles, public.locations, public.products, public.customers, public.sales, public.sale_items, public.stock_balances, public.inventory_movements, public.audit_events to authenticated;
grant select on public.inventory_overview, public.customer_summary to authenticated;
grant insert, update, delete on public.locations, public.products, public.customers, public.sales, public.sale_items to authenticated;
grant insert, update on public.stock_balances to authenticated;
grant insert on public.inventory_movements, public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.create_sale(public.sale_record_type, uuid, uuid, jsonb, text, text, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.cancel_sale(uuid, text) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.set_stock_count(uuid, uuid, integer, text, text) to authenticated;
