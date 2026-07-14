-- PROPOSTA PARA REVISÃO. NÃO EXECUTADA.
-- Normaliza somente dentro de appsheet_import.*. Não escreve em public.*.

begin;

create or replace function appsheet_import.prepare_run(p_import_run_id uuid)
returns table(entity_type text, prepared_count bigint)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from appsheet_import.import_runs
    where id = p_import_run_id
      and status in ('staged', 'validated')
      and not final_import_approved
  ) then
    raise exception 'Execução inexistente, bloqueada ou já aprovada';
  end if;

  with prepared as (
    -- Clientes ----------------------------------------------------------------
    select
      r.import_run_id,
      'customer'::text as entity_type,
      '0'::text as source_subkey,
      r.source_sheet,
      r.source_row,
      r.original_id,
      r.imported_at,
      concat('FICHA_CLIENTES:', coalesce(r.original_id, r.source_row::text)) as natural_key,
      jsonb_strip_nulls(jsonb_build_object(
        'name', nullif(btrim(r.payload->>'Nome do Cliente'), ''),
        'reference', nullif(btrim(r.payload->>'Referência'), ''),
        'city', nullif(btrim(r.payload->>'Cidade'), ''),
        'phone', nullif(regexp_replace(r.payload->>'Telefone', '\D', '', 'g'), ''),
        'purchase_count', appsheet_import.try_numeric(r.payload->>'Número Total de Compras'),
        'last_purchase_at', appsheet_import.try_timestamptz(r.payload->>'Data da Última Compra'),
        'total_spent', appsheet_import.try_numeric(r.payload->>'Valor Total Gasto')
      )) as normalized_payload,
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Nome do Cliente'), '') is null then '["missing_customer_name"]'::jsonb else '[]'::jsonb end)
        as validation_errors
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet = 'FICHA_CLIENTES'
      and r.original_id is not null

    union all

    -- Produtos ----------------------------------------------------------------
    select
      r.import_run_id, 'product', '0', r.source_sheet, r.source_row, r.original_id, r.imported_at,
      concat('ESTOQUE:', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'name', nullif(btrim(r.payload->>'Produto'), ''),
        'category', nullif(btrim(r.payload->>'Categoria-Mãe'), ''),
        'description', nullif(btrim(r.payload->>'Objetivo'), ''),
        'cost_price', appsheet_import.try_numeric(r.payload->>'Custo Unitário'),
        'sale_price', appsheet_import.try_numeric(r.payload->>'Valor Unitário'),
        'min_stock', appsheet_import.try_numeric(r.payload->>'Estoque Mínimo'),
        'active', appsheet_import.try_boolean(r.payload->>'Mostrar no APP'),
        'supplier_name', nullif(btrim(r.payload->>'Marketplace ou Fornecedor'), '')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product_name"]'::jsonb else '[]'::jsonb end)
      || (case when r.payload ? 'Custo Unitário' and appsheet_import.try_numeric(r.payload->>'Custo Unitário') is null then '["invalid_cost_price"]'::jsonb else '[]'::jsonb end)
      || (case when r.payload ? 'Valor Unitário' and appsheet_import.try_numeric(r.payload->>'Valor Unitário') is null then '["invalid_sale_price"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet = 'ESTOQUE'

    union all

    -- Vendas e leads ----------------------------------------------------------
    select
      r.import_run_id,
      case when lower(coalesce(r.payload->>'Tipo de Registro', '')) = 'lead' then 'lead' else 'sale' end,
      '0', r.source_sheet, r.source_row, r.original_id, r.imported_at,
      concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'record_type', case when lower(coalesce(r.payload->>'Tipo de Registro', '')) = 'lead' then 'lead' else 'sale' end,
        'source_record_type', nullif(btrim(r.payload->>'Tipo de Registro'), ''),
        'customer_name', nullif(btrim(r.payload->>'Nome do Cliente'), ''),
        'customer_reference', nullif(btrim(r.payload->>'Referência'), ''),
        'city', nullif(btrim(r.payload->>'Cidade'), ''),
        'phone', nullif(regexp_replace(r.payload->>'Telefone', '\D', '', 'g'), ''),
        'general_status', nullif(btrim(r.payload->>'Status Geral'), ''),
        'lead_status', nullif(btrim(r.payload->>'Status do Lead'), ''),
        'quoted_at', appsheet_import.try_timestamptz(r.payload->>'Data do Orçamento'),
        'post_sale_due_at', appsheet_import.try_timestamptz(r.payload->>'Data do Pós-Venda Sugerida'),
        'post_sale_status', nullif(btrim(r.payload->>'Pós-Venda'), ''),
        'location_code', nullif(btrim(r.payload->>'Origem do Estoque'), ''),
        'partnership', nullif(btrim(r.payload->>'Parceria'), ''),
        'stock_deducted', appsheet_import.try_boolean(r.payload->>'Baixa no Estoque'),
        'notes', nullif(btrim(r.payload->>'Observações'), '')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Tipo de Registro'), '') is null then '["missing_record_type"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Nome do Cliente'), '') is null and nullif(btrim(r.payload->>'Referência'), '') is null then '["missing_customer_reference"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet = 'MOVIMENTO_GERAL'

    union all

    -- Um item por linha de MOVIMENTO_GERAL; quantidade implícita = 1. ---------
    select
      r.import_run_id, 'sale_item', '0', r.source_sheet, r.source_row, r.original_id, r.imported_at,
      concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text), ':item:1'),
      jsonb_strip_nulls(jsonb_build_object(
        'sale_natural_key', concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text)),
        'product_name', nullif(btrim(r.payload->>'Produto'), ''),
        'quantity', 1,
        'unit_cost', appsheet_import.try_numeric(r.payload->>'Preço de Custo'),
        'unit_price', appsheet_import.try_numeric(r.payload->>'Valor da Venda'),
        'reported_profit', appsheet_import.try_numeric(r.payload->>'Lucro')
      )),
      (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product"]'::jsonb else '[]'::jsonb end)
      || (case when r.payload ? 'Preço de Custo' and appsheet_import.try_numeric(r.payload->>'Preço de Custo') is null then '["invalid_unit_cost"]'::jsonb else '[]'::jsonb end)
      || (case when r.payload ? 'Valor da Venda' and appsheet_import.try_numeric(r.payload->>'Valor da Venda') is null then '["invalid_unit_price"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id
      and r.source_sheet = 'MOVIMENTO_GERAL'
      and lower(coalesce(r.payload->>'Tipo de Registro', '')) <> 'lead'

    union all

    -- Estoque por produto/local ----------------------------------------------
    select
      r.import_run_id, 'stock_balance', location.code, r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat('ESTOQUE:', coalesce(r.original_id, r.source_row::text), ':', location.code),
      jsonb_strip_nulls(jsonb_build_object(
        'product_name', nullif(btrim(r.payload->>'Produto'), ''),
        'location_code', location.code,
        'quantity', normalized_stock.quantity
      )),
      (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product"]'::jsonb else '[]'::jsonb end)
      || (case when normalized_stock.quantity is null then '["invalid_stock_quantity"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    cross join lateral (values
      ('CS', 'Estoque CS'), ('CTS', 'Estoque CTS'), ('ES', 'Estoque ES'),
      ('TT', 'Estoque TT'), ('INGRID', 'Estoque INGRID'), ('ADRIANA', 'Estoque ADRIANA')
    ) as location(code, column_name)
    cross join lateral (
      select case
        -- Correção aprovada: a única célula vazia conhecida representa saldo zero.
        -- A planilha/raw_rows permanece intacta e a regra é restrita por proveniência.
        when r.original_id = '025'
         and r.source_row = 26
         and r.payload->>'Produto' = 'Combo Zero Gordura | Creatina Growth + Picolinato'
         and location.code = 'CS'
         and coalesce(btrim(r.payload->>location.column_name), '') = ''
          then 0::numeric
        else appsheet_import.try_numeric(r.payload->>location.column_name)
      end as quantity
    ) normalized_stock
    where r.import_run_id = p_import_run_id and r.source_sheet = 'ESTOQUE'

    union all

    -- Movimentações: log histórico e tabela operacional. ---------------------
    select
      r.import_run_id, 'inventory_movement', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat(r.source_sheet, ':', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'created_at', appsheet_import.try_timestamptz(r.payload->>'Data'),
        'product_name', nullif(btrim(r.payload->>'Produto'), ''),
        'movement_type', coalesce(nullif(btrim(r.payload->>'Tipo Movimento'), ''), nullif(btrim(r.payload->>'Tipo'), '')),
        'quantity', appsheet_import.try_numeric(r.payload->>'Quantidade'),
        'origin_code', coalesce(nullif(btrim(r.payload->>'Origem'), ''), nullif(btrim(r.payload->>'Origem do Estoque'), '')),
        'destination_code', coalesce(nullif(btrim(r.payload->>'Destino'), ''), nullif(btrim(r.payload->>'Destino do Estoque'), '')),
        'sale_original_id', nullif(btrim(r.payload->>'ID Venda'), ''),
        'supplier_order_original_id', nullif(btrim(r.payload->>'ID Pedido Fornecedor'), ''),
        'partner_movement_original_id', nullif(btrim(r.payload->>'ID Mov Parceria'), ''),
        'notes', nullif(btrim(r.payload->>'Observação'), ''),
        'applied', appsheet_import.try_boolean(r.payload->>'Aplicado?')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product"]'::jsonb else '[]'::jsonb end)
      || (case when appsheet_import.try_numeric(r.payload->>'Quantidade') is null then '["invalid_quantity"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet in ('LOG_ESTOQUE', 'MOV_ESTOQUE')

    union all

    -- Pedidos de fornecedor --------------------------------------------------
    select
      r.import_run_id, 'supplier_order', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat('PEDIDOS_FORNECEDOR:', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'ordered_at', coalesce(
          appsheet_import.try_timestamptz(r.payload->>'Data Hora Pedido'),
          appsheet_import.try_timestamptz(r.payload->>'Data do Pedido')
        ),
        'product_name', nullif(btrim(r.payload->>'Produto'), ''),
        'quantity', appsheet_import.try_numeric(r.payload->>'Quantidade Comprada'),
        'unit_cost', appsheet_import.try_numeric(r.payload->>'Custo Unitário'),
        'reported_total', appsheet_import.try_numeric(r.payload->>'Valor Total'),
        'supplier_name', nullif(btrim(r.payload->>'Marketplace ou Fornecedor'), ''),
        'status', nullif(btrim(r.payload->>'Status'), ''),
        'stock_updated', appsheet_import.try_boolean(r.payload->>'Atualizado no Estoque?'),
        'notes', nullif(btrim(r.payload->>'Observação'), '')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product"]'::jsonb else '[]'::jsonb end)
      || (case when appsheet_import.try_numeric(r.payload->>'Quantidade Comprada') is null then '["invalid_quantity"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet = 'PEDIDOS_FORNECEDOR'

    union all

    -- Parceiros e fornecedores (fornecedor é subtipo de parceiro). -----------
    select
      r.import_run_id, 'partner', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat(r.source_sheet, ':', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'name', coalesce(nullif(btrim(r.payload->>'Nome Parceiro'), ''), nullif(btrim(r.payload->>'Marketplace ou Fornecedor'), '')),
        'partner_type', coalesce(nullif(btrim(r.payload->>'Tipo Parceiro'), ''), 'supplier'),
        'city', nullif(btrim(r.payload->>'Cidade'), ''),
        'reference', nullif(btrim(r.payload->>'Referência'), ''),
        'contact_name', nullif(btrim(r.payload->>'Responsável'), ''),
        'phone', nullif(regexp_replace(r.payload->>'Telefone', '\D', '', 'g'), ''),
        'status', nullif(btrim(r.payload->>'Status Parceiro'), ''),
        'start_date', appsheet_import.try_timestamptz(r.payload->>'Data Início'),
        'end_date', appsheet_import.try_timestamptz(r.payload->>'Data Fim'),
        'partnership_model', nullif(btrim(r.payload->>'Modelo Parceria'), ''),
        'settlement_rule', nullif(btrim(r.payload->>'Regra de Acerto'), ''),
        'commission_pct', appsheet_import.try_numeric(r.payload->>'Comissão %'),
        'active', appsheet_import.try_boolean(r.payload->>'Mostrar no APP?'),
        'notes', nullif(btrim(r.payload->>'Observação/Resumo'), '')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when coalesce(nullif(btrim(r.payload->>'Nome Parceiro'), ''), nullif(btrim(r.payload->>'Marketplace ou Fornecedor'), '')) is null then '["missing_partner_name"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet in ('PARCEIROS', 'LISTA_FORNECEDORES')

    union all

    -- Movimentações de parceiros --------------------------------------------
    select
      r.import_run_id, 'partner_movement', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat('MOV_PARCEIROS:', coalesce(r.original_id, r.source_row::text)),
      jsonb_strip_nulls(jsonb_build_object(
        'created_at', appsheet_import.try_timestamptz(r.payload->>'Data'),
        'partner_original_id', nullif(btrim(r.payload->>'Parceiro'), ''),
        'product_name', nullif(btrim(r.payload->>'Produto'), ''),
        'movement_type', nullif(btrim(r.payload->>'Tipo Movimento Parceiro'), ''),
        'quantity', appsheet_import.try_numeric(r.payload->>'Quantidade'),
        'settlement_unit_price', appsheet_import.try_numeric(r.payload->>'Valor Unitário de Acerto'),
        'unit_cost', appsheet_import.try_numeric(r.payload->>'Custo Unitário'),
        'settlement_status', nullif(btrim(r.payload->>'Status Acerto'), ''),
        'settled_at', appsheet_import.try_timestamptz(r.payload->>'Data Acerto'),
        'inventory_movement_original_id', nullif(btrim(r.payload->>'ID Mov Estoque'), ''),
        'sale_original_id', nullif(btrim(r.payload->>'ID Venda'), ''),
        'notes', nullif(btrim(r.payload->>'Observação'), ''),
        'applied', appsheet_import.try_boolean(r.payload->>'Aplicado?')
      )),
      (case when r.original_id is null then '["missing_original_id"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Parceiro'), '') is null then '["missing_partner"]'::jsonb else '[]'::jsonb end)
      || (case when nullif(btrim(r.payload->>'Produto'), '') is null then '["missing_product"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id and r.source_sheet = 'MOV_PARCEIROS'

    union all

    -- Pagamentos derivados de vendas/cancelamentos, nunca de leads. ----------
    select
      r.import_run_id, 'payment', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text), ':payment'),
      jsonb_strip_nulls(jsonb_build_object(
        'sale_natural_key', concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text)),
        'status', nullif(btrim(r.payload->>'Status de Recebimento'), ''),
        'amount', appsheet_import.try_numeric(r.payload->>'Valor da Venda'),
        'payment_method', nullif(btrim(r.payload->>'Forma de Pagamento'), ''),
        'payment_condition', nullif(btrim(r.payload->>'Condição de Pagamento'), ''),
        'paid_at', appsheet_import.try_timestamptz(r.payload->>'Data do Pagamento')
      )),
      (case when appsheet_import.try_numeric(r.payload->>'Valor da Venda') is null then '["invalid_payment_amount"]'::jsonb else '[]'::jsonb end)
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id
      and r.source_sheet = 'MOVIMENTO_GERAL'
      and lower(coalesce(r.payload->>'Tipo de Registro', '')) <> 'lead'

    union all

    -- Entregas derivadas de vendas/cancelamentos, nunca de leads. ------------
    select
      r.import_run_id, 'delivery', '0', r.source_sheet, r.source_row,
      r.original_id, r.imported_at,
      concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text), ':delivery'),
      jsonb_strip_nulls(jsonb_build_object(
        'sale_natural_key', concat('MOVIMENTO_GERAL:', coalesce(r.original_id, r.source_row::text)),
        'status', nullif(btrim(r.payload->>'Status da Entrega'), ''),
        'delivered_at', appsheet_import.try_timestamptz(r.payload->>'Data da Entrega'),
        'city', nullif(btrim(r.payload->>'Cidade'), ''),
        'reference', nullif(btrim(r.payload->>'Referência'), '')
      )),
      '[]'::jsonb
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id
      and r.source_sheet = 'MOVIMENTO_GERAL'
      and lower(coalesce(r.payload->>'Tipo de Registro', '')) <> 'lead'
  )
  insert into appsheet_import.prepared_entities(
    import_run_id, entity_type, source_subkey, source_sheet, source_row,
    original_id, imported_at, natural_key, normalized_payload, validation_errors
  )
  select
    prepared_row.import_run_id,
    prepared_row.entity_type,
    prepared_row.source_subkey,
    prepared_row.source_sheet,
    prepared_row.source_row,
    prepared_row.original_id,
    prepared_row.imported_at,
    prepared_row.natural_key,
    prepared_row.normalized_payload,
    prepared_row.validation_errors
  from prepared prepared_row
  on conflict on constraint prepared_entities_import_run_id_entity_type_source_sheet_so_key do update
    set original_id = excluded.original_id,
        imported_at = excluded.imported_at,
        natural_key = excluded.natural_key,
        normalized_payload = excluded.normalized_payload,
        validation_errors = excluded.validation_errors,
        match_status = 'pending',
        target_id = null,
        approved_for_promotion = false,
        prepared_at = now();

  delete from appsheet_import.validation_issues where import_run_id = p_import_run_id;

  insert into appsheet_import.validation_issues(
    import_run_id, entity_type, source_sheet, source_row, original_id, issue_code
  )
  select
    p.import_run_id, p.entity_type, p.source_sheet, p.source_row, p.original_id, issue.value
  from appsheet_import.prepared_entities p
  cross join lateral jsonb_array_elements_text(p.validation_errors) as issue(value)
  where p.import_run_id = p_import_run_id
  on conflict (import_run_id, source_sheet, source_row, issue_code, field_name) do nothing;

  -- Telefones repetidos são somente warning. Cada cliente continua sendo uma
  -- entidade independente, identificada por seu ID/linha original do AppSheet.
  with customer_phones as (
    select
      p.import_run_id,
      p.entity_type,
      p.source_sheet,
      p.source_row,
      p.original_id,
      regexp_replace(coalesce(p.normalized_payload->>'phone', ''), '\D', '', 'g') as normalized_phone
    from appsheet_import.prepared_entities p
    where p.import_run_id = p_import_run_id
      and p.entity_type = 'customer'
  ), duplicate_phones as (
    select
      normalized_phone,
      count(*) as occurrence_count,
      jsonb_agg(original_id order by source_row) as original_ids
    from customer_phones
    where length(normalized_phone) >= 10
    group by normalized_phone
    having count(*) > 1
  )
  insert into appsheet_import.validation_issues(
    import_run_id, entity_type, source_sheet, source_row, original_id,
    issue_code, severity, field_name, raw_value, details
  )
  select
    c.import_run_id,
    c.entity_type,
    c.source_sheet,
    c.source_row,
    c.original_id,
    'duplicate_customer_phone',
    'warning',
    'phone',
    c.normalized_phone,
    jsonb_build_object(
      'occurrences', d.occurrence_count,
      'original_ids', d.original_ids,
      'preserve_as_distinct', true
    )
  from customer_phones c
  join duplicate_phones d using (normalized_phone)
  on conflict (import_run_id, source_sheet, source_row, issue_code, field_name) do nothing;

  update appsheet_import.import_runs r
  set status = 'validated',
      sheet_counts = (
        select jsonb_object_agg(source_sheet, row_count)
        from (
          select source_sheet, count(*) as row_count
          from appsheet_import.raw_rows
          where import_run_id = p_import_run_id
          group by source_sheet
        ) counts
      ),
      validation_summary = jsonb_build_object(
        'prepared', (select count(*) from appsheet_import.prepared_entities where import_run_id = p_import_run_id),
        'valid', (select count(*) from appsheet_import.prepared_entities where import_run_id = p_import_run_id and is_valid),
        'errors', (select count(*) from appsheet_import.validation_issues where import_run_id = p_import_run_id and severity = 'error'),
        'warnings', (select count(*) from appsheet_import.validation_issues where import_run_id = p_import_run_id and severity = 'warning')
      )
  where r.id = p_import_run_id;

  return query
  select p.entity_type, count(*)
  from appsheet_import.prepared_entities p
  where p.import_run_id = p_import_run_id
  group by p.entity_type
  order by p.entity_type;
end;
$$;

revoke all on function appsheet_import.prepare_run(uuid) from public, anon, authenticated;
grant execute on function appsheet_import.prepare_run(uuid) to service_role;

create or replace view appsheet_import.prepared_customers with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'customer';
create or replace view appsheet_import.prepared_sales with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'sale';
create or replace view appsheet_import.prepared_leads with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'lead';
create or replace view appsheet_import.prepared_sale_items with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'sale_item';
create or replace view appsheet_import.prepared_products with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'product';
create or replace view appsheet_import.prepared_stock with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'stock_balance';
create or replace view appsheet_import.prepared_movements with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type in ('inventory_movement', 'partner_movement');
create or replace view appsheet_import.prepared_supplier_orders with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'supplier_order';
create or replace view appsheet_import.prepared_partners with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'partner';
create or replace view appsheet_import.prepared_payments with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'payment';
create or replace view appsheet_import.prepared_deliveries with (security_invoker = true) as
  select * from appsheet_import.prepared_entities where entity_type = 'delivery';

revoke all on all tables in schema appsheet_import from public, anon, authenticated;
grant select on all tables in schema appsheet_import to service_role;

commit;
