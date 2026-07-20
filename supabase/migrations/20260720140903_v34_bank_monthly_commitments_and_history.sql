begin;

alter table public.bank_subscriptions
  add column if not exists due_mode text not null default 'fixed_day';

alter table public.bank_debts
  add column if not exists due_mode text not null default 'fixed_day';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.bank_subscriptions'::regclass
      and conname='bank_subscriptions_due_mode_check'
  ) then
    alter table public.bank_subscriptions
      add constraint bank_subscriptions_due_mode_check
      check (due_mode in ('fixed_day','month_only'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.bank_debts'::regclass
      and conname='bank_debts_due_mode_check'
  ) then
    alter table public.bank_debts
      add constraint bank_debts_due_mode_check
      check (due_mode in ('fixed_day','month_only'));
  end if;
end$$;

update public.bank_subscriptions
set due_mode='month_only',
    billing_day=null,
    updated_at=now()
where lower(name)=lower('Psicóloga da Giulia')
  and amount=400
  and billing_cycle='monthly';

update public.bank_debts
set due_mode='month_only',
    due_day=null,
    updated_at=now()
where lower(name)=lower('Notinha na loja da Graça')
  and debt_type='note';

insert into public.bank_month_commitment_resolutions(
  commitment_key,
  reference_month,
  resolution,
  resolved_on,
  notes,
  created_by,
  updated_at
)
select
  'subscription:'||s.id::text,
  date '2026-07-01',
  'paid',
  current_date,
  'Pagamento de julho confirmado pelo usuário durante revisão operacional V34.',
  null,
  now()
from public.bank_subscriptions s
where lower(s.name)=lower('CNPJ')
  and s.amount=85
  and s.billing_cycle='monthly'
on conflict (commitment_key,reference_month)
do update
set resolution='paid',
    resolved_on=excluded.resolved_on,
    notes=excluded.notes,
    updated_at=now();

insert into public.bank_month_commitment_resolutions(
  commitment_key,
  reference_month,
  resolution,
  resolved_on,
  notes,
  created_by,
  updated_at
)
select
  'subscription:'||s.id::text,
  date '2026-07-01',
  'paid',
  current_date,
  'Pagamento de julho confirmado antecipadamente pelo usuário durante revisão operacional V34.',
  null,
  now()
from public.bank_subscriptions s
where lower(s.name)=lower('Água')
  and s.amount=70
  and s.billing_cycle='monthly'
on conflict (commitment_key,reference_month)
do update
set resolution='paid',
    resolved_on=excluded.resolved_on,
    notes=excluded.notes,
    updated_at=now();

insert into public.bank_month_commitment_resolutions(
  commitment_key,
  reference_month,
  resolution,
  resolved_on,
  notes,
  created_by,
  updated_at
)
select
  'debt:'||d.id::text,
  date '2026-07-01',
  'paid',
  current_date,
  'Pagamento mensal de julho confirmado pelo usuário durante revisão operacional V34.',
  null,
  now()
from public.bank_debts d
where lower(d.name)=lower('Notinha na loja da Graça')
  and d.debt_type='note'
on conflict (commitment_key,reference_month)
do update
set resolution='paid',
    resolved_on=excluded.resolved_on,
    notes=excluded.notes,
    updated_at=now();

do $$
declare
  v_id uuid;
  v_monthly numeric(14,2);
  v_original numeric(14,2);
  v_paid numeric(14,2);
begin
  select
    id,
    monthly_amount,
    original_amount,
    total_paid
  into
    v_id,
    v_monthly,
    v_original,
    v_paid
  from public.bank_debts
  where lower(name)=lower('Notinha na loja da Graça')
    and debt_type='note'
  order by created_at
  limit 1
  for update;

  if v_id is not null
     and coalesce(v_paid,0)=0
     and coalesce(v_monthly,0)>0
  then
    update public.bank_debts
    set total_paid=least(v_original,v_monthly),
        next_due_date=date '2026-08-01',
        due_day=null,
        due_mode='month_only',
        status=case
          when v_monthly>=v_original then 'paid'
          else 'active'
        end,
        updated_at=now()
    where id=v_id;

    if not exists (
      select 1
      from public.bank_debt_payments
      where debt_id=v_id
        and action_type='adjustment'
        and notes='V34 · Acerto inicial: parcela de julho já paga antes da conciliação do histórico.'
    ) then
      insert into public.bank_debt_payments(
        debt_id,
        due_date,
        action_type,
        amount,
        paid_on,
        previous_due_date,
        new_due_date,
        notes,
        created_by
      )
      values(
        v_id,
        date '2026-07-01',
        'adjustment',
        0,
        null,
        null,
        date '2026-08-01',
        'V34 · Acerto inicial: parcela de julho já paga antes da conciliação do histórico.',
        null
      );
    end if;
  end if;
end$$;

create or replace view public.bank_debts_overview as
select
  d.id,
  d.name,
  d.debt_type,
  d.creditor_name,
  d.original_amount,
  d.monthly_amount,
  d.total_paid,
  d.start_date,
  d.next_due_date,
  d.due_day,
  d.interest_free,
  d.origin,
  d.status,
  d.notes,
  d.created_by,
  d.updated_by,
  d.created_at,
  d.updated_at,
  greatest(d.original_amount-d.total_paid,0)::numeric(14,2) as remaining_amount,
  case
    when d.status='cancelled' then 'cancelled'
    when d.total_paid>=d.original_amount then 'paid'
    when d.status='paused' then 'paused'
    when d.due_mode='month_only'
      and d.next_due_date is not null
      and date_trunc('month',d.next_due_date)::date
          < date_trunc('month',current_date)::date
      then 'overdue'
    when d.due_mode='fixed_day'
      and d.next_due_date is not null
      and d.next_due_date<current_date
      then 'overdue'
    else 'active'
  end as effective_status,
  d.due_mode
from public.bank_debts d;

grant select on public.bank_debts_overview
to authenticated,service_role;

revoke all on public.bank_debts_overview
from anon;

create or replace function public.bank_subscription_monthly_projection(
  p_reference_month date
)
returns table(
  subscription_id uuid,
  name text,
  amount numeric,
  billing_date date,
  origin text,
  category text,
  projection_mode text,
  payment_method_type text,
  card_id uuid,
  account_id uuid
)
language sql
stable
set search_path=public
as $$
  select
    s.id,
    s.name,
    s.amount,
    case
      when s.due_mode='month_only'
        then null::date
      else make_date(
        extract(year from p_reference_month)::int,
        extract(month from p_reference_month)::int,
        least(
          coalesce(s.billing_day,1),
          extract(
            day from (
              date_trunc('month',p_reference_month)
              +interval '1 month - 1 day'
            )
          )::int
        )
      )
    end as billing_date,
    s.origin,
    s.category,
    s.projection_mode,
    s.payment_method_type,
    s.card_id,
    s.account_id
  from public.bank_subscriptions s
  where public.can_access_bank()
    and s.is_active=true
    and s.include_in_projection=true
    and s.billing_cycle='monthly'
    and (
      s.starts_on is null
      or s.starts_on<=(
        date_trunc('month',p_reference_month)
        +interval '1 month - 1 day'
      )::date
    )
    and (
      s.ends_on is null
      or s.ends_on>=date_trunc('month',p_reference_month)::date
    );
$$;

create or replace function public.bank_mark_invoice_paid(
  p_invoice_id uuid,
  p_paid_on date default current_date
)
returns public.bank_card_invoices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_invoice public.bank_card_invoices;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  update public.bank_card_invoices
  set status='paid',
      paid_on=coalesce(p_paid_on,current_date),
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_invoice_id
    and status<>'cancelled'
  returning * into v_invoice;

  if v_invoice.id is null then
    raise exception 'Fatura não encontrada ou cancelada';
  end if;

  return v_invoice;
end;
$$;

revoke all
on function public.bank_mark_invoice_paid(uuid,date)
from public,anon;

grant execute
on function public.bank_mark_invoice_paid(uuid,date)
to authenticated,service_role;

create or replace function public.bank_adjust_debt_history(
  p_debt_id uuid,
  p_total_paid numeric,
  p_next_reference_date date,
  p_due_mode text default 'fixed_day',
  p_notes text default null
)
returns public.bank_debts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_debt public.bank_debts;
  v_mode text:=lower(
    coalesce(
      nullif(btrim(p_due_mode),''),
      'fixed_day'
    )
  );
  v_previous_paid numeric(14,2);
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  select *
  into v_debt
  from public.bank_debts
  where id=p_debt_id
  for update;

  if v_debt.id is null then
    raise exception 'Dívida não encontrada';
  end if;

  if v_mode not in ('fixed_day','month_only') then
    raise exception 'Modo de vencimento inválido';
  end if;

  if p_total_paid is null
     or p_total_paid<0
     or p_total_paid>v_debt.original_amount
  then
    raise exception 'Total já pago inválido';
  end if;

  if p_total_paid<v_debt.total_paid then
    raise exception
      'O acerto histórico não pode reduzir o total já pago. Corrija manualmente somente com auditoria.';
  end if;

  if p_total_paid<v_debt.original_amount
     and p_next_reference_date is null
  then
    raise exception
      'Informe o próximo mês/data de referência enquanto houver saldo restante';
  end if;

  if v_mode='month_only'
     and p_next_reference_date is not null
     and p_next_reference_date<>date_trunc('month',p_next_reference_date)::date
  then
    raise exception
      'Para pendência mensal sem dia fixo, informe o primeiro dia do mês como referência interna';
  end if;

  v_previous_paid:=v_debt.total_paid;

  update public.bank_debts
  set total_paid=p_total_paid,
      next_due_date=case
        when p_total_paid>=original_amount then null
        else p_next_reference_date
      end,
      due_day=case
        when p_total_paid>=original_amount then null
        when v_mode='month_only' then null
        when p_next_reference_date is null then due_day
        else extract(day from p_next_reference_date)::integer
      end,
      due_mode=v_mode,
      status=case
        when p_total_paid>=original_amount then 'paid'
        else 'active'
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_debt_id
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
    p_next_reference_date,
    'adjustment',
    0,
    null,
    null,
    v_debt.next_due_date,
    null,
    nullif(
      concat_ws(
        ' | ',
        'Acerto histórico: total pago alterado de '
          ||v_previous_paid::text
          ||' para '
          ||p_total_paid::text,
        nullif(btrim(p_notes),'')
      ),
      ''
    ),
    auth.uid()
  );

  return v_debt;
end;
$$;

revoke all
on function public.bank_adjust_debt_history(
  uuid,numeric,date,text,text
)
from public,anon;

grant execute
on function public.bank_adjust_debt_history(
  uuid,numeric,date,text,text
)
to authenticated,service_role;

commit;
