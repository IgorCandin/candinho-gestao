-- Views específicas para vendas, leads, pedidos pendentes, reposição e catálogo seguro.

alter table public.locations
  add column if not exists counts_for_replenishment boolean not null default false;

update public.locations
set counts_for_replenishment = (code = 'CS');

alter table public.products
  add column if not exists installment_price numeric(12,2),
  add column if not exists ideal_stock integer,
  add column if not exists objective text,
  add column if not exists ideal_profile text,
  add column if not exists duration_days integer,
  add column if not exists information text,
  add column if not exists quick_message text,
  add column if not exists keywords text,
  add column if not exists level text,
  add column if not exists sales_category text,
  add column if not exists secondary_image_url text,
  add column if not exists legacy_image_path text,
  add column if not exists legacy_secondary_image_path text;

-- Recupera os metadados do catálogo original quando a staging ainda estiver disponível.
with latest_run as (
  select id
  from appsheet_import.import_runs
  order by imported_at desc
  limit 1
), source_products as (
  select distinct on (lower(btrim(payload->>'Produto')))
    lower(btrim(payload->>'Produto')) as normalized_name,
    payload
  from appsheet_import.raw_rows
  where import_run_id = (select id from latest_run)
    and source_sheet = 'ESTOQUE'
    and nullif(btrim(payload->>'Produto'), '') is not null
  order by lower(btrim(payload->>'Produto')), source_row desc
)
update public.products p
set
  installment_price = case when sp.payload->>'Valor à Prazo' ~ '^-?[0-9]+([.,][0-9]+)?$'
    then replace(sp.payload->>'Valor à Prazo', ',', '.')::numeric else p.installment_price end,
  ideal_stock = case when sp.payload->>'Estoque Ideal' ~ '^-?[0-9]+([.,][0-9]+)?$'
    then round(replace(sp.payload->>'Estoque Ideal', ',', '.')::numeric)::integer else p.ideal_stock end,
  objective = coalesce(nullif(btrim(sp.payload->>'Objetivo'), ''), p.objective),
  ideal_profile = coalesce(nullif(btrim(sp.payload->>'Perfil Ideal'), ''), p.ideal_profile),
  duration_days = case when sp.payload->>'Duração' ~ '^-?[0-9]+([.,][0-9]+)?$'
    then round(replace(sp.payload->>'Duração', ',', '.')::numeric)::integer else p.duration_days end,
  information = coalesce(nullif(btrim(sp.payload->>'Informativo'), ''), p.information),
  quick_message = coalesce(nullif(btrim(sp.payload->>'Mensagem Rápida'), ''), p.quick_message),
  keywords = coalesce(nullif(btrim(sp.payload->>'Palavra-Chave'), ''), p.keywords),
  level = coalesce(nullif(btrim(sp.payload->>'Nível'), ''), p.level),
  sales_category = coalesce(nullif(btrim(sp.payload->>'Categoria de Vendas'), ''), p.sales_category),
  legacy_image_path = coalesce(nullif(btrim(sp.payload->>'Foto do Produto'), ''), p.legacy_image_path),
  legacy_secondary_image_path = coalesce(nullif(btrim(sp.payload->>'Foto 02'), ''), p.legacy_secondary_image_path),
  updated_at = now()
from source_products sp
where lower(btrim(p.name)) = sp.normalized_name;

update public.products
set installment_price = sale_price
where installment_price is null;

create or replace view public.sales_history
with (security_invoker = true)
as
select
  s.id,
  s.customer_id,
  c.name as customer_name,
  s.location_id,
  l.code as location_code,
  l.name as location_name,
  coalesce(s.delivered_at, s.quoted_at) as business_at,
  (coalesce(s.delivered_at, s.quoted_at) at time zone 'UTC')::date as business_date,
  s.quoted_at,
  s.delivered_at,
  s.general_status,
  s.payment_status,
  s.delivery_status,
  s.payment_method,
  s.payment_condition,
  s.total_amount,
  s.total_profit,
  s.notes,
  items.product_summary,
  items.total_items
from public.sales s
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = s.location_id
left join lateral (
  select
    string_agg(p.name || ' ×' || si.quantity::text, ', ' order by p.name) as product_summary,
    coalesce(sum(si.quantity), 0)::integer as total_items
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = s.id
) items on true
where s.record_type = 'sale';

create or replace view public.leads_history
with (security_invoker = true)
as
select
  s.id,
  s.customer_id,
  c.name as customer_name,
  s.location_id,
  l.code as location_code,
  l.name as location_name,
  s.quoted_at as lead_at,
  (s.quoted_at at time zone 'UTC')::date as lead_date,
  date_trunc('month', s.quoted_at at time zone 'UTC')::date as lead_month,
  s.lead_status,
  s.general_status,
  s.reference,
  s.city,
  s.phone,
  s.notes,
  items.product_summary,
  items.total_items
from public.sales s
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = s.location_id
left join lateral (
  select
    string_agg(p.name || ' ×' || si.quantity::text, ', ' order by p.name) as product_summary,
    coalesce(sum(si.quantity), 0)::integer as total_items
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = s.id
) items on true
where s.record_type = 'lead';

create or replace view public.pending_orders
with (security_invoker = true)
as
select
  s.id,
  s.customer_id,
  c.name as customer_name,
  s.location_id,
  l.code as location_code,
  coalesce(s.delivered_at, s.quoted_at) as business_at,
  (coalesce(s.delivered_at, s.quoted_at) at time zone 'UTC')::date as business_date,
  s.quoted_at as order_at,
  s.delivered_at,
  s.payment_status,
  s.delivery_status,
  s.payment_method,
  s.payment_condition,
  s.total_amount,
  s.total_profit,
  items.product_summary,
  items.total_items
from public.sales s
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = s.location_id
left join lateral (
  select
    string_agg(p.name || ' ×' || si.quantity::text, ', ' order by p.name) as product_summary,
    coalesce(sum(si.quantity), 0)::integer as total_items
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = s.id
) items on true
where s.record_type = 'sale'
  and s.general_status <> 'cancelled'
  and s.payment_status = 'receivable';

create or replace view public.replenishment_overview
with (security_invoker = true)
as
with company_stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity), 0)::integer as company_quantity
  from public.stock_balances sb
  join public.locations l on l.id = sb.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(cs.company_quantity, 0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  p.min_stock > 0 and coalesce(cs.company_quantity, 0) <= p.min_stock as needs_replenishment,
  greatest(coalesce(nullif(p.ideal_stock, 0), p.min_stock) - coalesce(cs.company_quantity, 0), 0) as suggested_order_quantity,
  case
    when coalesce(cs.company_quantity, 0) = 0 and p.min_stock > 0 then 'out_of_stock'
    when coalesce(cs.company_quantity, 0) <= p.min_stock and p.min_stock > 0 then 'below_minimum'
    else 'healthy'
  end as stock_status
from public.products p
left join company_stock cs on cs.product_id = p.id
where p.active;

create or replace view public.product_catalog
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.category,
  p.brand,
  p.image_url,
  p.active,
  p.sale_price,
  coalesce(p.installment_price, p.sale_price) as installment_price
from public.products p;

create or replace view public.product_details
with (security_invoker = true)
as
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
  coalesce(p.installment_price, p.sale_price) as installment_price
from public.products p;

revoke all on public.sales_history, public.leads_history, public.pending_orders,
  public.replenishment_overview, public.product_catalog, public.product_details from anon;
grant select on public.sales_history, public.leads_history, public.pending_orders,
  public.replenishment_overview, public.product_catalog, public.product_details to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
for select to authenticated
using (bucket_id = 'product-images');

drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and public.can_write());

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and public.can_write())
with check (bucket_id = 'product-images' and public.can_write());

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and public.can_write());
