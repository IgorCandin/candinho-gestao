-- CONSULTAS SOMENTE LEITURA. NÃO EXECUTADAS.
-- Cada bloco usa a execução mais recente; em uma execução real, fixe o UUID revisado.

-- 1. Contagem por aba e preservação de proveniência.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select source_sheet, count(*) as records,
       count(original_id) as records_with_original_id,
       min(source_row) as first_source_row,
       max(source_row) as last_source_row,
       min(imported_at) as imported_at
from appsheet_import.raw_rows
where import_run_id = (select id from current_run)
group by source_sheet
order by source_sheet;

-- 2. Entidades preparadas, inválidas e ainda não aprovadas.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select entity_type, count(*) as total,
       count(*) filter (where is_valid) as valid,
       count(*) filter (where not is_valid) as invalid,
       count(*) filter (where approved_for_promotion) as approved
from appsheet_import.prepared_entities
where import_run_id = (select id from current_run)
group by entity_type
order by entity_type;

-- 3. Produtos da planilha não localizados no cadastro público.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select p.source_sheet, p.source_row, p.original_id,
       p.normalized_payload->>'name' as product_name
from appsheet_import.prepared_products p
left join public.products target
  on lower(btrim(target.name)) = lower(btrim(p.normalized_payload->>'name'))
where p.import_run_id = (select id from current_run)
  and target.id is null
order by p.source_row;

-- 4. Itens vendidos com produto não localizado.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select i.source_sheet, i.source_row, i.original_id,
       i.normalized_payload->>'product_name' as product_name
from appsheet_import.prepared_sale_items i
left join public.products target
  on lower(btrim(target.name)) = lower(btrim(i.normalized_payload->>'product_name'))
where i.import_run_id = (select id from current_run)
  and target.id is null
order by i.source_row;

-- 5. Clientes duplicados: telefone; na ausência dele, nome + cidade.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
), customer_keys as (
  select c.*,
         case
           when length(regexp_replace(c.normalized_payload->>'phone', '\D', '', 'g')) >= 10
             then 'phone:' || regexp_replace(c.normalized_payload->>'phone', '\D', '', 'g')
           else 'name-city:' || lower(btrim(c.normalized_payload->>'name')) || ':' ||
                lower(btrim(coalesce(c.normalized_payload->>'city', '')))
         end as duplicate_key
  from appsheet_import.prepared_customers c
  where c.import_run_id = (select id from current_run)
)
select duplicate_key, count(*) as occurrences,
       array_agg(source_row order by source_row) as source_rows,
       array_agg(original_id order by source_row) as original_ids
from customer_keys
group by duplicate_key
having count(*) > 1
order by occurrences desc, duplicate_key;

-- 6. Vendas sem referência de cliente ou sem item associado.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select s.source_row, s.original_id,
       s.normalized_payload->>'customer_name' as customer_name,
       s.normalized_payload->>'customer_reference' as customer_reference,
       case when i.id is null then 'missing_sale_item' end as item_issue
from appsheet_import.prepared_sales s
left join appsheet_import.prepared_sale_items i
  on i.import_run_id = s.import_run_id
 and i.source_sheet = s.source_sheet
 and i.source_row = s.source_row
where s.import_run_id = (select id from current_run)
  and (
    (nullif(btrim(s.normalized_payload->>'customer_name'), '') is null
     and nullif(btrim(s.normalized_payload->>'customer_reference'), '') is null)
    or i.id is null
  )
order by s.source_row;

-- 7. Valores/datas inválidos e demais erros bloqueantes.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
)
select entity_type, source_sheet, source_row, original_id,
       issue_code, field_name, raw_value, details
from appsheet_import.validation_issues
where import_run_id = (select id from current_run)
order by severity desc, source_sheet, source_row, issue_code;

-- 8. Possíveis vendas duplicadas por cliente, produto, data e valor.
with current_run as (
  select id from appsheet_import.import_runs order by imported_at desc limit 1
), signatures as (
  select s.source_row, s.original_id,
         concat_ws('|',
           lower(btrim(coalesce(s.normalized_payload->>'customer_name', ''))),
           lower(btrim(coalesce(i.normalized_payload->>'product_name', ''))),
           coalesce(s.normalized_payload->>'quoted_at', ''),
           coalesce(i.normalized_payload->>'unit_price', '')
         ) as signature
  from appsheet_import.prepared_sales s
  join appsheet_import.prepared_sale_items i
    on i.import_run_id = s.import_run_id
   and i.source_sheet = s.source_sheet
   and i.source_row = s.source_row
  where s.import_run_id = (select id from current_run)
)
select signature, count(*) as occurrences,
       array_agg(source_row order by source_row) as source_rows,
       array_agg(original_id order by source_row) as original_ids
from signatures
group by signature
having count(*) > 1
order by occurrences desc, signature;

-- 9. Guarda final: deve retornar false/zero antes da aprovação expressa.
with current_run as (
  select * from appsheet_import.import_runs order by imported_at desc limit 1
)
select id, status, final_import_approved, approved_at, approved_by,
       (select count(*) from appsheet_import.prepared_entities p
        where p.import_run_id = current_run.id and p.approved_for_promotion) as approved_entities
from current_run;
