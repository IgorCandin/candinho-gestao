-- NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA.
--
-- Define a promoção transacional e idempotente. Este arquivo NÃO chama a
-- função. A chamada comentada no final só poderá ser liberada após:
--   1. appsheet_import.import_runs.final_import_approved = true;
--   2. status = 'approved', approved_at/approved_by preenchidos;
--   3. todas as 2.414 entidades com approved_for_promotion = true.

begin;

create or replace function appsheet_import.promote_run(
  p_import_run_id uuid,
  p_approved_by uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_import_run appsheet_import.import_runs%rowtype;
  v_promotion_run_id uuid;
  v_existing_promotion_id uuid;
  v_entity record;
  v_link record;
  v_target_id uuid;
  v_related_id uuid;
  v_product_id uuid;
  v_location_id uuid;
  v_customer_id uuid;
  v_sale_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_existed boolean;
  v_current_quantity integer;
  v_target_quantity integer;
  v_delta integer;
  v_total bigint;
  v_invalid bigint;
  v_errors bigint;
  v_unapproved bigint;
  v_bad_matches bigint;
  v_stock_sha256 text;
  v_products_sha256_before text;
  v_profiles_sha256_before text;
  v_auth_users_sha256_before text;
  v_products_sha256_after text;
  v_profiles_sha256_after text;
  v_auth_users_sha256_after text;
  v_batista_id uuid;
  v_reset_row integer := 0;
begin
  if p_import_run_id is null or p_approved_by is null then
    raise exception 'import_run_id e approved_by são obrigatórios';
  end if;

  if current_setting('transaction_isolation') <> 'serializable' then
    raise exception 'A promoção exige transação SERIALIZABLE explícita';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('appsheet_import:' || p_import_run_id::text, 0));

  select pr.id into v_existing_promotion_id
  from appsheet_import.promotion_runs pr
  where pr.import_run_id = p_import_run_id
    and pr.status = 'completed';

  if v_existing_promotion_id is not null then
    return v_existing_promotion_id;
  end if;

  select * into v_import_run
  from appsheet_import.import_runs
  where id = p_import_run_id
  for update;

  if not found then
    raise exception 'Execução de importação não encontrada: %', p_import_run_id;
  end if;

  if v_import_run.source_sha256 <>
     '99c649c4d1e8c1eddbb39322af391eb8ff4b1ec2b1f8fee5550f504b316cf551' then
    raise exception 'SHA-256 da origem diverge do arquivo revisado';
  end if;

  if not v_import_run.final_import_approved
     or v_import_run.status <> 'approved'
     or v_import_run.approved_at is null
     or v_import_run.approved_by is distinct from p_approved_by then
    raise exception 'Execução sem aprovação final válida ou aprovador divergente';
  end if;

  select
    count(*),
    count(*) filter (where not is_valid),
    count(*) filter (where not approved_for_promotion)
  into v_total, v_invalid, v_unapproved
  from appsheet_import.prepared_entities
  where import_run_id = p_import_run_id;

  select count(*) into v_errors
  from appsheet_import.validation_issues
  where import_run_id = p_import_run_id and severity = 'error';

  if v_total <> 2414 or v_invalid <> 0 or v_errors <> 0 or v_unapproved <> 0 then
    raise exception
      'Pré-condições recusadas: total %, inválidas %, erros %, não aprovadas %',
      v_total, v_invalid, v_errors, v_unapproved;
  end if;

  select count(*) into v_bad_matches
  from (values
    ('customer'::text, 156::bigint),
    ('delivery', 277),
    ('inventory_movement', 491),
    ('lead', 39),
    ('partner', 15),
    ('partner_movement', 6),
    ('payment', 277),
    ('product', 75),
    ('sale', 277),
    ('sale_item', 277),
    ('stock_balance', 450),
    ('supplier_order', 74)
  ) expected(entity_type, expected_count)
  left join lateral (
    select count(*) actual_count
    from appsheet_import.prepared_entities p
    where p.import_run_id = p_import_run_id
      and p.entity_type = expected.entity_type
  ) actual on true
  where actual.actual_count <> expected.expected_count;
  if v_bad_matches <> 0 then
    raise exception 'Composição das entidades diverge do relatório aprovado';
  end if;

  select count(*) into v_bad_matches
  from (values
    ('ESTOQUE'::text, 75::bigint),
    ('FICHA_CLIENTES', 156),
    ('LISTA_FORNECEDORES', 10),
    ('LOG_ESTOQUE', 451),
    ('MOV_ESTOQUE', 40),
    ('MOV_PARCEIROS', 6),
    ('MOVIMENTO_GERAL', 316),
    ('PARCEIROS', 5),
    ('PEDIDOS_FORNECEDOR', 74)
  ) expected(source_sheet, expected_count)
  left join lateral (
    select count(*) actual_count
    from appsheet_import.raw_rows r
    where r.import_run_id = p_import_run_id
      and r.source_sheet = expected.source_sheet
  ) actual on true
  where actual.actual_count <> expected.expected_count;
  if v_bad_matches <> 0
     or (select count(*) from appsheet_import.raw_rows where import_run_id = p_import_run_id) <> 1133 then
    raise exception 'Contagens da origem divergem do relatório aprovado';
  end if;

  -- Baseline público aprovado. Qualquer atividade anterior à promoção exige
  -- nova revisão e atualização consciente destes gates.
  if (select count(*) from public.products) <> 75
     or (select count(*) from public.customers) <> 0
     or (select count(*) from public.sales) <> 0
     or (select count(*) from public.sale_items) <> 0
     or (select count(*) from public.inventory_movements) <> 39
     or (select count(*) from public.stock_balances) <> 39
     or (select count(*) from public.locations) <> 6
     or (select count(*) from public.partners) <> 0
     or (select count(*) from public.supplier_orders) <> 0
     or (select count(*) from public.partner_movements) <> 0
     or (select count(*) from public.payments) <> 0
     or (select count(*) from public.deliveries) <> 0
     or (select count(*) from public.inventory_history) <> 0 then
    raise exception 'Contagens públicas mudaram desde a aprovação do baseline';
  end if;

  -- Estado público anterior à promoção: seis locais cadastrados, sem ES/TT ou
  -- PARCEIROS e sem capacidade de estoque habilitada até a correção abaixo.
  perform 1
  from public.locations
  order by code
  for update;

  select count(*) into v_bad_matches
  from public.locations l
  where upper(btrim(l.code)) not in ('CS', 'CTS', 'BATISTA', 'INGRID', 'ENRICO', 'ITAPHARMA')
     or l.tracks_inventory
     or not l.active;
  if v_bad_matches <> 0
     or (select count(*) from public.locations) <> 6
     or exists (
       select 1 from public.locations
       where upper(btrim(code)) in ('ADRIANA', 'ES', 'TT', 'PARCEIROS')
     ) then
    raise exception 'Locais públicos divergem do baseline operacional revisado';
  end if;

  if exists (
    select 1
    from public.stock_balances sb
    join public.locations l on l.id = sb.location_id
    where upper(btrim(l.code)) <> 'CS'
  ) then
    raise exception 'Existem saldos públicos fora de CS antes da promoção';
  end if;

  if (select count(*) from public.stock_balances where quantity <> 0) <> 39
     or (select coalesce(sum(quantity), 0) from public.stock_balances) <> 125
     or exists (
       select 1 from public.inventory_movements
       where idempotency_key like 'inventory_reset_2026_07_14:%'
     ) then
    raise exception 'Baseline do marco zero diverge: esperados 39 saldos, 125 unidades e nenhuma chave de reset';
  end if;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(jsonb_build_object(
      'product', p.name,
      'location', l.code,
      'quantity', sb.quantity
    ) order by p.name, l.code),
    '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_stock_sha256
  from public.stock_balances sb
  join public.products p on p.id = sb.product_id
  join public.locations l on l.id = sb.location_id;

  if v_stock_sha256 <>
     'f7c595c384eece3eee51a144ff8517beea92749e4ff7a845ab4f0bd0c2d56a50' then
    raise exception 'Snapshot público de estoque mudou desde a aprovação';
  end if;

  -- Produtos e usuários não fazem parte da promoção. Os hashes estáveis do
  -- preflight impedem que uma alteração paralela passe despercebida.
  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_products_sha256_before
  from public.products p;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_profiles_sha256_before
  from public.profiles p;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'created_at', u.created_at
    ) order by u.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_auth_users_sha256_before
  from auth.users u;

  if v_products_sha256_before <> 'e2363a927ffadf04e25889a1d8bafd5b799279a184d335f6a7df9e741bf74079'
     or v_profiles_sha256_before <> 'b462fdcb02426cb3b80a1a13deaa860c62f486a8aef1c915355ddedb22242a5a'
     or v_auth_users_sha256_before <> '16e47991efbac067bddacb5e9cfe2a9b1ef7860d1a27c71a1ea96d3e6c8f78c0' then
    raise exception 'Produtos ou usuários mudaram desde o preflight aprovado';
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_entities s
  where s.import_run_id = p_import_run_id
    and s.entity_type in ('sale', 'lead')
    and (
      s.normalized_payload->>'quoted_at' is null
      or (s.entity_type = 'lead'
          and coalesce(s.normalized_payload->>'source_record_type', '') <> 'Lead')
      or (s.entity_type = 'sale'
          and coalesce(s.normalized_payload->>'source_record_type', '') not in ('Venda', 'Cancelado'))
      or (s.entity_type = 'sale'
          and s.normalized_payload->>'source_record_type' = 'Venda'
          and coalesce(s.normalized_payload->>'general_status', '') not in ('Finalizado', 'Entregue / À Receber'))
      or (s.entity_type = 'sale'
          and s.normalized_payload->>'source_record_type' = 'Cancelado'
          and coalesce(s.normalized_payload->>'general_status', '') <> 'Cancelado')
    );
  if v_bad_matches <> 0 then
    raise exception '% vendas/leads possuem data, tipo ou status sem mapeamento', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_payments p
  join appsheet_import.prepared_sales s
    on s.import_run_id = p.import_run_id
   and s.source_sheet = p.source_sheet
   and s.source_row = p.source_row
  where p.import_run_id = p_import_run_id
    and (
      (s.normalized_payload->>'source_record_type' = 'Venda'
       and coalesce(p.normalized_payload->>'status', '') not in ('Recebido', 'À Receber'))
      or (s.normalized_payload->>'source_record_type' = 'Cancelado'
          and p.normalized_payload->>'status' is not null)
    );
  if v_bad_matches <> 0 then
    raise exception '% pagamentos possuem status sem mapeamento', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_deliveries d
  join appsheet_import.prepared_sales s
    on s.import_run_id = d.import_run_id
   and s.source_sheet = d.source_sheet
   and s.source_row = d.source_row
  where d.import_run_id = p_import_run_id
    and (
      (s.normalized_payload->>'source_record_type' = 'Venda'
       and coalesce(d.normalized_payload->>'status', '') <> 'Entregue')
      or (s.normalized_payload->>'source_record_type' = 'Cancelado'
          and d.normalized_payload->>'status' is not null)
    );
  if v_bad_matches <> 0 then
    raise exception '% entregas possuem status sem mapeamento', v_bad_matches;
  end if;

  -- Produtos devem resolver exatamente para o cadastro existente; a promoção
  -- nunca sobrescreve os 75 produtos já presentes em produção.
  select count(*) into v_bad_matches
  from appsheet_import.prepared_products p
  where p.import_run_id = p_import_run_id
    and (
      select count(*) from public.products target
      where lower(btrim(target.name)) = lower(btrim(p.normalized_payload->>'name'))
    ) <> 1;
  if v_bad_matches <> 0 then
    raise exception '% produtos não possuem correspondência pública única', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_entities e
  where e.import_run_id = p_import_run_id
    and e.entity_type in (
      'sale_item', 'inventory_movement', 'supplier_order', 'partner_movement'
    )
    and (
      select count(*) from public.products target
      where lower(btrim(target.name)) =
            lower(btrim(e.normalized_payload->>'product_name'))
    ) <> 1;
  if v_bad_matches <> 0 then
    raise exception '% entidades referenciam produto público ausente/ambíguo', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_supplier_orders o
  where o.import_run_id = p_import_run_id
    and (
      select count(*)
      from appsheet_import.prepared_partners p
      where p.import_run_id = p_import_run_id
        and p.source_sheet = 'LISTA_FORNECEDORES'
        and lower(btrim(p.normalized_payload->>'name')) =
            lower(btrim(o.normalized_payload->>'supplier_name'))
    ) <> 1;
  if v_bad_matches <> 0 then
    raise exception '% pedidos não possuem fornecedor preparado único', v_bad_matches;
  end if;

  -- Cada venda/lead deve resolver para exatamente um cliente preparado pelo
  -- nome. Telefone nunca é chave e clientes com telefone repetido permanecem separados.
  select count(*) into v_bad_matches
  from appsheet_import.prepared_entities s
  where s.import_run_id = p_import_run_id
    and s.entity_type in ('sale', 'lead')
    and (
      select count(*)
      from appsheet_import.prepared_customers c
      where c.import_run_id = p_import_run_id
        and lower(btrim(c.normalized_payload->>'name')) =
            lower(btrim(s.normalized_payload->>'customer_name'))
    ) <> 1;
  if v_bad_matches <> 0 then
    raise exception '% vendas/leads não possuem cliente preparado único', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_entities s
  where s.import_run_id = p_import_run_id
    and s.entity_type in ('sale', 'lead')
    and (
      select count(*) from public.locations l
      where upper(btrim(l.code)) = case upper(btrim(s.normalized_payload->>'location_code'))
        when 'ADRIANA' then 'BATISTA'
        else upper(btrim(s.normalized_payload->>'location_code'))
      end
        and l.active
    ) <> 1;
  if v_bad_matches <> 0 then
    raise exception '% vendas/leads não possuem local público', v_bad_matches;
  end if;

  if exists (
    select 1
    from appsheet_import.prepared_entities s
    where s.import_run_id = p_import_run_id
      and s.entity_type in ('sale', 'lead')
      and upper(btrim(s.normalized_payload->>'location_code')) not in ('CS', 'CTS', 'ADRIANA')
  ) then
    raise exception 'Venda/lead fora dos locais operacionais revisados';
  end if;

  -- Restrições que serão exigidas pelas tabelas públicas.
  select count(*) into v_bad_matches
  from appsheet_import.prepared_sale_items i
  where i.import_run_id = p_import_run_id
    and (
      i.normalized_payload->>'quantity' is null
      or i.normalized_payload->>'unit_cost' is null
      or i.normalized_payload->>'unit_price' is null
      or
      (i.normalized_payload->>'quantity')::numeric <= 0
      or (i.normalized_payload->>'quantity')::numeric <>
         trunc((i.normalized_payload->>'quantity')::numeric)
      or (i.normalized_payload->>'unit_cost')::numeric < 0
      or (i.normalized_payload->>'unit_price')::numeric < 0
    );
  if v_bad_matches <> 0 then
    raise exception '% itens violam quantidade/preço público', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_supplier_orders o
  where o.import_run_id = p_import_run_id
    and (
      o.normalized_payload->>'quantity' is null
      or (o.normalized_payload->>'quantity')::numeric <= 0
      or coalesce((o.normalized_payload->>'unit_cost')::numeric, 0) < 0
      or coalesce((o.normalized_payload->>'reported_total')::numeric, 0) < 0
    );
  if v_bad_matches <> 0 then
    raise exception '% pedidos violam quantidade/valor público', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_payments p
  where p.import_run_id = p_import_run_id
    and (
      p.normalized_payload->>'amount' is null
      or (p.normalized_payload->>'amount')::numeric < 0
    );
  if v_bad_matches <> 0 then
    raise exception '% pagamentos possuem valor inválido', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_stock s
  where s.import_run_id = p_import_run_id
    and (
      (s.normalized_payload->>'quantity')::numeric < 0
      or (s.normalized_payload->>'quantity')::numeric <>
         trunc((s.normalized_payload->>'quantity')::numeric)
    );
  if v_bad_matches <> 0 then
    raise exception '% saldos não são inteiros não negativos', v_bad_matches;
  end if;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_stock s
  where s.import_run_id = p_import_run_id
    and upper(btrim(s.normalized_payload->>'location_code')) <> 'CS'
    and (s.normalized_payload->>'quantity')::integer <> 0;
  if v_bad_matches <> 0
     or (select count(*) from appsheet_import.prepared_stock where import_run_id = p_import_run_id) <> 450 then
    raise exception 'Snapshot histórico de estoque diverge das 450 observações revisadas';
  end if;

  insert into appsheet_import.promotion_runs(
    import_run_id, status, approved_by, pre_counts
  ) values (
    p_import_run_id,
    'running',
    p_approved_by,
    jsonb_build_object(
      'products', (select count(*) from public.products),
      'customers', (select count(*) from public.customers),
      'sales', (select count(*) from public.sales),
      'sale_items', (select count(*) from public.sale_items),
      'inventory_movements', (select count(*) from public.inventory_movements),
      'stock_balances', (select count(*) from public.stock_balances),
      'locations', (select count(*) from public.locations),
      'partners', (select count(*) from public.partners),
      'supplier_orders', (select count(*) from public.supplier_orders),
      'partner_movements', (select count(*) from public.partner_movements),
      'payments', (select count(*) from public.payments),
      'deliveries', (select count(*) from public.deliveries),
      'inventory_history', (select count(*) from public.inventory_history)
    )
  ) returning id into v_promotion_run_id;

  -- Locais operacionais aprovados. BATISTA é corrigido para ADRIANA no mesmo
  -- UUID. Somente CS, CTS, ADRIANA, ITAPHARMA e INGRID recebem capacidade
  -- explícita de estoque; nenhum saldo histórico é materializado.
  for v_entity in
    select * from (values
      (1, 'BATISTA'::text, 'ADRIANA'::text, null::text),
      (2, 'CS', 'CS', null),
      (3, 'CTS', 'CTS', 'Ponto de Retirada'),
      (4, 'INGRID', 'INGRID', null),
      (5, 'ITAPHARMA', 'ITAPHARMA', null)
    ) desired(source_row, current_code, desired_code, desired_type)
  loop
    select l.id, to_jsonb(l) - 'updated_at'
      into strict v_target_id, v_before
    from public.locations l
    where upper(btrim(l.code)) = v_entity.current_code
    for update;

    if v_entity.current_code = 'BATISTA' then
      v_batista_id := v_target_id;
    end if;

    insert into appsheet_import.promotion_preimages(
      promotion_run_id, target_table, target_key, existed_before,
      before_data, before_sha256
    ) values (
      v_promotion_run_id, 'locations', jsonb_build_object('id', v_target_id),
      true, v_before,
      encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex')
    );

    update public.locations
    set code = v_entity.desired_code,
        location_type = coalesce(v_entity.desired_type, location_type),
        active = true,
        tracks_inventory = true
    where id = v_target_id;

    select to_jsonb(l) - 'updated_at' into strict v_after
    from public.locations l where l.id = v_target_id;
    update appsheet_import.promotion_preimages
    set after_data = v_after,
        after_sha256 = encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
    where promotion_run_id = v_promotion_run_id
      and target_table = 'locations'
      and target_key = jsonb_build_object('id', v_target_id);
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      original_id, imported_at, target_table, target_id, target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'location_adjustment', '_CONTROL',
      v_entity.source_row, v_entity.current_code, now(), 'locations', v_target_id,
      jsonb_build_object('id', v_target_id), 'adjusted'
    );
  end loop;

  select count(*) into v_bad_matches
  from public.locations l
  where upper(btrim(l.code)) not in (
          'CS', 'CTS', 'INGRID', 'ADRIANA', 'ENRICO', 'ITAPHARMA'
        )
     or (
       upper(btrim(l.code)) in ('CS', 'CTS', 'INGRID', 'ADRIANA', 'ITAPHARMA')
       and (not l.active or not l.tracks_inventory)
     )
     or (
       upper(btrim(l.code)) = 'ENRICO'
       and l.tracks_inventory
     );
  if v_bad_matches <> 0
     or (select count(*) from public.locations) <> 6
     or (select id from public.locations where upper(btrim(code)) = 'ADRIANA') is distinct from v_batista_id
     or exists (
       select 1 from public.locations
       where upper(btrim(code)) in ('BATISTA', 'ES', 'TT', 'PARCEIROS')
     ) then
    raise exception 'Correção de locais falhou: conjunto, UUID ou capacidade de estoque divergente';
  end if;

  -- Produtos: apenas vínculo com o registro já existente. -------------------
  for v_entity in
    select * from appsheet_import.prepared_products
    where import_run_id = p_import_run_id order by source_row
  loop
    select id into strict v_target_id
    from public.products
    where lower(btrim(name)) = lower(btrim(v_entity.normalized_payload->>'name'));

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'product', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'products', v_target_id,
      jsonb_build_object('id', v_target_id), 'matched'
    );
  end loop;

  -- Clientes: sempre um por ID/linha original, nunca por telefone. -----------
  for v_entity in
    select * from appsheet_import.prepared_customers
    where import_run_id = p_import_run_id order by source_row
  loop
    v_target_id := gen_random_uuid();
    insert into public.customers(id, name, phone, city, reference, notes)
    values (
      v_target_id,
      v_entity.normalized_payload->>'name',
      v_entity.normalized_payload->>'phone',
      v_entity.normalized_payload->>'city',
      v_entity.normalized_payload->>'reference',
      'Importado do AppSheet; proveniência preservada em appsheet_import.entity_links.'
    );

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'customer', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'customers', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- Parceiros e fornecedores. -----------------------------------------------
  for v_entity in
    select * from appsheet_import.prepared_partners
    where import_run_id = p_import_run_id order by source_sheet, source_row
  loop
    v_target_id := gen_random_uuid();
    insert into public.partners(
      id, name, partner_type, city, reference, contact_name, phone, status,
      start_date, end_date, partnership_model, settlement_rule, commission_pct,
      active, can_hold_stock, can_pickup, can_sell, can_deliver,
      can_receive_operations, notes, import_run_id, source_sheet, source_row,
      original_id, imported_at
    ) values (
      v_target_id,
      v_entity.normalized_payload->>'name',
      case
        when v_entity.source_sheet = 'PARCEIROS'
         and lower(btrim(v_entity.normalized_payload->>'name')) = lower('C.T.S. Pâmella Nunes')
          then 'Ponto de Retirada'
        else v_entity.normalized_payload->>'partner_type'
      end,
      v_entity.normalized_payload->>'city',
      v_entity.normalized_payload->>'reference',
      v_entity.normalized_payload->>'contact_name',
      v_entity.normalized_payload->>'phone',
      v_entity.normalized_payload->>'status',
      (v_entity.normalized_payload->>'start_date')::timestamptz::date,
      (v_entity.normalized_payload->>'end_date')::timestamptz::date,
      v_entity.normalized_payload->>'partnership_model',
      v_entity.normalized_payload->>'settlement_rule',
      (v_entity.normalized_payload->>'commission_pct')::numeric,
      (v_entity.normalized_payload->>'active')::boolean,
      false,
      v_entity.source_sheet = 'PARCEIROS'
        and lower(btrim(v_entity.normalized_payload->>'name')) in (
          lower('C.T.S. Pâmella Nunes'), lower('Mini Mercearia do Batista')
        ),
      v_entity.source_sheet = 'PARCEIROS'
        and coalesce(v_entity.normalized_payload->>'partner_type', '') = 'Consignado',
      v_entity.source_sheet = 'PARCEIROS'
        and coalesce(v_entity.normalized_payload->>'partner_type', '') = 'Parceiro Interno',
      false,
      concat_ws(E'\n', v_entity.normalized_payload->>'notes', case
        when v_entity.source_sheet = 'PARCEIROS'
         and lower(btrim(v_entity.normalized_payload->>'name')) = lower('C.T.S. Pâmella Nunes')
          then 'Categoria corrigida por decisão aprovada: Ponto de Retirada.'
      end),
      p_import_run_id, v_entity.source_sheet, v_entity.source_row,
      v_entity.original_id, v_entity.imported_at
    );

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'partner', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'partners', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- Vendas e leads. Assinatura de conteúdo nunca deduplica IDs distintos. ----
  for v_entity in
    select * from appsheet_import.prepared_entities
    where import_run_id = p_import_run_id and entity_type in ('sale', 'lead')
    order by source_row
  loop
    select l.target_id into strict v_customer_id
    from appsheet_import.entity_links l
    join appsheet_import.prepared_customers c
      on c.import_run_id = l.import_run_id
     and c.source_sheet = l.source_sheet
     and c.source_row = l.source_row
     and c.source_subkey = l.source_subkey
    where l.promotion_run_id = v_promotion_run_id
      and l.entity_type = 'customer'
      and lower(btrim(c.normalized_payload->>'name')) =
          lower(btrim(v_entity.normalized_payload->>'customer_name'));

    select id into strict v_location_id
    from public.locations
    where upper(btrim(code)) = upper(btrim(v_entity.normalized_payload->>'location_code'))
      and active
      and tracks_inventory;

    v_target_id := gen_random_uuid();
    insert into public.sales(
      id, record_type, customer_id, location_id, reference, city, phone,
      general_status, payment_status, delivery_status, lead_status,
      payment_method, payment_condition, partnership, post_sale_status,
      post_sale_due_at, quoted_at, paid_at, delivered_at, cancelled_at,
      cancellation_reason, stock_deducted, notes, idempotency_key
    )
    select
      v_target_id,
      case when v_entity.entity_type = 'lead' then 'lead' else 'sale' end::public.sale_record_type,
      v_customer_id,
      v_location_id,
      v_entity.normalized_payload->>'customer_reference',
      v_entity.normalized_payload->>'city',
      v_entity.normalized_payload->>'phone',
      case
        when v_entity.entity_type = 'lead' then 'pending'
        when v_entity.normalized_payload->>'source_record_type' = 'Cancelado' then 'cancelled'
        when v_entity.normalized_payload->>'general_status' = 'Finalizado' then 'finalized'
        when v_entity.normalized_payload->>'general_status' = 'Entregue / À Receber' then 'active'
        else null
      end::public.sale_general_status,
      case
        when v_entity.entity_type = 'lead'
          or v_entity.normalized_payload->>'source_record_type' = 'Cancelado'
          then 'not_applicable'
        when p.normalized_payload->>'status' = 'Recebido' then 'received'
        when p.normalized_payload->>'status' = 'À Receber' then 'receivable'
        else null
      end::public.payment_status,
      case
        when v_entity.entity_type = 'lead'
          or v_entity.normalized_payload->>'source_record_type' = 'Cancelado'
          then 'not_applicable'
        when d.normalized_payload->>'status' = 'Entregue' then 'delivered'
        else 'to_deliver'
      end::public.delivery_status,
      v_entity.normalized_payload->>'lead_status',
      p.normalized_payload->>'payment_method',
      p.normalized_payload->>'payment_condition',
      v_entity.normalized_payload->>'partnership',
      v_entity.normalized_payload->>'post_sale_status',
      (v_entity.normalized_payload->>'post_sale_due_at')::timestamptz::date,
      (v_entity.normalized_payload->>'quoted_at')::timestamptz,
      (p.normalized_payload->>'paid_at')::timestamptz,
      (d.normalized_payload->>'delivered_at')::timestamptz,
      case when v_entity.normalized_payload->>'source_record_type' = 'Cancelado'
        then (v_entity.normalized_payload->>'quoted_at')::timestamptz end,
      case when v_entity.normalized_payload->>'source_record_type' = 'Cancelado'
        then 'Cancelamento preservado do AppSheet' end,
      coalesce((v_entity.normalized_payload->>'stock_deducted')::boolean, false),
      v_entity.normalized_payload->>'notes',
      concat(
        'appsheet:', p_import_run_id, ':', v_entity.entity_type, ':',
        v_entity.source_sheet, ':', coalesce(v_entity.original_id, ''), ':',
        v_entity.source_row
      )
    from (select 1) seed
    left join appsheet_import.prepared_payments p
      on p.import_run_id = v_entity.import_run_id
     and p.source_sheet = v_entity.source_sheet
     and p.source_row = v_entity.source_row
    left join appsheet_import.prepared_deliveries d
      on d.import_run_id = v_entity.import_run_id
     and d.source_sheet = v_entity.source_sheet
     and d.source_row = v_entity.source_row;

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, v_entity.entity_type,
      v_entity.source_sheet, v_entity.source_row, v_entity.source_subkey,
      v_entity.original_id, v_entity.imported_at, 'sales', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- Itens vendidos. ----------------------------------------------------------
  for v_entity in
    select * from appsheet_import.prepared_sale_items
    where import_run_id = p_import_run_id order by source_row
  loop
    select target_id into strict v_sale_id
    from appsheet_import.entity_links
    where promotion_run_id = v_promotion_run_id
      and entity_type = 'sale'
      and source_sheet = v_entity.source_sheet
      and source_row = v_entity.source_row;

    select id into strict v_product_id
    from public.products
    where lower(btrim(name)) = lower(btrim(v_entity.normalized_payload->>'product_name'));

    v_target_id := gen_random_uuid();
    insert into public.sale_items(id, sale_id, product_id, quantity, unit_cost, unit_price)
    values (
      v_target_id, v_sale_id, v_product_id,
      (v_entity.normalized_payload->>'quantity')::integer,
      (v_entity.normalized_payload->>'unit_cost')::numeric,
      (v_entity.normalized_payload->>'unit_price')::numeric
    );

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'sale_item', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'sale_items', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- Pagamentos e entregas preservados em tabelas próprias. ------------------
  for v_entity in
    select * from appsheet_import.prepared_payments
    where import_run_id = p_import_run_id order by source_row
  loop
    select target_id into strict v_sale_id
    from appsheet_import.entity_links
    where promotion_run_id = v_promotion_run_id and entity_type = 'sale'
      and source_sheet = v_entity.source_sheet and source_row = v_entity.source_row;
    v_target_id := gen_random_uuid();
    insert into public.payments(
      id, sale_id, status, amount, payment_method, payment_condition, paid_at,
      import_run_id, source_sheet, source_row, original_id, imported_at
    ) values (
      v_target_id, v_sale_id, v_entity.normalized_payload->>'status',
      coalesce((v_entity.normalized_payload->>'amount')::numeric, 0),
      v_entity.normalized_payload->>'payment_method',
      v_entity.normalized_payload->>'payment_condition',
      (v_entity.normalized_payload->>'paid_at')::timestamptz,
      p_import_run_id, v_entity.source_sheet, v_entity.source_row,
      v_entity.original_id, v_entity.imported_at
    );
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'payment', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'payments', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  for v_entity in
    select * from appsheet_import.prepared_deliveries
    where import_run_id = p_import_run_id order by source_row
  loop
    select target_id into strict v_sale_id
    from appsheet_import.entity_links
    where promotion_run_id = v_promotion_run_id and entity_type = 'sale'
      and source_sheet = v_entity.source_sheet and source_row = v_entity.source_row;
    v_target_id := gen_random_uuid();
    insert into public.deliveries(
      id, sale_id, status, delivered_at, city, reference,
      import_run_id, source_sheet, source_row, original_id, imported_at
    ) values (
      v_target_id, v_sale_id, v_entity.normalized_payload->>'status',
      (v_entity.normalized_payload->>'delivered_at')::timestamptz,
      v_entity.normalized_payload->>'city', v_entity.normalized_payload->>'reference',
      p_import_run_id, v_entity.source_sheet, v_entity.source_row,
      v_entity.original_id, v_entity.imported_at
    );
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'delivery', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'deliveries', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- Pedidos de fornecedor. ---------------------------------------------------
  for v_entity in
    select * from appsheet_import.prepared_supplier_orders
    where import_run_id = p_import_run_id order by source_row
  loop
    select id into strict v_product_id
    from public.products
    where lower(btrim(name)) = lower(btrim(v_entity.normalized_payload->>'product_name'));
    select id into strict v_related_id
    from public.partners
    where import_run_id = p_import_run_id
      and source_sheet = 'LISTA_FORNECEDORES'
      and lower(btrim(name)) = lower(btrim(v_entity.normalized_payload->>'supplier_name'));
    v_target_id := gen_random_uuid();
    insert into public.supplier_orders(
      id, product_id, supplier_id, ordered_at, quantity, unit_cost,
      reported_total, status, stock_updated, notes, import_run_id,
      source_sheet, source_row, original_id, imported_at
    ) values (
      v_target_id, v_product_id, v_related_id,
      (v_entity.normalized_payload->>'ordered_at')::timestamptz,
      (v_entity.normalized_payload->>'quantity')::numeric,
      (v_entity.normalized_payload->>'unit_cost')::numeric,
      (v_entity.normalized_payload->>'reported_total')::numeric,
      v_entity.normalized_payload->>'status',
      (v_entity.normalized_payload->>'stock_updated')::boolean,
      v_entity.normalized_payload->>'notes', p_import_run_id,
      v_entity.source_sheet, v_entity.source_row, v_entity.original_id,
      v_entity.imported_at
    );
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'supplier_order', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'supplier_orders', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- LOG_ESTOQUE, MOV_ESTOQUE e MOV_PARCEIROS são arquivados somente como
  -- histórico. Nenhuma destas linhas cria inventory_movements operacionais.
  -- Em particular, MOV_PARCEIROS/linha 5/ID 004 é preservado sem resolver ou
  -- criar parceiro vazio.
  for v_entity in
    select * from appsheet_import.prepared_entities
    where import_run_id = p_import_run_id
      and entity_type in ('inventory_movement', 'partner_movement')
    order by source_sheet, source_row
  loop
    select id into strict v_product_id
    from public.products
    where lower(btrim(name)) = lower(btrim(v_entity.normalized_payload->>'product_name'));
    v_target_id := gen_random_uuid();
    insert into public.inventory_history(
      id, product_id, occurred_at, movement_type, quantity, origin_code,
      destination_code, sale_original_id, supplier_order_original_id,
      partner_movement_original_id, notes, applied, import_run_id,
      source_sheet, source_row, original_id, imported_at
    ) values (
      v_target_id, v_product_id,
      (v_entity.normalized_payload->>'created_at')::timestamptz,
      v_entity.normalized_payload->>'movement_type',
      (v_entity.normalized_payload->>'quantity')::numeric,
      v_entity.normalized_payload->>'origin_code',
      v_entity.normalized_payload->>'destination_code',
      v_entity.normalized_payload->>'sale_original_id',
      v_entity.normalized_payload->>'supplier_order_original_id',
      case when v_entity.entity_type = 'partner_movement'
        then v_entity.original_id
        else v_entity.normalized_payload->>'partner_movement_original_id'
      end,
      concat_ws(E'\n',
        v_entity.normalized_payload->>'notes',
        case when v_entity.entity_type = 'partner_movement' then
          'Histórico MOV_PARCEIROS; sem efeito operacional; parceiro original: ' ||
          coalesce(v_entity.normalized_payload->>'partner_original_id', '<vazio>')
        end
      ),
      (v_entity.normalized_payload->>'applied')::boolean,
      p_import_run_id, v_entity.source_sheet, v_entity.source_row,
      v_entity.original_id, v_entity.imported_at
    );
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, original_id, imported_at, target_table, target_id,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, v_entity.entity_type, v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, v_entity.original_id,
      v_entity.imported_at, 'inventory_history', v_target_id,
      jsonb_build_object('id', v_target_id), 'inserted'
    );
  end loop;

  -- As 450 observações de ESTOQUE permanecem no staging por auditoria. Nenhuma
  -- delas define o saldo operacional após o marco zero.
  for v_entity in
    select * from appsheet_import.prepared_stock
    where import_run_id = p_import_run_id
    order by source_row, source_subkey
  loop
    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, target_subkey, original_id, imported_at, target_table,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'stock_balance', v_entity.source_sheet,
      v_entity.source_row, v_entity.source_subkey, 'balance', v_entity.original_id,
      v_entity.imported_at, 'stock_balances',
      jsonb_build_object(
        'source_location_code', upper(btrim(v_entity.normalized_payload->>'location_code')),
        'source_quantity', (v_entity.normalized_payload->>'quantity')::integer,
        'decision', 'deferred_historical_snapshot_not_promoted'
      ),
      'deferred'
    );
  end loop;

  -- Marco zero operacional. Cada saldo público atual é capturado e zerado por
  -- um movimento adjustment auditável. A chave é um namespace estável mais o
  -- par produto/local, pois idempotency_key é única por movimento.
  for v_entity in
    select sb.product_id, sb.location_id, sb.quantity,
           to_jsonb(sb) as balance_json, p.name as product_name, l.code as location_code
    from public.stock_balances sb
    join public.products p on p.id = sb.product_id
    join public.locations l on l.id = sb.location_id
    where sb.quantity <> 0
    order by l.code, p.name, p.id
    for update of sb
  loop
    v_reset_row := v_reset_row + 1;
    v_product_id := v_entity.product_id;
    v_location_id := v_entity.location_id;
    v_before := v_entity.balance_json;

    insert into appsheet_import.promotion_preimages(
      promotion_run_id, target_table, target_key, existed_before,
      before_data, before_sha256
    ) values (
      v_promotion_run_id,
      'stock_balances',
      jsonb_build_object('product_id', v_product_id, 'location_id', v_location_id),
      true,
      v_before,
      encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex')
    );

    v_target_id := gen_random_uuid();
    insert into public.inventory_movements(
      id, product_id, location_id, movement_type, quantity_delta,
      notes, idempotency_key
    ) values (
      v_target_id, v_product_id, v_location_id, 'adjustment', -v_entity.quantity,
      'Marco zero auditável do estoque em 2026-07-14; saldo anterior: ' || v_entity.quantity,
      concat('inventory_reset_2026_07_14:', v_product_id, ':', v_location_id)
    );

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, target_subkey, original_id, imported_at, target_table,
      target_id, target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'inventory_reset', '_CONTROL',
      v_reset_row, concat(v_product_id, ':', v_location_id),
      'movement', concat(v_entity.location_code, ':', v_entity.product_name), now(),
      'inventory_movements', v_target_id,
      jsonb_build_object('id', v_target_id), 'adjusted'
    );

    select to_jsonb(sb) into strict v_after
    from public.stock_balances sb
    where sb.product_id = v_product_id and sb.location_id = v_location_id;

    update appsheet_import.promotion_preimages
    set after_data = v_after,
        after_sha256 = encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
    where promotion_run_id = v_promotion_run_id
      and target_table = 'stock_balances'
      and target_key = jsonb_build_object('product_id', v_product_id, 'location_id', v_location_id);

    insert into appsheet_import.entity_links(
      promotion_run_id, import_run_id, entity_type, source_sheet, source_row,
      source_subkey, target_subkey, original_id, imported_at, target_table,
      target_key, action
    ) values (
      v_promotion_run_id, p_import_run_id, 'inventory_reset', '_CONTROL',
      v_reset_row, concat(v_product_id, ':', v_location_id), 'balance',
      concat(v_entity.location_code, ':', v_entity.product_name), now(), 'stock_balances',
      jsonb_build_object('product_id', v_product_id, 'location_id', v_location_id),
      'adjusted'
    );
  end loop;

  if (select count(*) from appsheet_import.entity_links
      where promotion_run_id = v_promotion_run_id and entity_type = 'stock_balance'
        and target_table = 'stock_balances' and target_subkey = 'balance'
        and action = 'deferred') <> 450
     or (select count(*) from appsheet_import.promotion_preimages
      where promotion_run_id = v_promotion_run_id and target_table = 'stock_balances') <> 39
     or (select count(*) from appsheet_import.entity_links
      where promotion_run_id = v_promotion_run_id and entity_type = 'inventory_reset'
        and target_table = 'inventory_movements' and target_subkey = 'movement') <> 39
     or (select count(*) from public.stock_balances) <> 39
     or exists (select 1 from public.stock_balances where quantity <> 0)
     or exists (
       select 1
       from public.stock_balances sb
       join public.locations l on l.id = sb.location_id
       where upper(btrim(l.code)) <> 'CS'
     )
     or (select count(*) from public.inventory_movements) <> 78
     or (select count(*) from public.inventory_movements
         where idempotency_key like 'inventory_reset_2026_07_14:%') <> 39 then
    raise exception 'Marco zero diverge: esperados 450 históricos diferidos, 39 ajustes e saldo operacional zero';
  end if;

  if (select count(*) from public.customers) <> 156
     or (select count(*) from public.sales) <> 316
     or (select count(*) from public.sale_items) <> 277
     or (select count(*) from public.locations) <> 6
     or (select count(*) from public.partners) <> 15
     or (select count(*) from public.supplier_orders) <> 74
     or (select count(*) from public.partner_movements) <> 0
     or (select count(*) from public.payments) <> 277
     or (select count(*) from public.deliveries) <> 277
     or (select count(*) from public.inventory_history) <> 497 then
    raise exception 'Contagens públicas finais divergem do plano de promoção e histórico';
  end if;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(jsonb_build_object(
      'product', p.name,
      'location', l.code,
      'quantity', sb.quantity
    ) order by p.name, l.code),
    '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_stock_sha256
  from public.stock_balances sb
  join public.products p on p.id = sb.product_id
  join public.locations l on l.id = sb.location_id;

  if v_stock_sha256 <> 'bfbd25e04bf0273c9be0823b0b8e900731d7cafc91bf51db30eccb595e8dda2b' then
    raise exception 'Hash do marco zero diverge do preflight revisado';
  end if;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_products_sha256_after
  from public.products p;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_profiles_sha256_after
  from public.profiles p;

  select encode(extensions.digest(convert_to(coalesce(
    jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'created_at', u.created_at
    ) order by u.id), '[]'::jsonb
  )::text, 'UTF8'), 'sha256'), 'hex')
  into v_auth_users_sha256_after
  from auth.users u;

  if v_products_sha256_after is distinct from v_products_sha256_before
     or v_profiles_sha256_after is distinct from v_profiles_sha256_before
     or v_auth_users_sha256_after is distinct from v_auth_users_sha256_before then
    raise exception 'Produtos ou usuários foram alterados durante a promoção';
  end if;

  -- Snapshot pós-promoção de todo registro inserido. O rollback recusará
  -- apagar qualquer linha que tenha sido modificada depois da promoção.
  for v_link in
    select *
    from appsheet_import.entity_links
    where promotion_run_id = v_promotion_run_id
      and target_schema = 'public'
      and target_id is not null
      and action in ('inserted', 'adjusted')
      and target_table <> 'locations'
  loop
    execute format(
      'select to_jsonb(t) from %I.%I t where id = $1',
      v_link.target_schema,
      v_link.target_table
    ) into v_after using v_link.target_id;

    if v_after is null then
      raise exception 'Registro promovido ausente em %.%: %',
        v_link.target_schema, v_link.target_table, v_link.target_id;
    end if;

    insert into appsheet_import.promotion_preimages(
      promotion_run_id, target_schema, target_table, target_key,
      existed_before, before_data, after_data, before_sha256, after_sha256
    ) values (
      v_promotion_run_id,
      v_link.target_schema,
      v_link.target_table,
      jsonb_build_object('id', v_link.target_id),
      false,
      null,
      v_after,
      null,
      encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
    );
  end loop;

  select count(*) into v_bad_matches
  from appsheet_import.prepared_entities p
  where p.import_run_id = p_import_run_id
    and not exists (
      select 1
      from appsheet_import.entity_links l
      where l.promotion_run_id = v_promotion_run_id
        and l.import_run_id = p.import_run_id
        and l.entity_type = p.entity_type
        and l.source_sheet = p.source_sheet
        and l.source_row = p.source_row
        and l.source_subkey = p.source_subkey
    );
  if v_bad_matches <> 0 then
    raise exception '% entidades preparadas ficaram sem vínculo de promoção', v_bad_matches;
  end if;

  update appsheet_import.prepared_entities p
  set target_id = l.target_id,
      match_status = case
        when l.action = 'matched' then 'matched'
        when l.action = 'deferred' then 'deferred'
        else 'new'
      end
  from appsheet_import.entity_links l
  where l.promotion_run_id = v_promotion_run_id
    and l.import_run_id = p.import_run_id
    and l.entity_type = p.entity_type
    and l.source_sheet = p.source_sheet
    and l.source_row = p.source_row
    and l.source_subkey = p.source_subkey
    and l.target_subkey = '0'
    and p.import_run_id = p_import_run_id;

  update appsheet_import.prepared_entities p
  set target_id = null,
      match_status = case
        when l.action = 'matched' then 'matched'
        when l.action = 'deferred' then 'deferred'
        else 'new'
      end
  from appsheet_import.entity_links l
  where l.promotion_run_id = v_promotion_run_id
    and l.import_run_id = p.import_run_id
    and l.entity_type = 'stock_balance'
    and p.entity_type = 'stock_balance'
    and l.source_sheet = p.source_sheet
    and l.source_row = p.source_row
    and l.source_subkey = p.source_subkey
    and l.target_subkey = 'balance'
    and p.import_run_id = p_import_run_id;

  update appsheet_import.import_runs
  set status = 'promoted',
      notes = concat_ws(E'\n', notes, 'Promoção concluída: ' || v_promotion_run_id::text)
  where id = p_import_run_id;

  update appsheet_import.promotion_runs
  set status = 'completed',
      completed_at = now(),
      post_counts = jsonb_build_object(
        'products', (select count(*) from public.products),
        'customers', (select count(*) from public.customers),
        'sales', (select count(*) from public.sales),
        'sale_items', (select count(*) from public.sale_items),
        'inventory_movements', (select count(*) from public.inventory_movements),
        'stock_balances', (select count(*) from public.stock_balances),
        'locations', (select count(*) from public.locations),
        'partners', (select count(*) from public.partners),
        'supplier_orders', (select count(*) from public.supplier_orders),
        'partner_movements', (select count(*) from public.partner_movements),
        'payments', (select count(*) from public.payments),
        'deliveries', (select count(*) from public.deliveries),
        'inventory_history', (select count(*) from public.inventory_history)
      ),
      reconciliation = jsonb_build_object(
        'prepared_entities', v_total,
        'invalid_entities', v_invalid,
        'validation_errors', v_errors,
        'stock_reset_movements', 39,
        'stock_units_before_reset', 125,
        'stock_units_after_reset', 0,
        'stock_post_reset_sha256', v_stock_sha256,
        'products_sha256', v_products_sha256_after,
        'profiles_sha256', v_profiles_sha256_after,
        'auth_users_sha256', v_auth_users_sha256_after,
        'source_stock_observations', 450,
        'materialized_source_stock_balances', 0,
        'deferred_stock_observations', 450,
        'partner_movements_operational', 0,
        'inventory_history_rows', 497,
        'selectable_inventory_locations', jsonb_build_array(
          'CS', 'CTS', 'ADRIANA', 'ITAPHARMA', 'INGRID'
        ),
        'company_stock_is_calculated_total', true,
        'duplicate_sales_preserved', true,
        'duplicate_phone_customers_preserved', true
      )
  where id = v_promotion_run_id;

  return v_promotion_run_id;
end;
$$;

revoke all on function appsheet_import.promote_run(uuid, uuid) from public, anon, authenticated;
grant execute on function appsheet_import.promote_run(uuid, uuid) to service_role;

commit;

-- CHAMADA PROIBIDA NESTA FASE:
-- begin isolation level serializable;
-- set local lock_timeout = '5s';
-- set local statement_timeout = '120s';
-- select appsheet_import.promote_run('<IMPORT_RUN_ID>', '<APPROVED_BY>');
-- commit;
