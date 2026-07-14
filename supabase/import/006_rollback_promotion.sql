-- NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA.
--
-- Define rollback exato por promotion_run_id. Este arquivo NÃO chama a função.
-- O rollback aborta se algum registro promovido ou saldo tiver sido alterado
-- depois da promoção; nesse caso será necessário um plano compensatório.

begin;

create or replace function appsheet_import.rollback_promotion(
  p_promotion_run_id uuid,
  p_requested_by uuid,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_promotion appsheet_import.promotion_runs%rowtype;
  v_image record;
  v_current jsonb;
  v_current_sha256 text;
  v_target_id uuid;
  v_product_id uuid;
  v_location_id uuid;
  v_conflicts bigint;
begin
  if p_promotion_run_id is null or p_requested_by is null then
    raise exception 'promotion_run_id e requested_by são obrigatórios';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Motivo do rollback é obrigatório';
  end if;
  if current_setting('transaction_isolation') <> 'serializable' then
    raise exception 'Rollback exige transação SERIALIZABLE explícita';
  end if;

  select * into v_promotion
  from appsheet_import.promotion_runs
  where id = p_promotion_run_id
  for update;

  if not found then
    raise exception 'Promoção não encontrada: %', p_promotion_run_id;
  end if;
  if v_promotion.status = 'rolled_back' then
    return v_promotion.id;
  end if;
  if v_promotion.status <> 'completed' then
    raise exception 'Somente uma promoção concluída pode ser revertida';
  end if;
  if v_promotion.approved_by is distinct from p_requested_by then
    raise exception 'Rollback deve ser solicitado pelo aprovador da promoção';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('appsheet_import:' || v_promotion.import_run_id::text, 0)
  );

  -- Recusa metadados fora do conjunto controlado antes do primeiro DML. -----
  select count(*) into v_conflicts
  from appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and (
      l.target_schema <> 'public'
      or l.target_table not in (
        'products', 'customers', 'sales', 'sale_items',
        'inventory_movements', 'stock_balances', 'locations', 'partners',
        'supplier_orders', 'partner_movements', 'payments',
        'deliveries', 'inventory_history'
      )
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % vínculos fora do conjunto público controlado', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.promotion_preimages i
  where i.promotion_run_id = p_promotion_run_id
    and (
      i.target_schema <> 'public'
      or i.target_table not in (
        'customers', 'sales', 'sale_items', 'inventory_movements',
        'stock_balances', 'locations', 'partners', 'supplier_orders',
        'partner_movements', 'payments', 'deliveries', 'inventory_history'
      )
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % preimages fora do conjunto público controlado', v_conflicts;
  end if;

  -- Confere a integridade dos snapshots armazenados, não apenas a linha atual.
  select count(*) into v_conflicts
  from appsheet_import.promotion_preimages i
  where i.promotion_run_id = p_promotion_run_id
    and i.target_schema = 'public'
    and (
      i.after_data is null
      or i.after_sha256 is null
      or encode(
        extensions.digest(convert_to(i.after_data::text, 'UTF8'), 'sha256'),
        'hex'
      ) is distinct from i.after_sha256
      or (
        i.existed_before
        and (
          i.before_data is null
          or i.before_sha256 is null
          or encode(
            extensions.digest(convert_to(i.before_data::text, 'UTF8'), 'sha256'),
            'hex'
          ) is distinct from i.before_sha256
        )
      )
      or (
        not i.existed_before
        and (i.before_data is not null or i.before_sha256 is not null)
      )
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % snapshots armazenados falharam na integridade', v_conflicts;
  end if;

  -- Somente 75 saldos de CS são materializados; 375 zeros permanecem diferidos
  -- no staging por decisão operacional registrada nos vínculos.
  select count(*) into v_conflicts
  from appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.entity_type = 'stock_balance'
    and l.target_table = 'stock_balances'
    and l.target_subkey = 'balance';
  if v_conflicts <> 75 then
    raise exception 'Rollback recusado: esperados 75 vínculos materiais de saldo, encontrados %', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.entity_type = 'stock_balance'
    and l.target_table = 'stock_balances'
    and l.target_subkey = 'balance'
    and l.action = 'deferred'
    and l.target_id is null;
  if v_conflicts <> 375 then
    raise exception 'Rollback recusado: esperados 375 saldos diferidos, encontrados %', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.promotion_preimages i
  where i.promotion_run_id = p_promotion_run_id
    and i.target_schema = 'public'
    and i.target_table = 'stock_balances';
  if v_conflicts <> 75 then
    raise exception 'Rollback recusado: esperados 75 preimages de saldo, encontrados %', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.entity_type = 'stock_balance'
    and l.target_table = 'stock_balances'
    and l.target_subkey = 'balance'
    and l.action <> 'deferred'
    and not exists (
      select 1
      from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = l.target_schema
        and i.target_table = l.target_table
        and i.target_key = l.target_key
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % vínculos de saldo sem preimage composto', v_conflicts;
  end if;

  -- Verifica todos os hashes pós-promoção antes da primeira exclusão. --------
  for v_image in
    select * from appsheet_import.promotion_preimages
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
    order by target_table, id
  loop
    if v_image.target_table = 'stock_balances' then
      v_product_id := (v_image.target_key->>'product_id')::uuid;
      v_location_id := (v_image.target_key->>'location_id')::uuid;
      select to_jsonb(sb) into v_current
      from public.stock_balances sb
      where sb.product_id = v_product_id and sb.location_id = v_location_id
      for update;
    elsif v_image.target_table = 'locations' then
      v_target_id := (v_image.target_key->>'id')::uuid;
      select to_jsonb(l) - 'updated_at' into v_current
      from public.locations l
      where l.id = v_target_id
      for update;
    else
      v_target_id := (v_image.target_key->>'id')::uuid;
      execute format(
        'select to_jsonb(t) from %I.%I t where id = $1 for update',
        v_image.target_schema,
        v_image.target_table
      ) into v_current using v_target_id;
    end if;

    if v_current is null then
      raise exception 'Rollback recusado: registro %.% não existe mais (%)',
        v_image.target_schema, v_image.target_table, v_image.target_key;
    end if;

    v_current_sha256 := encode(
      extensions.digest(convert_to(v_current::text, 'UTF8'), 'sha256'),
      'hex'
    );
    if v_current_sha256 is distinct from v_image.after_sha256 then
      raise exception 'Rollback recusado: registro %.% foi alterado após a promoção (%)',
        v_image.target_schema, v_image.target_table, v_image.target_key;
    end if;
  end loop;

  select count(*) into v_conflicts
  from appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_id is not null
    and l.action in ('inserted', 'adjusted')
    and not exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_schema = l.target_schema
        and i.target_table = l.target_table
        and i.target_key = jsonb_build_object('id', l.target_id)
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % vínculos inseridos sem preimage', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.promotion_preimages i
  where i.promotion_run_id = p_promotion_run_id
    and i.target_schema = 'public'
    and i.target_table <> 'stock_balances'
    and (
      select count(*)
      from appsheet_import.entity_links l
      where l.promotion_run_id = i.promotion_run_id
        and l.target_schema = i.target_schema
        and l.target_table = i.target_table
        and l.target_key = i.target_key
        and l.target_id is not null
        and l.action in ('inserted', 'adjusted')
    ) <> 1;
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % preimages sem vínculo público 1:1', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from appsheet_import.promotion_preimages i
  where i.promotion_run_id = p_promotion_run_id
    and i.target_schema = 'public'
    and i.target_table = 'stock_balances'
    and (
      select count(*)
      from appsheet_import.entity_links l
      where l.promotion_run_id = i.promotion_run_id
        and l.target_schema = i.target_schema
        and l.target_table = i.target_table
        and l.target_key = i.target_key
        and l.entity_type = 'stock_balance'
        and l.target_subkey = 'balance'
    ) <> 1;
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % preimages de saldo sem vínculo 1:1', v_conflicts;
  end if;

  -- Dependências criadas depois da promoção também bloqueiam exclusão. -------
  select count(*) into v_conflicts
  from public.sale_items i
  where i.sale_id in (
    select target_id from appsheet_import.entity_links
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'sales'
      and entity_type in ('sale', 'lead')
  )
  and not exists (
    select 1 from appsheet_import.entity_links l
    where l.promotion_run_id = p_promotion_run_id
      and l.target_schema = 'public'
      and l.target_table = 'sale_items' and l.target_id = i.id
  );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % itens de venda posteriores', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from public.inventory_movements m
  where m.sale_id in (
    select target_id from appsheet_import.entity_links
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'sales'
      and entity_type = 'sale'
  );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % movimentos operacionais ligados às vendas', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from public.sales s
  where s.customer_id in (
    select target_id from appsheet_import.entity_links
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'customers'
      and entity_type = 'customer'
  )
  and not exists (
    select 1 from appsheet_import.entity_links l
    where l.promotion_run_id = p_promotion_run_id
      and l.target_schema = 'public'
      and l.target_table = 'sales' and l.target_id = s.id
  );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % vendas posteriores usam clientes importados', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from public.supplier_orders o
  where o.supplier_id in (
    select target_id from appsheet_import.entity_links
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'partners'
      and entity_type = 'partner'
  )
  and not exists (
    select 1 from appsheet_import.entity_links l
    where l.promotion_run_id = p_promotion_run_id
      and l.target_schema = 'public'
      and l.target_table = 'supplier_orders' and l.target_id = o.id
  );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % pedidos posteriores usam parceiros importados', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from public.partner_movements m
  where m.partner_id in (
    select target_id from appsheet_import.entity_links
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'partners'
      and entity_type = 'partner'
  )
  and not exists (
    select 1 from appsheet_import.entity_links l
    where l.promotion_run_id = p_promotion_run_id
      and l.target_schema = 'public'
      and l.target_table = 'partner_movements' and l.target_id = m.id
  );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % movimentos posteriores usam parceiros importados', v_conflicts;
  end if;

  -- A correção BATISTA→ADRIANA e a habilitação de CS não podem ser desfeitas
  -- depois que o local tiver recebido operação nova fora desta promoção.
  select count(*) into v_conflicts
  from public.sales s
  where s.created_at > v_promotion.completed_at
    and s.location_id in (
      select target_id
      from appsheet_import.entity_links
      where promotion_run_id = p_promotion_run_id
        and target_schema = 'public'
        and target_table = 'locations'
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % vendas/leads posteriores usam locais corrigidos', v_conflicts;
  end if;

  select count(*) into v_conflicts
  from public.inventory_movements m
  where m.created_at > v_promotion.completed_at
    and m.location_id in (
      select target_id
      from appsheet_import.entity_links
      where promotion_run_id = p_promotion_run_id
        and target_schema = 'public'
        and target_table = 'locations'
    );
  if v_conflicts <> 0 then
    raise exception 'Rollback recusado: % movimentos posteriores usam locais corrigidos', v_conflicts;
  end if;

  -- Exclusões em ordem reversa de dependências. ------------------------------
  delete from public.deliveries d using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'deliveries' and l.target_id = d.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.payments p using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'payments' and l.target_id = p.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.partner_movements m using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'partner_movements' and l.target_id = m.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.supplier_orders o using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'supplier_orders' and l.target_id = o.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.inventory_history h using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'inventory_history' and l.target_id = h.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.sale_items i using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'sale_items' and l.target_id = i.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages image
      where image.promotion_run_id = l.promotion_run_id
        and image.target_schema = 'public'
        and image.target_table = l.target_table and not image.existed_before
        and image.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.sales s using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'sales' and l.target_id = s.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  -- Excluir o ajuste não desfaz o trigger; os saldos são restaurados abaixo.
  delete from public.inventory_movements m using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'inventory_movements' and l.target_id = m.id
    and l.action = 'adjusted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  for v_image in
    select * from appsheet_import.promotion_preimages
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'stock_balances'
    order by id
  loop
    v_product_id := (v_image.target_key->>'product_id')::uuid;
    v_location_id := (v_image.target_key->>'location_id')::uuid;
    if v_image.existed_before then
      update public.stock_balances
      set quantity = (v_image.before_data->>'quantity')::integer,
          updated_at = (v_image.before_data->>'updated_at')::timestamptz
      where product_id = v_product_id and location_id = v_location_id;
    else
      delete from public.stock_balances
      where product_id = v_product_id and location_id = v_location_id;
    end if;

    select to_jsonb(sb) into v_current
    from public.stock_balances sb
    where sb.product_id = v_product_id and sb.location_id = v_location_id;

    if v_image.existed_before then
      if v_current is null then
        raise exception 'Rollback recusado: saldo anterior não foi restaurado (%)',
          v_image.target_key;
      end if;
      v_current_sha256 := encode(
        extensions.digest(convert_to(v_current::text, 'UTF8'), 'sha256'),
        'hex'
      );
      if v_current_sha256 is distinct from v_image.before_sha256 then
        raise exception 'Rollback recusado: saldo restaurado diverge do preimage (%)',
          v_image.target_key;
      end if;
    elsif v_current is not null then
      raise exception 'Rollback recusado: saldo criado pela promoção ainda existe (%)',
        v_image.target_key;
    end if;
  end loop;

  -- Restaura as três correções de local por projeção canônica. updated_at é
  -- propositalmente excluído: o trigger oficial o recalcula na atualização.
  for v_image in
    select * from appsheet_import.promotion_preimages
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table = 'locations'
    order by id
  loop
    v_target_id := (v_image.target_key->>'id')::uuid;
    update public.locations
    set code = v_image.before_data->>'code',
        name = v_image.before_data->>'name',
        city = v_image.before_data->>'city',
        location_type = v_image.before_data->>'location_type',
        active = (v_image.before_data->>'active')::boolean,
        tracks_inventory = (v_image.before_data->>'tracks_inventory')::boolean
    where id = v_target_id;

    select to_jsonb(l) - 'updated_at' into v_current
    from public.locations l where l.id = v_target_id;
    if v_current is null then
      raise exception 'Rollback recusado: local anterior não foi restaurado (%)', v_image.target_key;
    end if;
    v_current_sha256 := encode(
      extensions.digest(convert_to(v_current::text, 'UTF8'), 'sha256'), 'hex'
    );
    if v_current_sha256 is distinct from v_image.before_sha256 then
      raise exception 'Rollback recusado: local restaurado diverge do preimage (%)', v_image.target_key;
    end if;
  end loop;

  delete from public.customers c using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'customers' and l.target_id = c.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  delete from public.partners p using appsheet_import.entity_links l
  where l.promotion_run_id = p_promotion_run_id
    and l.target_schema = 'public'
    and l.target_table = 'partners' and l.target_id = p.id
    and l.action = 'inserted'
    and exists (
      select 1 from appsheet_import.promotion_preimages i
      where i.promotion_run_id = l.promotion_run_id
        and i.target_schema = 'public'
        and i.target_table = l.target_table and not i.existed_before
        and i.target_key = jsonb_build_object('id', l.target_id)
    );

  -- Nenhuma linha criada pela promoção pode sobreviver ao rollback. ----------
  for v_image in
    select *
    from appsheet_import.promotion_preimages
    where promotion_run_id = p_promotion_run_id
      and target_schema = 'public'
      and target_table not in ('stock_balances', 'locations')
    order by target_table, id
  loop
    v_target_id := (v_image.target_key->>'id')::uuid;
    v_current := null;
    execute format(
      'select to_jsonb(t) from %I.%I t where id = $1',
      v_image.target_schema,
      v_image.target_table
    ) into v_current using v_target_id;

    if v_current is not null then
      raise exception 'Rollback recusado: registro promovido %.% ainda existe (%)',
        v_image.target_schema, v_image.target_table, v_image.target_key;
    end if;
  end loop;

  update appsheet_import.prepared_entities p
  set target_id = null,
      match_status = 'pending',
      approved_for_promotion = false
  where p.import_run_id = v_promotion.import_run_id;

  update appsheet_import.import_runs
  set status = 'validated',
      final_import_approved = false,
      approved_at = null,
      approved_by = null,
      notes = concat_ws(E'\n', notes, 'Promoção revertida: ' || p_reason)
  where id = v_promotion.import_run_id;

  update appsheet_import.promotion_runs
  set status = 'rolled_back',
      rolled_back_at = now(),
      rollback_reason = p_reason
  where id = p_promotion_run_id;

  return p_promotion_run_id;
end;
$$;

revoke all on function appsheet_import.rollback_promotion(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function appsheet_import.rollback_promotion(uuid, uuid, text)
  to service_role;

commit;

-- CHAMADA PROIBIDA NESTA FASE:
-- begin isolation level serializable;
-- set local lock_timeout = '5s';
-- set local statement_timeout = '120s';
-- select appsheet_import.rollback_promotion(
--   '<PROMOTION_RUN_ID>', '<REQUESTED_BY>', '<MOTIVO>'
-- );
-- commit;
