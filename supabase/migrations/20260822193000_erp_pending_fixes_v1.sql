begin;

-- ============================================================================
-- V45.39 · Pendências operacionais 22/08/2026
-- - Parceiro com estoque vira automaticamente um location transferível.
-- - Venda registra "Entregue por" sem misturar com origem do estoque.
-- - Correção logística pode trocar o estoque de uma venda com estorno/rebaixa.
-- - Bank recebe ajuste direto do saldo atual da dívida.
-- - Resolve o falso positivo conhecido do menu mobile fechado no UX Doctor.
-- ============================================================================

-- 1) Parceiro com estoque => ponto físico de estoque automaticamente.
create or replace function public.sync_partner_stock_location_v1()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_location_id uuid;
  v_base_code text;
  v_code text;
  v_suffix integer := 2;
begin
  if coalesce(new.can_hold_stock, false) then
    if new.linked_location_id is null then
      if lower(coalesce(new.name, '')) like '%top tran%'
         or lower(coalesce(new.name, '')) like '%top train%'
      then
        v_base_code := 'TT';
      else
        v_base_code := upper(regexp_replace(coalesce(new.name, ''), '[^A-Za-z0-9]+', '', 'g'));
        v_base_code := left(v_base_code, 12);
        if coalesce(v_base_code, '') = '' then
          v_base_code := 'PARCEIRO';
        end if;
      end if;

      v_code := v_base_code;
      while exists(select 1 from public.locations where code = v_code) loop
        v_code := left(v_base_code, greatest(1, 12 - length(v_suffix::text))) || v_suffix::text;
        v_suffix := v_suffix + 1;
      end loop;

      insert into public.locations(
        code,
        name,
        city,
        location_type,
        active,
        status,
        start_date,
        end_date,
        partnership_model,
        settlement_rule,
        commission_pct,
        notes,
        tracks_inventory,
        counts_for_replenishment,
        reference
      )
      values(
        v_code,
        new.name,
        new.city,
        coalesce(nullif(btrim(new.partner_type), ''), 'Parceiro'),
        coalesce(new.active, true),
        coalesce(nullif(btrim(new.status), ''), 'Ativo'),
        new.start_date,
        new.end_date,
        new.partnership_model,
        new.settlement_rule,
        coalesce(new.commission_pct, 0),
        new.notes,
        coalesce(new.active, true),
        false,
        coalesce(nullif(btrim(new.reference), ''), 'Parceiro')
      )
      returning id into v_location_id;

      -- Dispara uma segunda passagem do trigger já com o vínculo pronto.
      update public.partners
      set linked_location_id = v_location_id,
          updated_at = now()
      where id = new.id;
    else
      update public.locations
      set name = new.name,
          city = new.city,
          location_type = coalesce(nullif(btrim(new.partner_type), ''), location_type),
          active = coalesce(new.active, true),
          status = coalesce(nullif(btrim(new.status), ''), status),
          start_date = new.start_date,
          end_date = new.end_date,
          partnership_model = new.partnership_model,
          settlement_rule = new.settlement_rule,
          commission_pct = coalesce(new.commission_pct, 0),
          notes = new.notes,
          reference = coalesce(nullif(btrim(new.reference), ''), reference),
          tracks_inventory = coalesce(new.active, true),
          updated_at = now()
      where id = new.linked_location_id;
    end if;
  elsif tg_op = 'UPDATE'
        and coalesce(old.can_hold_stock, false)
        and new.linked_location_id is not null
  then
    update public.locations
    set tracks_inventory = false,
        updated_at = now()
    where id = new.linked_location_id;
  end if;

  return new;
end;
$$;

drop trigger if exists partners_sync_stock_location_v1 on public.partners;
create trigger partners_sync_stock_location_v1
after insert or update of
  name,
  partner_type,
  city,
  reference,
  status,
  start_date,
  end_date,
  partnership_model,
  settlement_rule,
  commission_pct,
  active,
  can_hold_stock,
  notes,
  linked_location_id
on public.partners
for each row
execute function public.sync_partner_stock_location_v1();

-- Backfill dos parceiros já marcados como "pode manter estoque" (inclui a Top).
update public.partners
set can_hold_stock = can_hold_stock
where can_hold_stock
  and linked_location_id is null;

-- 2) Separar origem física da venda de quem efetivamente entregou.
alter table public.sales
  add column if not exists delivered_by_partner_id uuid;

alter table public.sales
  add column if not exists delivered_by_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_delivered_by_partner_id_fkey'
  ) then
    alter table public.sales
      add constraint sales_delivered_by_partner_id_fkey
      foreign key (delivered_by_partner_id)
      references public.partners(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists idx_sales_delivered_by_partner_id
  on public.sales(delivered_by_partner_id);

-- 3) Atualiza logística da venda. Trocar o estoque depois da confirmação
--    estorna a baixa do local anterior e reaplica no local correto.
create or replace function public.sale_update_logistics_v1(
  p_sale_id uuid,
  p_location_id uuid default null,
  p_delivered_by_partner_id uuid default null,
  p_delivered_by_text text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_sale public.sales%rowtype;
  v_target_location_id uuid;
  v_change_id uuid := gen_random_uuid();
  v_item record;
  v_res record;
  v_stock_already_deducted boolean;
  v_delivered_text text := nullif(btrim(p_delivered_by_text), '');
  v_allocated integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para corrigir vendas'
      using errcode = '42501';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found or v_sale.record_type <> 'sale' then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    raise exception 'Venda cancelada não pode ter a logística alterada';
  end if;

  v_target_location_id := coalesce(p_location_id, v_sale.location_id);

  if not exists(
    select 1
    from public.locations
    where id = v_target_location_id
      and active
      and tracks_inventory
  ) then
    raise exception 'Estoque de origem inválido ou inativo';
  end if;

  if p_delivered_by_partner_id is not null then
    if not exists(
      select 1
      from public.partners
      where id = p_delivered_by_partner_id
        and active
        and lower(partner_type) <> 'supplier'
    ) then
      raise exception 'Parceiro/ponto de entrega inválido ou inativo';
    end if;

    -- Se escolheu um parceiro, ele prevalece sobre o texto livre.
    v_delivered_text := null;
  end if;

  v_stock_already_deducted :=
    coalesce(v_sale.stock_deducted, false)
    or coalesce(v_sale.delivery_status = 'delivered', false);

  if v_target_location_id <> v_sale.location_id then
    if v_stock_already_deducted then
      -- Tudo acontece na mesma transação. Se faltar estoque no novo local,
      -- o PostgreSQL desfaz também o estorno do local anterior.
      for v_item in
        select id, product_id, flavor_id, quantity
        from public.sale_items
        where sale_id = p_sale_id
        order by created_at, id
      loop
        insert into public.inventory_movements(
          product_id,
          location_id,
          flavor_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_item.product_id,
          v_sale.location_id,
          v_item.flavor_id,
          'cancellation',
          v_item.quantity,
          p_sale_id,
          'Correção logística: estorno da baixa no estoque anterior',
          'app:sale-logistics-v1:' || v_change_id::text || ':restore:' || v_item.id::text
        );

        insert into public.inventory_movements(
          product_id,
          location_id,
          flavor_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_item.product_id,
          v_target_location_id,
          v_item.flavor_id,
          'sale',
          -v_item.quantity,
          p_sale_id,
          'Correção logística: baixa reaplicada no estoque correto',
          'app:sale-logistics-v1:' || v_change_id::text || ':apply:' || v_item.id::text
        );
      end loop;

      if v_sale.gift_product_id is not null
         and coalesce(v_sale.gift_quantity, 0) > 0
      then
        insert into public.inventory_movements(
          product_id,
          location_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_sale.gift_product_id,
          v_sale.location_id,
          'cancellation',
          v_sale.gift_quantity,
          p_sale_id,
          'Correção logística: estorno do brinde no estoque anterior',
          'app:sale-logistics-v1:' || v_change_id::text || ':gift-restore'
        );

        insert into public.inventory_movements(
          product_id,
          location_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_sale.gift_product_id,
          v_target_location_id,
          'sale',
          -v_sale.gift_quantity,
          p_sale_id,
          'Correção logística: brinde baixado no estoque correto',
          'app:sale-logistics-v1:' || v_change_id::text || ':gift-apply'
        );
      end if;
    else
      -- Venda ainda não baixou estoque: move a reserva e recalcula a alocação
      -- no novo local, sem fabricar saldo.
      update public.stock_reservations
      set location_id = v_target_location_id,
          quantity_reserved = 0,
          status = 'awaiting_stock',
          reserved_at = null,
          notes = 'Correção logística · reserva recalculada no novo estoque',
          updated_at = now()
      where sale_id = p_sale_id
        and status in ('reserved', 'partial', 'awaiting_stock');

      for v_res in
        select distinct product_id, flavor_id
        from public.stock_reservations
        where sale_id = p_sale_id
          and location_id = v_target_location_id
          and status in ('reserved', 'partial', 'awaiting_stock')
      loop
        v_allocated := v_allocated + public.allocate_available_stock_v2(
          v_res.product_id,
          v_target_location_id,
          v_res.flavor_id,
          'Correção logística da venda'
        );
      end loop;
    end if;

    update public.sales_quotes
    set location_id = v_target_location_id,
        updated_at = now()
    where sale_id = p_sale_id;
  end if;

  update public.sales
  set location_id = v_target_location_id,
      delivered_by_partner_id = p_delivered_by_partner_id,
      delivered_by_text = v_delivered_text,
      updated_at = now()
  where id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values(
    'sale',
    p_sale_id,
    'logistics_updated_v1',
    jsonb_build_object(
      'change_id', v_change_id,
      'previous_location_id', v_sale.location_id,
      'new_location_id', v_target_location_id,
      'stock_already_deducted', v_stock_already_deducted,
      'delivered_by_partner_id', p_delivered_by_partner_id,
      'delivered_by_text', v_delivered_text,
      'reservations_allocated', v_allocated,
      'reason', nullif(btrim(p_reason), '')
    )
  );

  return jsonb_build_object(
    'sale_id', p_sale_id,
    'previous_location_id', v_sale.location_id,
    'location_id', v_target_location_id,
    'delivered_by_partner_id', p_delivered_by_partner_id,
    'delivered_by_text', v_delivered_text,
    'stock_moved', v_target_location_id <> v_sale.location_id and v_stock_already_deducted,
    'reservations_allocated', v_allocated
  );
end;
$$;

grant execute on function public.sale_update_logistics_v1(uuid,uuid,uuid,text,text) to authenticated;

-- 4) Bank: informar diretamente "quanto devo hoje" sem apagar pagamentos antigos.
create or replace function public.bank_set_debt_current_balance(
  p_debt_id uuid,
  p_current_balance numeric,
  p_balance_on date default null,
  p_notes text default null
)
returns public.bank_debts
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_debt public.bank_debts%rowtype;
  v_old_remaining numeric(14,2);
  v_new_balance numeric(14,2);
  v_old_original numeric(14,2);
  v_balance_on date := coalesce(
    p_balance_on,
    (now() at time zone 'America/Sao_Paulo')::date
  );
  v_note text;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode = '42501';
  end if;

  if p_current_balance is null or p_current_balance < 0 then
    raise exception 'Informe um saldo atual válido';
  end if;

  v_new_balance := round(p_current_balance::numeric, 2);

  select * into v_debt
  from public.bank_debts
  where id = p_debt_id
  for update;

  if not found then
    raise exception 'Dívida não encontrada';
  end if;

  v_old_original := v_debt.original_amount;
  v_old_remaining := greatest(
    coalesce(v_debt.original_amount, 0) - coalesce(v_debt.total_paid, 0),
    0
  );

  v_note := concat_ws(
    ' | ',
    'Saldo do dia ' || to_char(v_balance_on, 'DD/MM/YYYY') ||
      ': ' || v_old_remaining::text || ' → ' || v_new_balance::text,
    nullif(btrim(p_notes), '')
  );

  update public.bank_debts
  set original_amount = coalesce(total_paid, 0) + v_new_balance,
      status = case when v_new_balance = 0 then 'paid' else 'active' end,
      next_due_date = case when v_new_balance = 0 then null else next_due_date end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id,
    due_date,
    action_type,
    amount,
    paid_on,
    previous_due_date,
    new_due_date,
    payment_account_id,
    notes,
    created_by
  )
  values(
    p_debt_id,
    v_balance_on,
    'adjustment',
    0,
    null,
    null,
    v_debt.next_due_date,
    null,
    v_note,
    auth.uid()
  );

  insert into public.audit_events(entity_type, entity_id, action, details)
  values(
    'bank_debt',
    p_debt_id,
    'current_balance_set_v1',
    jsonb_build_object(
      'balance_on', v_balance_on,
      'previous_original_amount', v_old_original,
      'previous_remaining_amount', v_old_remaining,
      'new_remaining_amount', v_new_balance,
      'preserved_total_paid', coalesce(v_debt.total_paid, 0),
      'notes', nullif(btrim(p_notes), '')
    )
  );

  return v_debt;
end;
$$;

grant execute on function public.bank_set_debt_current_balance(uuid,numeric,date,text) to authenticated;

-- 5) O sinal conhecido era o painel do <details> fechado, deslocado para fora da tela.
--    O CSS do pacote deixa o painel realmente fora da árvore visual quando fechado.
update public.ux_health_signals
set status = 'resolved',
    resolved_at = now(),
    resolution_note = 'Corrigido em V45.39: painel mobile fechado passa a display:none; falso positivo anterior encerrado.'
where fingerprint = '84c9983699ca5da56da4b77d8d9630a5'
  and route = '/suplementos/produtos'
  and signal_type = 'fixed_clip'
  and status = 'active';

commit;
