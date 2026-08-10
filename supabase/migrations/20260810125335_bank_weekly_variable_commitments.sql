begin;

create table if not exists public.bank_subscription_weekly_occurrences (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.bank_subscriptions(id) on delete cascade,
  occurrence_on date not null,
  resolution text not null,
  amount numeric(14,2) not null,
  paid_on date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_subscription_weekly_occurrences_unique
    unique (subscription_id, occurrence_on),
  constraint bank_subscription_weekly_occurrences_resolution_check
    check (resolution in ('paid', 'skipped')),
  constraint bank_subscription_weekly_occurrences_amount_check
    check (amount > 0),
  constraint bank_subscription_weekly_occurrences_paid_on_check
    check (
      (resolution = 'paid' and paid_on is not null)
      or (resolution = 'skipped' and paid_on is null)
    )
);

alter table public.bank_subscription_weekly_occurrences
  enable row level security;

drop policy if exists bank_subscription_weekly_occurrences_select
on public.bank_subscription_weekly_occurrences;

create policy bank_subscription_weekly_occurrences_select
on public.bank_subscription_weekly_occurrences
for select
to authenticated
using ((select public.can_access_bank()));

revoke all on public.bank_subscription_weekly_occurrences
from public, anon, authenticated;

grant select on public.bank_subscription_weekly_occurrences
to authenticated, service_role;

create or replace function public.bank_resolve_weekly_subscription_occurrence(
  p_subscription_id uuid,
  p_occurrence_on date,
  p_resolution text,
  p_notes text default null
)
returns public.bank_subscription_weekly_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.bank_subscriptions;
  v_resolution text := lower(coalesce(nullif(btrim(p_resolution), ''), ''));
  v_row public.bank_subscription_weekly_occurrences;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode = '42501';
  end if;

  select *
  into v_subscription
  from public.bank_subscriptions
  where id = p_subscription_id
    and is_active = true
  for update;

  if v_subscription.id is null then
    raise exception 'Compromisso semanal não encontrado ou inativo';
  end if;

  if lower(v_subscription.billing_cycle) <> 'weekly' then
    raise exception 'Este compromisso não está configurado como semanal';
  end if;

  if p_occurrence_on is null then
    raise exception 'Semana inválida';
  end if;

  if v_subscription.starts_on is not null
     and p_occurrence_on < v_subscription.starts_on
  then
    raise exception 'A semana é anterior ao início do compromisso';
  end if;

  if v_subscription.ends_on is not null
     and p_occurrence_on > v_subscription.ends_on
  then
    raise exception 'A semana é posterior ao fim do compromisso';
  end if;

  if v_resolution not in ('paid', 'skipped') then
    raise exception 'Escolha Paguei ou Não aconteceu';
  end if;

  insert into public.bank_subscription_weekly_occurrences(
    subscription_id,
    occurrence_on,
    resolution,
    amount,
    paid_on,
    notes,
    created_by,
    updated_at
  )
  values(
    v_subscription.id,
    p_occurrence_on,
    v_resolution,
    round(v_subscription.amount, 2),
    case when v_resolution = 'paid' then current_date else null end,
    nullif(btrim(p_notes), ''),
    auth.uid(),
    now()
  )
  on conflict (subscription_id, occurrence_on)
  do update
  set resolution = excluded.resolution,
      amount = excluded.amount,
      paid_on = excluded.paid_on,
      notes = coalesce(excluded.notes, public.bank_subscription_weekly_occurrences.notes),
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.bank_resolve_weekly_subscription_occurrence(
  uuid, date, text, text
) from public, anon;

grant execute on function public.bank_resolve_weekly_subscription_occurrence(
  uuid, date, text, text
) to authenticated, service_role;

create or replace function public.bank_clear_weekly_subscription_occurrence(
  p_subscription_id uuid,
  p_occurrence_on date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode = '42501';
  end if;

  delete from public.bank_subscription_weekly_occurrences
  where subscription_id = p_subscription_id
    and occurrence_on = p_occurrence_on;

  return found;
end;
$$;

revoke all on function public.bank_clear_weekly_subscription_occurrence(
  uuid, date
) from public, anon;

grant execute on function public.bank_clear_weekly_subscription_occurrence(
  uuid, date
) to authenticated, service_role;

-- A psicóloga é cobrada por consulta, não como mensalidade fixa.
-- O valor passa a representar cada semana; quatro semanas formam o teto de R$ 400.
update public.bank_subscriptions
set amount = 100,
    billing_cycle = 'weekly',
    billing_day = null,
    due_mode = 'month_only',
    notes = concat_ws(
      ' | ',
      nullif(btrim(notes), ''),
      'Até 4 consultas por mês; cada semana só é cobrada quando acontece.'
    ),
    updated_at = now()
where id = '57c0fde6-b4c7-42a5-bf84-db34a12ee0f4'::uuid
  and lower(name) = lower('Psicóloga da Giulia');

-- A projeção antiga contava qualquer recorrência semanal apenas uma vez.
-- Mantemos a base estável e acrescentamos as três semanas restantes,
-- descontando semanas já pagas ou marcadas como não realizadas.
create or replace function public.bank_get_annual_projection(
  p_start_month date default null,
  p_months integer default 12
)
returns table(
  reference_month date,
  card_invoices numeric,
  card_subscription_estimate numeric,
  direct_charges numeric,
  debt_payments numeric,
  direct_subscriptions numeric,
  total_commitments numeric,
  receivables numeric,
  recurring_income_estimate numeric,
  operation_receivables numeric,
  supplements_profit_projection numeric,
  total_expected_income numeric,
  projected_result numeric
)
language sql
stable
security definer
set search_path = public
as $$
with base as (
  select *
  from public.bank_get_annual_projection_legacy_base(p_start_month, p_months)
),
context as (
  select date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
    as current_month
),
operation_source as (
  select
    case
      when r.due_date < ctx.current_month then ctx.current_month
      else date_trunc('month', r.due_date::timestamp)::date
    end as reference_month,
    r.amount::numeric as amount
  from public.supplement_sale_receivable_schedule r
  join public.sales s on s.id = r.sale_id
  left join public.customers c on c.id = s.customer_id
  cross join context ctx
  where coalesce(c.name, '') not in ('Igor Candinho', 'Brinde')

  union all

  select
    case
      when coalesce(s.payment_due_on, s.quoted_on) < ctx.current_month
        then ctx.current_month
      else date_trunc(
        'month',
        coalesce(s.payment_due_on, s.quoted_on)::timestamp
      )::date
    end as reference_month,
    s.total_amount::numeric as amount
  from public.fitness_sales s
  cross join context ctx
  where s.general_status <> 'cancelled'
    and s.payment_status = 'receivable'
),
corrected as (
  select reference_month, coalesce(sum(amount), 0)::numeric(14,2) as amount
  from operation_source
  group by reference_month
),
weekly_adjustment as (
  select
    b.reference_month,
    coalesce(sum(
      case
        when exists (
          select 1
          from public.bank_month_commitment_resolutions mr
          where mr.commitment_key = 'subscription:' || s.id::text
            and mr.reference_month = b.reference_month
            and mr.resolution = 'paid'
        ) then 0
        else s.amount * (
          greatest(
            4 - (
              select count(*)::integer
              from public.bank_subscription_weekly_occurrences wo
              where wo.subscription_id = s.id
                and date_trunc('month', wo.occurrence_on)::date = b.reference_month
            ),
            0
          ) - 1
        )
      end
    ) filter (
      where s.is_active
        and s.include_in_projection
        and s.billing_cycle = 'weekly'
        and s.projection_mode = 'direct_charge'
        and (s.starts_on is null or s.starts_on <= (b.reference_month + interval '1 month - 1 day')::date)
        and (s.ends_on is null or s.ends_on >= b.reference_month)
    ), 0)::numeric(14,2) as direct_delta
  from base b
  left join public.bank_subscriptions s on true
  group by b.reference_month
)
select
  b.reference_month,
  b.card_invoices,
  b.card_subscription_estimate,
  b.direct_charges,
  b.debt_payments,
  greatest(b.direct_subscriptions + wa.direct_delta, 0)::numeric(14,2)
    as direct_subscriptions,
  greatest(b.total_commitments + wa.direct_delta, 0)::numeric(14,2)
    as total_commitments,
  b.receivables,
  b.recurring_income_estimate,
  coalesce(c.amount, 0)::numeric(14,2) as operation_receivables,
  b.supplements_profit_projection,
  (b.total_expected_income - b.operation_receivables + coalesce(c.amount, 0))::numeric(14,2)
    as total_expected_income,
  (b.projected_result - b.operation_receivables + coalesce(c.amount, 0) - wa.direct_delta)::numeric(14,2)
    as projected_result
from base b
left join corrected c using (reference_month)
join weekly_adjustment wa using (reference_month)
order by b.reference_month;
$$;

revoke all on function public.bank_get_annual_projection(date, integer)
from public, anon;

grant execute on function public.bank_get_annual_projection(date, integer)
to authenticated, service_role;

commit;
