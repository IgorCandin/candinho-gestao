-- Structural preparation used for the official Giulia Fitness workbook import.
-- The production database also contains a private fitness_archive snapshot of the
-- previous generated development catalog before the official import.

create schema if not exists fitness_archive;

alter table public.fitness_customers add column if not exists legacy_source_id text;
alter table public.fitness_suppliers add column if not exists legacy_source_id text;
alter table public.fitness_sales add column if not exists legacy_source_id text;
alter table public.fitness_purchase_orders add column if not exists legacy_source_id text;
alter table public.fitness_variants add column if not exists legacy_image_path text;

create unique index if not exists fitness_customers_legacy_source_id_uidx
  on public.fitness_customers(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists fitness_suppliers_legacy_source_id_uidx
  on public.fitness_suppliers(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists fitness_sales_legacy_source_id_uidx
  on public.fitness_sales(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists fitness_purchase_orders_legacy_source_id_uidx
  on public.fitness_purchase_orders(legacy_source_id) where legacy_source_id is not null;
