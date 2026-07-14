-- Etapa 10: operação Candinho Fitness ---------------------------------------

create or replace function public.can_write_fitness()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and p.can_access_fitness
      and p.role in ('admin', 'operator')
  );
$$;

-- Acrescenta a permissão de escrita da operação Fitness ao payload de acesso.
drop function if exists public.get_my_access();
create function public.get_my_access()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_access_fitness boolean,
  can_manage_users boolean,
  can_write_supplements boolean,
  can_write_fitness boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_access_fitness,
    p.can_manage_users,
    (p.active and p.can_access_supplements and p.role in ('admin', 'operator')),
    (p.active and p.can_access_fitness and p.role in ('admin', 'operator'))
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

create table if not exists public.fitness_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Vestuário',
  description text,
  image_url text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fitness_products(id) on delete cascade,
  sku text,
  size text not null default 'Único',
  color text not null default 'Sem cor',
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fitness_variants_product_size_color_idx
  on public.fitness_variants(product_id, lower(size), lower(color));
create unique index if not exists fitness_variants_sku_idx
  on public.fitness_variants(lower(sku)) where sku is not null;

create table if not exists public.fitness_stock_balances (
  variant_id uuid primary key references public.fitness_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  city text,
  quoted_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  general_status text not null default 'active' check (general_status in ('active','finalized','cancelled')),
  payment_status text not null default 'receivable' check (payment_status in ('receivable','received')),
  delivery_status text not null default 'to_deliver' check (delivery_status in ('to_deliver','delivered')),
  payment_method text,
  payment_due_on date,
  paid_on date,
  delivered_on date,
  total_cost numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  total_profit numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.fitness_sales(id) on delete cascade,
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.fitness_sales(id) on delete cascade,
  sale_item_id uuid not null unique references public.fitness_sale_items(id) on delete cascade,
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  quantity_requested integer not null check (quantity_requested > 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  status text not null default 'awaiting_stock' check (status in ('reserved','partial','awaiting_stock','fulfilled','cancelled')),
  reserved_at timestamptz,
  fulfilled_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','purchase','sale','adjustment','cancellation','conversion_in','conversion_out')),
  quantity_delta integer not null check (quantity_delta <> 0),
  sale_id uuid references public.fitness_sales(id) on delete set null,
  purchase_order_item_id uuid,
  transfer_group_id uuid,
  notes text,
  idempotency_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists fitness_suppliers_name_idx on public.fitness_suppliers(lower(name));

create table if not exists public.fitness_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.fitness_suppliers(id) on delete restrict,
  ordered_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  status text not null default 'pending' check (status in ('pending','partial','received','cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.fitness_purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_received <= quantity_ordered)
);

alter table public.fitness_inventory_movements
  drop constraint if exists fitness_inventory_movements_purchase_order_item_id_fkey;
alter table public.fitness_inventory_movements
  add constraint fitness_inventory_movements_purchase_order_item_id_fkey
  foreign key (purchase_order_item_id) references public.fitness_purchase_order_items(id) on delete set null;

create table if not exists public.fitness_purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_item_id uuid not null references public.fitness_purchase_order_items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  received_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.fitness_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.fitness_apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_current integer;
begin
  insert into public.fitness_stock_balances(variant_id, quantity)
  values (new.variant_id, 0)
  on conflict (variant_id) do nothing;

  select quantity into v_current
  from public.fitness_stock_balances
  where variant_id = new.variant_id
  for update;

  if v_current + new.quantity_delta < 0 then
    raise exception 'Estoque Fitness insuficiente. Saldo atual: %, movimento solicitado: %', v_current, new.quantity_delta;
  end if;

  update public.fitness_stock_balances
  set quantity = quantity + new.quantity_delta, updated_at = now()
  where variant_id = new.variant_id;
  return new;
end;
$$;

create or replace function public.fitness_refresh_sale_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_sale_id uuid;
begin
  v_sale_id := coalesce(new.sale_id, old.sale_id);
  update public.fitness_sales s
  set total_cost = coalesce(x.total_cost,0),
      total_amount = coalesce(x.total_amount,0),
      total_profit = coalesce(x.total_profit,0),
      updated_at = now()
  from (
    select sale_id,
      sum(quantity * unit_cost)::numeric(12,2) total_cost,
      sum(quantity * unit_price)::numeric(12,2) total_amount,
      sum(quantity * (unit_price-unit_cost))::numeric(12,2) total_profit
    from public.fitness_sale_items
    where sale_id = v_sale_id
    group by sale_id
  ) x
  where s.id = v_sale_id;

  if not found then
    update public.fitness_sales set total_cost=0,total_amount=0,total_profit=0,updated_at=now() where id=v_sale_id;
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists fitness_products_updated_at on public.fitness_products;
create trigger fitness_products_updated_at before update on public.fitness_products for each row execute function public.fitness_set_updated_at();
drop trigger if exists fitness_variants_updated_at on public.fitness_variants;
create trigger fitness_variants_updated_at before update on public.fitness_variants for each row execute function public.fitness_set_updated_at();
drop trigger if exists fitness_sales_updated_at on public.fitness_sales;
create trigger fitness_sales_updated_at before update on public.fitness_sales for each row execute function public.fitness_set_updated_at();
drop trigger if exists fitness_suppliers_updated_at on public.fitness_suppliers;
create trigger fitness_suppliers_updated_at before update on public.fitness_suppliers for each row execute function public.fitness_set_updated_at();
drop trigger if exists fitness_purchase_orders_updated_at on public.fitness_purchase_orders;
create trigger fitness_purchase_orders_updated_at before update on public.fitness_purchase_orders for each row execute function public.fitness_set_updated_at();
drop trigger if exists fitness_purchase_order_items_updated_at on public.fitness_purchase_order_items;
create trigger fitness_purchase_order_items_updated_at before update on public.fitness_purchase_order_items for each row execute function public.fitness_set_updated_at();

drop trigger if exists fitness_inventory_movements_apply_balance on public.fitness_inventory_movements;
create trigger fitness_inventory_movements_apply_balance after insert on public.fitness_inventory_movements for each row execute function public.fitness_apply_inventory_movement();
drop trigger if exists fitness_sale_items_refresh_totals on public.fitness_sale_items;
create trigger fitness_sale_items_refresh_totals after insert or update or delete on public.fitness_sale_items for each row execute function public.fitness_refresh_sale_totals();

