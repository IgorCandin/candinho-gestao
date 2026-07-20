-- Candinho Company V26
-- Núcleo opcional de sabores para Candinho Suplementos.
-- Já aplicado diretamente no Supabase de produção em migrations V26 menores.
--
-- Regra:
--   products / stock_balances continuam sendo o agregado oficial.
--   product_flavor_stock_balances registra a composição do agregado por sabor.
--   Todo movimento novo de produto com controle por sabor atualiza os dois níveis.

alter table public.products
  add column if not exists flavor_tracking_enabled boolean not null default false,
  add column if not exists flavor_tracking_started_at timestamptz;

create table if not exists public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(name)) > 0)
);

create unique index if not exists product_flavors_product_name_uidx
  on public.product_flavors(product_id, lower(btrim(name)));

create index if not exists product_flavors_product_active_idx
  on public.product_flavors(product_id, active, display_order, name);

create table if not exists public.product_flavor_stock_balances (
  flavor_id uuid not null references public.product_flavors(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key(flavor_id, location_id)
);

create table if not exists public.sale_item_flavor_allocations (
  sale_item_id uuid not null references public.sale_items(id) on delete cascade,
  flavor_id uuid not null references public.product_flavors(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(sale_item_id, flavor_id)
);

alter table public.sale_items
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

alter table public.sales_quote_items
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

alter table public.stock_reservations
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

alter table public.inventory_movements
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

alter table public.purchase_order_items
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

alter table public.purchase_receipts
  add column if not exists flavor_id uuid references public.product_flavors(id) on delete restrict;

create index if not exists sale_items_flavor_idx
  on public.sale_items(flavor_id) where flavor_id is not null;

create index if not exists sales_quote_items_flavor_idx
  on public.sales_quote_items(flavor_id) where flavor_id is not null;

create index if not exists stock_reservations_flavor_idx
  on public.stock_reservations(flavor_id) where flavor_id is not null;

create index if not exists inventory_movements_flavor_idx
  on public.inventory_movements(flavor_id) where flavor_id is not null;

create index if not exists purchase_order_items_flavor_idx
  on public.purchase_order_items(flavor_id) where flavor_id is not null;

create index if not exists purchase_receipts_flavor_idx
  on public.purchase_receipts(flavor_id) where flavor_id is not null;

alter table public.product_flavors enable row level security;
alter table public.product_flavor_stock_balances enable row level security;
alter table public.sale_item_flavor_allocations enable row level security;

drop policy if exists product_flavors_read on public.product_flavors;
create policy product_flavors_read
  on public.product_flavors
  for select
  to authenticated
  using ((select public.can_access_operation('supplements')));

drop policy if exists product_flavor_stock_balances_read
  on public.product_flavor_stock_balances;

create policy product_flavor_stock_balances_read
  on public.product_flavor_stock_balances
  for select
  to authenticated
  using ((select public.can_access_operation('supplements')));

drop policy if exists sale_item_flavor_allocations_read
  on public.sale_item_flavor_allocations;

create policy sale_item_flavor_allocations_read
  on public.sale_item_flavor_allocations
  for select
  to authenticated
  using ((select public.can_access_operation('supplements')));

revoke all
on public.product_flavors,
   public.product_flavor_stock_balances,
   public.sale_item_flavor_allocations
from anon, authenticated;

grant select
on public.product_flavors,
   public.product_flavor_stock_balances,
   public.sale_item_flavor_allocations
to authenticated, service_role;

grant all
on public.product_flavors,
   public.product_flavor_stock_balances,
   public.sale_item_flavor_allocations
to service_role;

-- Permite o mesmo produto em sabores diferentes dentro do mesmo orçamento.
alter table public.sales_quote_items
  drop constraint if exists sales_quote_items_quote_id_product_id_key;

create unique index if not exists sales_quote_items_quote_product_flavor_uidx
  on public.sales_quote_items(
    quote_id,
    product_id,
    coalesce(flavor_id,'00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Permite o mesmo produto em sabores diferentes dentro do mesmo pedido de fornecedor.
alter table public.purchase_order_items
  drop constraint if exists purchase_order_items_purchase_order_id_product_id_key;

create unique index if not exists purchase_order_items_order_product_flavor_uidx
  on public.purchase_order_items(
    purchase_order_id,
    product_id,
    coalesce(flavor_id,'00000000-0000-0000-0000-000000000000'::uuid)
  );

-- O trigger de movimento continua mantendo o saldo agregado do produto.
-- Quando há flavor_id, também mantém a composição por sabor.
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_flavor_current integer;
  v_flavor_enabled boolean;
  v_tracking_started timestamptz;
  v_flavor_product uuid;
begin
  select flavor_tracking_enabled, flavor_tracking_started_at
  into v_flavor_enabled, v_tracking_started
  from public.products
  where id = new.product_id;

  if new.flavor_id is not null then
    select product_id into v_flavor_product
    from public.product_flavors
    where id = new.flavor_id
      and active;

    if v_flavor_product is null or v_flavor_product <> new.product_id then
      raise exception 'Sabor inválido para este produto';
    end if;

    if not coalesce(v_flavor_enabled, false) then
      raise exception 'O controle por sabor não está ativo para este produto';
    end if;
  elsif coalesce(v_flavor_enabled, false)
    and (v_tracking_started is null or coalesce(new.created_at, now()) >= v_tracking_started)
  then
    raise exception 'Informe o sabor para movimentar este produto';
  end if;

  insert into public.stock_balances(product_id, location_id, quantity)
  values (new.product_id, new.location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity into v_current
  from public.stock_balances
  where product_id = new.product_id
    and location_id = new.location_id
  for update;

  if v_current + new.quantity_delta < 0 then
    raise exception
      'Estoque insuficiente. Saldo atual: %, movimento solicitado: %',
      v_current,
      new.quantity_delta;
  end if;

  if new.flavor_id is not null then
    insert into public.product_flavor_stock_balances(flavor_id, location_id, quantity)
    values (new.flavor_id, new.location_id, 0)
    on conflict (flavor_id, location_id) do nothing;

    select quantity into v_flavor_current
    from public.product_flavor_stock_balances
    where flavor_id = new.flavor_id
      and location_id = new.location_id
    for update;

    if v_flavor_current + new.quantity_delta < 0 then
      raise exception
        'Estoque insuficiente para o sabor selecionado. Saldo atual: %, movimento solicitado: %',
        v_flavor_current,
        new.quantity_delta;
    end if;

    update public.product_flavor_stock_balances
    set quantity = quantity + new.quantity_delta,
        updated_at = now()
    where flavor_id = new.flavor_id
      and location_id = new.location_id;
  end if;

  update public.stock_balances
  set quantity = quantity + new.quantity_delta,
      updated_at = now()
  where product_id = new.product_id
    and location_id = new.location_id;

  return new;
end;
$$;

-- Trava genérica para linhas comerciais/operacionais novas.
-- Lead pode ficar sem sabor porque representa intenção e não reserva estoque.
create or replace function public.require_product_flavor_when_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_flavor_product uuid;
  v_sale_id uuid;
  v_record_type text;
begin
  select flavor_tracking_enabled
  into v_enabled
  from public.products
  where id = new.product_id;

  if coalesce(v_enabled, false) then
    if new.flavor_id is null then
      if tg_table_name = 'sale_items' then
        v_sale_id := nullif(to_jsonb(new)->>'sale_id','')::uuid;
        select record_type into v_record_type
        from public.sales
        where id = v_sale_id;

        if v_record_type = 'lead' then
          return new;
        end if;
      end if;

      raise exception 'Selecione o sabor do produto antes de continuar';
    end if;

    select product_id into v_flavor_product
    from public.product_flavors
    where id = new.flavor_id
      and active;

    if v_flavor_product is null or v_flavor_product <> new.product_id then
      raise exception 'Sabor inválido para este produto';
    end if;
  elsif new.flavor_id is not null then
    raise exception 'Este produto não possui controle por sabor';
  end if;

  return new;
end;
$$;

drop trigger if exists sales_quote_items_require_flavor
on public.sales_quote_items;

create trigger sales_quote_items_require_flavor
before insert or update of product_id, flavor_id
on public.sales_quote_items
for each row
execute function public.require_product_flavor_when_enabled();

drop trigger if exists sale_items_require_flavor
on public.sale_items;

create trigger sale_items_require_flavor
before insert or update of product_id, flavor_id
on public.sale_items
for each row
execute function public.require_product_flavor_when_enabled();

drop trigger if exists stock_reservations_require_flavor
on public.stock_reservations;

create trigger stock_reservations_require_flavor
before insert or update of product_id, flavor_id
on public.stock_reservations
for each row
execute function public.require_product_flavor_when_enabled();

drop trigger if exists purchase_order_items_require_flavor
on public.purchase_order_items;

create trigger purchase_order_items_require_flavor
before insert or update of product_id, flavor_id
on public.purchase_order_items
for each row
execute function public.require_product_flavor_when_enabled();
