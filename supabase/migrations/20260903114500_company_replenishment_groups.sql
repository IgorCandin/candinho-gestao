create table if not exists public.replenishment_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  ideal_stock integer not null default 0 check (ideal_stock >= minimum_stock),
  preferred_product_id uuid references public.products(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replenishment_group_products (
  group_id uuid not null references public.replenishment_groups(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, product_id),
  unique (product_id)
);

alter table public.replenishment_groups enable row level security;
alter table public.replenishment_group_products enable row level security;

drop policy if exists replenishment_groups_read on public.replenishment_groups;
create policy replenishment_groups_read
  on public.replenishment_groups for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists replenishment_groups_insert on public.replenishment_groups;
create policy replenishment_groups_insert
  on public.replenishment_groups for insert to authenticated
  with check ((select public.can_write()));
drop policy if exists replenishment_groups_update on public.replenishment_groups;
create policy replenishment_groups_update
  on public.replenishment_groups for update to authenticated
  using ((select public.can_write()))
  with check ((select public.can_write()));
drop policy if exists replenishment_groups_delete on public.replenishment_groups;
create policy replenishment_groups_delete
  on public.replenishment_groups for delete to authenticated
  using ((select public.can_write()));

drop policy if exists replenishment_group_products_read on public.replenishment_group_products;
create policy replenishment_group_products_read
  on public.replenishment_group_products for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists replenishment_group_products_insert on public.replenishment_group_products;
create policy replenishment_group_products_insert
  on public.replenishment_group_products for insert to authenticated
  with check ((select public.can_write()));
drop policy if exists replenishment_group_products_update on public.replenishment_group_products;
create policy replenishment_group_products_update
  on public.replenishment_group_products for update to authenticated
  using ((select public.can_write()))
  with check ((select public.can_write()));
drop policy if exists replenishment_group_products_delete on public.replenishment_group_products;
create policy replenishment_group_products_delete
  on public.replenishment_group_products for delete to authenticated
  using ((select public.can_write()));

revoke all on public.replenishment_groups, public.replenishment_group_products
  from public, anon;
grant select, insert, update, delete
  on public.replenishment_groups, public.replenishment_group_products
  to authenticated, service_role;
