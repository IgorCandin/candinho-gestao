create table if not exists public.fitness_customers (
  id uuid primary key default gen_random_uuid(), name text not null, phone text, instagram text, city text, source text, notes text,
  active boolean not null default true, created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists fitness_customers_name_idx on public.fitness_customers(lower(name));
create index if not exists fitness_customers_phone_idx on public.fitness_customers(phone) where phone is not null;
alter table public.fitness_suppliers add column if not exists contact_name text;
alter table public.fitness_suppliers add column if not exists phone text;
alter table public.fitness_suppliers add column if not exists email text;
alter table public.fitness_suppliers add column if not exists website text;
alter table public.fitness_suppliers add column if not exists image_url text;
alter table public.fitness_variants add column if not exists minimum_stock integer not null default 0 check (minimum_stock >= 0);
alter table public.fitness_variants add column if not exists reorder_target integer not null default 0 check (reorder_target >= 0);
alter table public.fitness_variants add column if not exists default_supplier_id uuid references public.fitness_suppliers(id) on delete set null;
alter table public.fitness_sales add column if not exists customer_id uuid references public.fitness_customers(id) on delete set null;
alter table public.fitness_sales add column if not exists responsible text;
alter table public.fitness_purchase_orders add column if not exists freight numeric(12,2) not null default 0 check (freight >= 0);
alter table public.fitness_purchase_orders add column if not exists expected_on date;
alter table public.fitness_purchase_orders add column if not exists received_on date;
alter table public.fitness_purchase_orders add column if not exists responsible text;
drop trigger if exists fitness_customers_updated_at on public.fitness_customers;
create trigger fitness_customers_updated_at before update on public.fitness_customers for each row execute function public.fitness_set_updated_at();
alter table public.fitness_customers enable row level security;
drop policy if exists fitness_customers_read on public.fitness_customers;
create policy fitness_customers_read on public.fitness_customers for select to authenticated using (public.can_access_operation('fitness'));
drop policy if exists fitness_customers_write on public.fitness_customers;
create policy fitness_customers_write on public.fitness_customers for all to authenticated using (public.can_write_fitness()) with check (public.can_write_fitness());
grant select,insert,update,delete on public.fitness_customers to authenticated,service_role;
