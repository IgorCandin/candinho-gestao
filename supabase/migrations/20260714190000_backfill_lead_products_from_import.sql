-- Recupera o produto de interesse dos leads importados do AppSheet.
-- A operação é idempotente e não altera valores financeiros ou estoque.
with lead_source as (
  select
    s.id as sale_id,
    p.id as product_id
  from public.sales s
  join appsheet_import.raw_rows rr
    on rr.import_run_id = '1b7b462d-a07f-4003-854d-16e3282d59e0'::uuid
   and rr.source_sheet = 'MOVIMENTO_GERAL'
   and s.idempotency_key like '%:' || rr.original_id || ':' || rr.source_row::text
  join public.products p
    on lower(btrim(p.name)) = lower(btrim(rr.payload ->> 'Produto'))
  where s.record_type = 'lead'
), inserted as (
  insert into public.sale_items (
    sale_id,
    product_id,
    quantity,
    unit_cost,
    unit_price
  )
  select
    ls.sale_id,
    ls.product_id,
    1,
    0,
    0
  from lead_source ls
  where not exists (
    select 1
    from public.sale_items si
    where si.sale_id = ls.sale_id
  )
  returning sale_id, product_id
)
insert into public.audit_events (entity_type, entity_id, action, details)
select
  'lead',
  i.sale_id,
  'product_backfilled',
  jsonb_build_object(
    'product_id', i.product_id,
    'source', 'appsheet_import.raw_rows'
  )
from inserted i;
