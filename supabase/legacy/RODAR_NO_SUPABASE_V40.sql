-- Candinho Company · Bank V40 · Nexus Bank
-- Um único SQL cumulativo:
-- 1) preserva a correção V39.5 dos adiamentos antigos do Ian (idempotente);
-- 2) cria auditoria do Nexus Bank;
-- 3) cria aplicação segura e desfazer.
--
-- A IA NÃO escreve diretamente no banco.
-- Ela só produz uma prévia. A escrita acontece somente após o usuário
-- clicar em "Confirmar tudo", chamando bank_nexus_apply_batch.

begin;

-- ============================================================
-- V39.5 · Histórico antigo do Ian: meses vermelhos = ADIADO.
-- ============================================================
with target as (
  select id
  from public.bank_debts
  where lower(name) = lower('Empréstimo Ian')
    and debt_type = 'loan'
  order by created_at
  limit 1
),
postponed_months(due_date) as (
  values
    (date '2025-03-01'),
    (date '2025-04-01'),
    (date '2025-08-01'),
    (date '2025-10-01'),
    (date '2025-12-01'),
    (date '2026-03-01'),
    (date '2026-04-01'),
    (date '2026-05-01'),
    (date '2026-06-01')
)
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
select
  target.id,
  postponed_months.due_date,
  'postponed',
  0,
  null,
  postponed_months.due_date,
  (postponed_months.due_date + interval '1 month')::date,
  null,
  'V39.5 · Mês adiado no sistema anterior; parcela empurrada um mês para frente.',
  null
from target
cross join postponed_months
where not exists (
  select 1
  from public.bank_debt_payments existing
  where existing.debt_id = target.id
    and existing.action_type = 'postponed'
    and date_trunc('month', existing.due_date)::date =
        postponed_months.due_date
);

-- ============================================================
-- V40 · Auditoria.
-- ============================================================
create table if not exists public.bank_nexus_batches (
  id uuid primary key default gen_random_uuid(),
  user_message text not null,
  assistant_summary text,
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'applied'
    check (status in ('applied','undone')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  undone_at timestamptz
);

create table if not exists public.bank_nexus_changes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null
    references public.bank_nexus_batches(id)
    on delete cascade,
  action_index integer not null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(batch_id, action_index)
);

alter table public.bank_nexus_batches enable row level security;
alter table public.bank_nexus_changes enable row level security;

drop policy if exists bank_nexus_batches_select on public.bank_nexus_batches;
create policy bank_nexus_batches_select
on public.bank_nexus_batches
for select
to authenticated
using (
  public.can_access_bank()
  and created_by = auth.uid()
);

drop policy if exists bank_nexus_changes_select on public.bank_nexus_changes;
create policy bank_nexus_changes_select
on public.bank_nexus_changes
for select
to authenticated
using (
  public.can_access_bank()
  and exists (
    select 1
    from public.bank_nexus_batches b
    where b.id = bank_nexus_changes.batch_id
      and b.created_by = auth.uid()
  )
);

grant select on public.bank_nexus_batches to authenticated, service_role;
grant select on public.bank_nexus_changes to authenticated, service_role;

revoke insert, update, delete
on public.bank_nexus_batches
from public, anon, authenticated;

revoke insert, update, delete
on public.bank_nexus_changes
from public, anon, authenticated;

-- ============================================================
-- V40 · Aplicação atômica do plano confirmado.
-- ============================================================
create or replace function public.bank_nexus_apply_batch(
  p_user_message text,
  p_assistant_summary text,
  p_actions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_batch_id uuid;
  v_item record;
  v_action jsonb;
  v_index integer;
  v_type text;
  v_entity_id uuid;
  v_prev jsonb;
  v_new jsonb;
  v_meta jsonb;
  v_reference_month date;
  v_action_date date;
  v_amount numeric(14,2);
  v_source_amount numeric(14,2);
  v_old_due date;
  v_new_due date;
  v_payment_id uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_existing_status text;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.'
      using errcode='42501';
  end if;

  if not public.can_write_bank() then
    raise exception 'Sem permissão para alterar dados da Candinho Bank.'
      using errcode='42501';
  end if;

  if nullif(btrim(p_user_message),'') is null then
    raise exception 'Mensagem do Nexus inválida.';
  end if;

  if p_actions is null
     or jsonb_typeof(p_actions) <> 'array'
     or jsonb_array_length(p_actions) = 0
     or jsonb_array_length(p_actions) > 30
  then
    raise exception 'Plano do Nexus vazio ou inválido.';
  end if;

  insert into public.bank_nexus_batches(
    user_message,
    assistant_summary,
    actions,
    status,
    created_by,
    applied_at
  )
  values(
    p_user_message,
    nullif(btrim(p_assistant_summary),''),
    p_actions,
    'applied',
    v_user,
    now()
  )
  returning id into v_batch_id;

  for v_item in
    select value, ordinality
    from jsonb_array_elements(p_actions)
      with ordinality as x(value, ordinality)
  loop
    v_action := v_item.value;
    v_index := v_item.ordinality::integer;
    v_type := nullif(btrim(v_action->>'type'),'');
    v_entity_id := null;
    v_prev := null;
    v_new := null;
    v_meta := '{}'::jsonb;
    v_reference_month := null;
    v_action_date := null;
    v_amount := null;
    v_source_amount := null;
    v_old_due := null;
    v_new_due := null;
    v_payment_id := null;
    v_existing_status := null;

    begin
      v_entity_id := nullif(v_action->>'entity_id','')::uuid;
    exception when others then
      raise exception 'Ação % possui entidade inválida.', v_index;
    end;

    if v_entity_id is null then
      raise exception 'Ação % não possui entidade.', v_index;
    end if;

    if nullif(v_action->>'reference_month','') is not null then
      begin
        v_reference_month := (v_action->>'reference_month')::date;
      exception when others then
        raise exception 'Ação % possui mês inválido.', v_index;
      end;
    end if;

    if nullif(v_action->>'date','') is not null then
      begin
        v_action_date := (v_action->>'date')::date;
      exception when others then
        raise exception 'Ação % possui data inválida.', v_index;
      end;
    end if;

    if nullif(v_action->>'amount','') is not null then
      begin
        v_amount := round((v_action->>'amount')::numeric,2);
      exception when others then
        raise exception 'Ação % possui valor inválido.', v_index;
      end;
    end if;

    if v_type = 'set_card_invoice' then
      if not exists (
        select 1
        from public.bank_cards
        where id=v_entity_id
          and is_active=true
      ) then
        raise exception 'Cartão da ação % não foi encontrado.', v_index;
      end if;

      if v_reference_month is null then
        v_reference_month :=
          date_trunc('month',v_today)::date;
      end if;

      if v_reference_month <>
         date_trunc('month',v_reference_month)::date
      then
        raise exception 'Mês da fatura precisa ser o primeiro dia do mês.';
      end if;

      if v_amount is null or v_amount < 0 then
        raise exception 'Valor de fatura inválido.';
      end if;

      select to_jsonb(i), i.status
      into v_prev, v_existing_status
      from public.bank_card_invoices i
      where i.card_id=v_entity_id
        and i.reference_month=v_reference_month;

      if v_existing_status in ('paid','cancelled') then
        raise exception
          'A fatura % já está paga/cancelada e não pode ser alterada pelo Nexus.',
          v_reference_month;
      end if;

      insert into public.bank_card_invoices(
        card_id,
        reference_month,
        amount,
        includes_recurring,
        created_by,
        updated_by
      )
      values(
        v_entity_id,
        v_reference_month,
        v_amount,
        true,
        v_user,
        v_user
      )
      on conflict (card_id,reference_month)
      do update
      set amount=excluded.amount,
          includes_recurring=true,
          updated_by=v_user,
          updated_at=now();

      select to_jsonb(i)
      into v_new
      from public.bank_card_invoices i
      where i.card_id=v_entity_id
        and i.reference_month=v_reference_month;

      v_meta := jsonb_build_object(
        'reference_month',v_reference_month
      );

    elsif v_type = 'set_account_balance' then
      if not exists (
        select 1
        from public.bank_accounts
        where id=v_entity_id
          and is_active=true
      ) then
        raise exception 'Conta da ação % não foi encontrada.', v_index;
      end if;

      if v_amount is null then
        raise exception 'Saldo da conta não foi informado.';
      end if;

      v_action_date := coalesce(v_action_date,v_today);

      select to_jsonb(s)
      into v_prev
      from public.bank_balance_snapshots s
      where s.account_id=v_entity_id
        and s.balance_date=v_action_date;

      insert into public.bank_balance_snapshots(
        account_id,
        balance_date,
        balance,
        notes,
        created_by
      )
      values(
        v_entity_id,
        v_action_date,
        v_amount,
        'Nexus Bank · atualização confirmada pelo usuário.',
        v_user
      )
      on conflict (account_id,balance_date)
      do update
      set balance=excluded.balance,
          notes=excluded.notes,
          created_by=v_user;

      select to_jsonb(s)
      into v_new
      from public.bank_balance_snapshots s
      where s.account_id=v_entity_id
        and s.balance_date=v_action_date;

      v_meta := jsonb_build_object(
        'balance_date',v_action_date
      );

    elsif v_type = 'mark_income_received' then
      select amount
      into v_source_amount
      from public.bank_income_sources
      where id=v_entity_id
        and is_active=true;

      if not found then
        raise exception 'Entrada fixa da ação % não foi encontrada.', v_index;
      end if;

      v_reference_month := coalesce(
        v_reference_month,
        date_trunc('month',v_today)::date
      );

      if v_reference_month <>
         date_trunc('month',v_reference_month)::date
      then
        raise exception 'Mês da entrada recebida é inválido.';
      end if;

      v_action_date := coalesce(v_action_date,v_today);
      v_amount := coalesce(v_amount,v_source_amount);

      if v_amount < 0 then
        raise exception 'Valor recebido inválido.';
      end if;

      select to_jsonb(r)
      into v_prev
      from public.bank_income_source_receipts r
      where r.source_id=v_entity_id
        and r.reference_month=v_reference_month;

      perform public.bank_mark_income_source_received(
        v_entity_id,
        v_reference_month,
        v_action_date,
        v_amount,
        'Nexus Bank · recebimento confirmado pelo usuário.'
      );

      select to_jsonb(r)
      into v_new
      from public.bank_income_source_receipts r
      where r.source_id=v_entity_id
        and r.reference_month=v_reference_month;

      v_meta := jsonb_build_object(
        'reference_month',v_reference_month
      );

    elsif v_type = 'mark_income_pending' then
      if not exists (
        select 1
        from public.bank_income_sources
        where id=v_entity_id
          and is_active=true
      ) then
        raise exception 'Entrada fixa da ação % não foi encontrada.', v_index;
      end if;

      v_reference_month := coalesce(
        v_reference_month,
        date_trunc('month',v_today)::date
      );

      select to_jsonb(r)
      into v_prev
      from public.bank_income_source_receipts r
      where r.source_id=v_entity_id
        and r.reference_month=v_reference_month;

      delete from public.bank_income_source_receipts
      where source_id=v_entity_id
        and reference_month=v_reference_month;

      v_new := null;

      v_meta := jsonb_build_object(
        'reference_month',v_reference_month
      );

    elsif v_type = 'postpone_debt' then
      select to_jsonb(d), d.next_due_date
      into v_prev, v_old_due
      from public.bank_debts d
      where d.id=v_entity_id
        and d.status not in ('paid','cancelled')
      for update;

      if v_prev is null then
        raise exception 'Empréstimo da ação % não foi encontrado.', v_index;
      end if;

      if v_old_due is null then
        raise exception 'Empréstimo não possui próxima parcela definida.';
      end if;

      v_new_due := (v_old_due + interval '1 month')::date;

      update public.bank_debts
      set next_due_date=v_new_due,
          status='active',
          updated_by=v_user,
          updated_at=now()
      where id=v_entity_id;

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
        v_entity_id,
        v_old_due,
        'postponed',
        0,
        null,
        v_old_due,
        v_new_due,
        null,
        'Nexus Bank · parcela adiada após confirmação do usuário.',
        v_user
      )
      returning id into v_payment_id;

      select to_jsonb(d)
      into v_new
      from public.bank_debts d
      where d.id=v_entity_id;

      v_meta := jsonb_build_object(
        'payment_id',v_payment_id,
        'old_due',v_old_due,
        'new_due',v_new_due
      );

    elsif v_type = 'set_subscription_amount' then
      if v_amount is null or v_amount <= 0 then
        raise exception 'Valor da mensalidade precisa ser maior que zero.';
      end if;

      select to_jsonb(s)
      into v_prev
      from public.bank_subscriptions s
      where s.id=v_entity_id;

      if v_prev is null then
        raise exception 'Mensalidade da ação % não foi encontrada.', v_index;
      end if;

      update public.bank_subscriptions
      set amount=v_amount,
          updated_by=v_user,
          updated_at=now()
      where id=v_entity_id;

      select to_jsonb(s)
      into v_new
      from public.bank_subscriptions s
      where s.id=v_entity_id;

    elsif v_type = 'set_income_default_amount' then
      if v_amount is null or v_amount <= 0 then
        raise exception 'Valor padrão da entrada precisa ser maior que zero.';
      end if;

      select to_jsonb(s)
      into v_prev
      from public.bank_income_sources s
      where s.id=v_entity_id;

      if v_prev is null then
        raise exception 'Entrada fixa da ação % não foi encontrada.', v_index;
      end if;

      update public.bank_income_sources
      set amount=v_amount,
          updated_by=v_user,
          updated_at=now()
      where id=v_entity_id;

      select to_jsonb(s)
      into v_new
      from public.bank_income_sources s
      where s.id=v_entity_id;

    else
      raise exception 'Tipo de ação não permitido: %', coalesce(v_type,'vazio');
    end if;

    insert into public.bank_nexus_changes(
      batch_id,
      action_index,
      action_type,
      entity_type,
      entity_id,
      previous_state,
      new_state,
      metadata
    )
    values(
      v_batch_id,
      v_index,
      v_type,
      case
        when v_type='set_card_invoice' then 'card_invoice'
        when v_type='set_account_balance' then 'account_balance'
        when v_type in ('mark_income_received','mark_income_pending')
          then 'income_receipt'
        when v_type='postpone_debt' then 'debt'
        when v_type='set_subscription_amount' then 'subscription'
        when v_type='set_income_default_amount' then 'income_source'
        else 'unknown'
      end,
      v_entity_id,
      v_prev,
      v_new,
      coalesce(v_meta,'{}'::jsonb)
    );
  end loop;

  return v_batch_id;
exception
  when others then
    raise;
end;
$$;

-- ============================================================
-- V40 · Desfazer (em ordem inversa).
-- Só permite desfazer o batch aplicado mais recente do próprio usuário.
-- ============================================================
create or replace function public.bank_nexus_undo_batch(
  p_batch_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_batch public.bank_nexus_batches;
  v_change public.bank_nexus_changes;
  v_month date;
  v_action_date date;
  v_payment_id uuid;
  v_current_status text;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.'
      using errcode='42501';
  end if;

  if not public.can_write_bank() then
    raise exception 'Sem permissão para alterar dados da Candinho Bank.'
      using errcode='42501';
  end if;

  select *
  into v_batch
  from public.bank_nexus_batches
  where id=p_batch_id
    and created_by=v_user
  for update;

  if v_batch.id is null then
    raise exception 'Atualização do Nexus não encontrada.';
  end if;

  if v_batch.status <> 'applied' then
    raise exception 'Essa atualização já foi desfeita.';
  end if;

  if exists (
    select 1
    from public.bank_nexus_batches b
    where b.created_by=v_user
      and b.status='applied'
      and b.created_at>v_batch.created_at
  ) then
    raise exception
      'Existe uma atualização mais recente. Desfaça a mais recente primeiro.';
  end if;

  for v_change in
    select *
    from public.bank_nexus_changes
    where batch_id=p_batch_id
    order by action_index desc
  loop
    if v_change.action_type='set_card_invoice' then
      v_month := (v_change.metadata->>'reference_month')::date;

      select status
      into v_current_status
      from public.bank_card_invoices
      where card_id=v_change.entity_id
        and reference_month=v_month;

      if v_current_status='paid' then
        raise exception
          'Uma fatura desta atualização já foi marcada como paga. Não é seguro desfazer automaticamente.';
      end if;

      if v_change.previous_state is null then
        delete from public.bank_card_invoices
        where card_id=v_change.entity_id
          and reference_month=v_month;
      else
        update public.bank_card_invoices
        set amount=(v_change.previous_state->>'amount')::numeric,
            status=coalesce(v_change.previous_state->>'status','planned'),
            paid_on=nullif(v_change.previous_state->>'paid_on','')::date,
            notes=v_change.previous_state->>'notes',
            includes_recurring=
              coalesce((v_change.previous_state->>'includes_recurring')::boolean,true),
            updated_by=v_user,
            updated_at=now()
        where card_id=v_change.entity_id
          and reference_month=v_month;
      end if;

    elsif v_change.action_type='set_account_balance' then
      v_action_date := (v_change.metadata->>'balance_date')::date;

      if v_change.previous_state is null then
        delete from public.bank_balance_snapshots
        where account_id=v_change.entity_id
          and balance_date=v_action_date;
      else
        update public.bank_balance_snapshots
        set balance=(v_change.previous_state->>'balance')::numeric,
            notes=v_change.previous_state->>'notes',
            created_by=(v_change.previous_state->>'created_by')::uuid
        where account_id=v_change.entity_id
          and balance_date=v_action_date;
      end if;

    elsif v_change.action_type='mark_income_received' then
      v_month := (v_change.metadata->>'reference_month')::date;

      if v_change.previous_state is null then
        delete from public.bank_income_source_receipts
        where source_id=v_change.entity_id
          and reference_month=v_month;
      else
        insert into public.bank_income_source_receipts(
          id,
          source_id,
          reference_month,
          received_on,
          amount,
          notes,
          created_by,
          created_at,
          updated_at
        )
        values(
          (v_change.previous_state->>'id')::uuid,
          v_change.entity_id,
          v_month,
          (v_change.previous_state->>'received_on')::date,
          (v_change.previous_state->>'amount')::numeric,
          v_change.previous_state->>'notes',
          nullif(v_change.previous_state->>'created_by','')::uuid,
          (v_change.previous_state->>'created_at')::timestamptz,
          now()
        )
        on conflict (source_id,reference_month)
        do update
        set received_on=excluded.received_on,
            amount=excluded.amount,
            notes=excluded.notes,
            updated_at=now();
      end if;

    elsif v_change.action_type='mark_income_pending' then
      v_month := (v_change.metadata->>'reference_month')::date;

      if v_change.previous_state is not null then
        insert into public.bank_income_source_receipts(
          id,
          source_id,
          reference_month,
          received_on,
          amount,
          notes,
          created_by,
          created_at,
          updated_at
        )
        values(
          (v_change.previous_state->>'id')::uuid,
          v_change.entity_id,
          v_month,
          (v_change.previous_state->>'received_on')::date,
          (v_change.previous_state->>'amount')::numeric,
          v_change.previous_state->>'notes',
          nullif(v_change.previous_state->>'created_by','')::uuid,
          (v_change.previous_state->>'created_at')::timestamptz,
          now()
        )
        on conflict (source_id,reference_month)
        do update
        set received_on=excluded.received_on,
            amount=excluded.amount,
            notes=excluded.notes,
            updated_at=now();
      end if;

    elsif v_change.action_type='postpone_debt' then
      if v_change.previous_state is null then
        raise exception 'Histórico anterior do empréstimo não foi encontrado.';
      end if;

      update public.bank_debts
      set next_due_date=nullif(v_change.previous_state->>'next_due_date','')::date,
          due_day=nullif(v_change.previous_state->>'due_day','')::integer,
          status=coalesce(v_change.previous_state->>'status','active'),
          updated_by=v_user,
          updated_at=now()
      where id=v_change.entity_id;

      if nullif(v_change.metadata->>'payment_id','') is not null then
        v_payment_id := (v_change.metadata->>'payment_id')::uuid;

        delete from public.bank_debt_payments
        where id=v_payment_id
          and debt_id=v_change.entity_id
          and action_type='postponed';
      end if;

    elsif v_change.action_type='set_subscription_amount' then
      if v_change.previous_state is not null then
        update public.bank_subscriptions
        set amount=(v_change.previous_state->>'amount')::numeric,
            updated_by=v_user,
            updated_at=now()
        where id=v_change.entity_id;
      end if;

    elsif v_change.action_type='set_income_default_amount' then
      if v_change.previous_state is not null then
        update public.bank_income_sources
        set amount=(v_change.previous_state->>'amount')::numeric,
            updated_by=v_user,
            updated_at=now()
        where id=v_change.entity_id;
      end if;
    end if;
  end loop;

  update public.bank_nexus_batches
  set status='undone',
      undone_at=now()
  where id=p_batch_id;

  return true;
end;
$$;

revoke all on function public.bank_nexus_apply_batch(text,text,jsonb)
from public, anon;

grant execute on function public.bank_nexus_apply_batch(text,text,jsonb)
to authenticated, service_role;

revoke all on function public.bank_nexus_undo_batch(uuid)
from public, anon;

grant execute on function public.bank_nexus_undo_batch(uuid)
to authenticated, service_role;

commit;

-- Conferência rápida.
select
  'Nexus Bank V40 pronto' as status,
  to_regclass('public.bank_nexus_batches') is not null as auditoria_criada,
  to_regprocedure('public.bank_nexus_apply_batch(text,text,jsonb)') is not null
    as aplicar_criado,
  to_regprocedure('public.bank_nexus_undo_batch(uuid)') is not null
    as desfazer_criado;
