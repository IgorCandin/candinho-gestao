with source as (
  select
    btrim(normalized_payload->>'name') as product_name,
    btrim(normalized_payload->>'supplier_name') as supplier_name
  from appsheet_import.prepared_products
  where import_run_id = '1b7b462d-a07f-4003-854d-16e3282d59e0'::uuid
), matched as (
  select p.id as product_id, s.id as supplier_id
  from public.products p
  join source src on lower(src.product_name) = lower(p.name)
  join public.suppliers s on lower(s.name) = lower(src.supplier_name)
)
update public.products p
set default_supplier_id = m.supplier_id,
    updated_at = now()
from matched m
where p.id = m.product_id
  and p.default_supplier_id is null;
