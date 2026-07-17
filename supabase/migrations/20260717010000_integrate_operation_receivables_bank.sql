-- Integra os valores a receber das operações com a Candinho Bank sem duplicar dados.
-- As vendas continuam sendo a fonte de verdade em Suplementos/Fitness.
-- A Bank apenas consulta ao vivo e usa uma projeção conservadora do lucro da Suplementos.

create or replace function public.bank_get_supplements_profit_projection()
returns table(
  period_start date,
  period_end date,
  average_monthly_profit numeric,
  projection_factor numeric,
  projected_monthly_receivable numeric,
  monthly_history jsonb
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.can_access_bank() then
    raise exception 'Usuário sem acesso à Candinho Bank';
  end if;

  return query
  with months as (
    -- Usa os 3 meses FECHADOS anteriores ao mês atual para não distorcer a média
    -- com o mês corrente ainda incompleto.
    select (date_trunc('month', current_date)::date - (g.n || ' month')::interval)::date as month_start
    from generate_series(1, 3) as g(n)
  ), profits as (
    select
      m.month_start,
      coalesce(sum(s.total_profit) filter (
        where s.record_type = 'sale'
          and s.general_status <> 'cancelled'
      ), 0)::numeric(14,2) as monthly_profit
    from months m
    left join public.sales s
      on date_trunc('month', s.quoted_at)::date = m.month_start
    group by m.month_start
  )
  select
    min(p.month_start)::date,
    max(p.month_start)::date,
    round(avg(p.monthly_profit), 2)::numeric(14,2),
    0.70::numeric(5,2),
    round(avg(p.monthly_profit) * 0.70, 2)::numeric(14,2),
    jsonb_agg(
      jsonb_build_object('month', p.month_start, 'profit', p.monthly_profit)
      order by p.month_start
    )
  from profits p;
end;
$$;

revoke execute on function public.bank_get_supplements_profit_projection() from public, anon;
grant execute on function public.bank_get_supplements_profit_projection() to authenticated;

create or replace function public.bank_get_operation_receivables()
returns table(
  operation text,
  operation_label text,
  sale_id uuid,
  customer_name text,
  product_summary text,
  amount numeric,
  profit numeric,
  due_date date,
  quoted_on date,
  payment_status text,
  delivery_status text,
  href text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.can_access_bank() then
    raise exception 'Usuário sem acesso à Candinho Bank';
  end if;

  return query
  select *
  from (
    select
      'supplements'::text as operation,
      'Candinho Suplementos'::text as operation_label,
      s.id as sale_id,
      c.name::text as customer_name,
      coalesce(items.product_summary, 'Venda sem itens')::text as product_summary,
      s.total_amount::numeric(14,2) as amount,
      s.total_profit::numeric(14,2) as profit,
      coalesce(s.payment_due_at, s.quoted_at::date)::date as due_date,
      s.quoted_at::date as quoted_on,
      s.payment_status::text as payment_status,
      s.delivery_status::text as delivery_status,
      ('/vendas/' || s.id::text)::text as href
    from public.sales s
    join public.customers c on c.id = s.customer_id
    left join lateral (
      select string_agg(
        p.name || ' ×' || si.quantity::text,
        ' · ' order by p.name, si.id
      ) as product_summary
      from public.sale_items si
      join public.products p on p.id = si.product_id
      where si.sale_id = s.id
    ) items on true
    where s.record_type = 'sale'
      and s.general_status <> 'cancelled'
      and s.payment_status = 'receivable'

    union all

    select
      'fitness'::text as operation,
      'Candinho Fitness'::text as operation_label,
      s.id as sale_id,
      s.customer_name::text as customer_name,
      coalesce(items.product_summary, 'Venda sem itens')::text as product_summary,
      s.total_amount::numeric(14,2) as amount,
      s.total_profit::numeric(14,2) as profit,
      coalesce(s.payment_due_on, s.quoted_on)::date as due_date,
      s.quoted_on::date as quoted_on,
      s.payment_status::text as payment_status,
      s.delivery_status::text as delivery_status,
      ('/fitness/vendas/' || s.id::text)::text as href
    from public.fitness_sales s
    left join lateral (
      select string_agg(
        fp.name
          || case when fv.size is not null and btrim(fv.size) <> '' then ' ' || fv.size else '' end
          || case when fv.color is not null and btrim(fv.color) <> '' then ' · ' || fv.color else '' end
          || ' ×' || si.quantity::text,
        ' · ' order by fp.name, fv.size, fv.color, si.id
      ) as product_summary
      from public.fitness_sale_items si
      join public.fitness_variants fv on fv.id = si.variant_id
      join public.fitness_products fp on fp.id = fv.product_id
      where si.sale_id = s.id
    ) items on true
    where s.general_status <> 'cancelled'
      and s.payment_status = 'receivable'
  ) receivables
  order by due_date asc nulls last, quoted_on asc, customer_name asc;
end;
$$;

revoke execute on function public.bank_get_operation_receivables() from public, anon;
grant execute on function public.bank_get_operation_receivables() to authenticated;

-- O retorno ganhou duas colunas novas. É necessário recriar a função para alterar o tipo de retorno.
drop function if exists public.bank_get_annual_projection(date, integer);

create function public.bank_get_annual_projection(
  p_start_month date default date_trunc('month', current_date)::date,
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
set search_path to 'public'
as $$
with months as (
  select (date_trunc('month', p_start_month)::date + (g.n || ' month')::interval)::date as reference_month
  from generate_series(0, greatest(least(p_months, 60), 1) - 1) as g(n)
),
guard as (
  select public.can_access_bank() as allowed
),
invoice_values as (
  select m.reference_month,
    coalesce(sum(i.amount) filter (
      where i.amount is not null and i.status not in ('paid','cancelled')
    ),0)::numeric(14,2) as card_invoices
  from months m
  left join public.bank_card_invoices i
    on date_trunc('month', i.reference_month)::date = m.reference_month
  group by m.reference_month
),
card_subscription_values as (
  select m.reference_month,
    coalesce(sum(s.amount) filter (
      where s.is_active and s.include_in_projection and s.projection_mode='inside_card'
        and s.card_id is not null
        and (s.starts_on is null or s.starts_on <= (m.reference_month + interval '1 month - 1 day')::date)
        and (s.ends_on is null or s.ends_on >= m.reference_month)
        and not exists (
          select 1 from public.bank_card_invoices i2
          where i2.card_id=s.card_id
            and date_trunc('month', i2.reference_month)::date=m.reference_month
            and i2.amount is not null and i2.status <> 'cancelled'
        )
        and (s.billing_cycle='monthly'
          or (s.billing_cycle='annual' and extract(month from coalesce(s.starts_on,m.reference_month))=extract(month from m.reference_month))
          or s.billing_cycle in ('weekly','custom'))
    ),0)::numeric(14,2) as card_subscription_estimate
  from months m left join public.bank_subscriptions s on true
  group by m.reference_month
),
direct_charge_values as (
  select m.reference_month,
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter (
      where c.status not in ('paid','cancelled') and c.charge_type <> 'card_invoice'
    ),0)::numeric(14,2) as direct_charges
  from months m
  left join public.bank_charges c on date_trunc('month',c.due_date)::date=m.reference_month
  group by m.reference_month
),
debt_schedule as (
  select d.id debt_id,
    (date_trunc('month',d.next_due_date)::date + (g.n || ' month')::interval)::date reference_month,
    least(
      coalesce(d.monthly_amount,greatest(d.original_amount-d.total_paid,0)),
      greatest(d.original_amount-d.total_paid,0) - (g.n*coalesce(d.monthly_amount,greatest(d.original_amount-d.total_paid,0)))
    )::numeric(14,2) amount
  from public.bank_debts d
  cross join lateral generate_series(0,greatest(ceil(greatest(d.original_amount-d.total_paid,0)/nullif(coalesce(d.monthly_amount,greatest(d.original_amount-d.total_paid,0)),0))::integer-1,0)) g(n)
  where d.status='active' and d.next_due_date is not null and greatest(d.original_amount-d.total_paid,0)>0
),
debt_values as (
  select m.reference_month,
    coalesce(sum(ds.amount) filter (
      where ds.amount>0 and not exists (
        select 1 from public.bank_charges c
        where c.charge_type='loan' and c.source_id=ds.debt_id and c.status<>'cancelled'
          and date_trunc('month',c.due_date)::date=m.reference_month
      )
    ),0)::numeric(14,2) debt_payments
  from months m left join debt_schedule ds on ds.reference_month=m.reference_month
  group by m.reference_month
),
direct_subscription_values as (
  select m.reference_month,
    coalesce(sum(s.amount) filter (
      where s.is_active and s.include_in_projection and s.projection_mode='direct_charge'
        and (s.starts_on is null or s.starts_on <= (m.reference_month + interval '1 month - 1 day')::date)
        and (s.ends_on is null or s.ends_on >= m.reference_month)
        and not exists (
          select 1 from public.bank_charges c
          where c.charge_type='subscription' and c.source_id=s.id and c.status<>'cancelled'
            and date_trunc('month',c.due_date)::date=m.reference_month
        )
        and (s.billing_cycle='monthly'
          or (s.billing_cycle='annual' and extract(month from coalesce(s.starts_on,m.reference_month))=extract(month from m.reference_month))
          or s.billing_cycle in ('weekly','custom'))
    ),0)::numeric(14,2) direct_subscriptions
  from months m left join public.bank_subscriptions s on true
  group by m.reference_month
),
receivable_values as (
  select m.reference_month,
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter (
      where r.status not in ('received','cancelled')
    ),0)::numeric(14,2) receivables
  from months m
  left join public.bank_receivables r
    on (
      case
        when r.due_date < date_trunc('month', current_date)::date
          then date_trunc('month', current_date)::date
        else date_trunc('month', r.due_date)::date
      end
    ) = m.reference_month
  group by m.reference_month
),
recurring_income_values as (
  select m.reference_month,
    coalesce(sum(s.amount) filter (
      where s.is_active and s.include_in_projection
        and (s.starts_on is null or s.starts_on <= (m.reference_month + interval '1 month - 1 day')::date)
        and (s.ends_on is null or s.ends_on >= m.reference_month)
        and not exists (
          select 1 from public.bank_receivables r
          where r.source_type='income_source' and r.source_id=s.id and r.status<>'cancelled'
            and date_trunc('month',r.due_date)::date=m.reference_month
        )
        and (s.frequency='monthly'
          or (s.frequency='annual' and extract(month from coalesce(s.starts_on,m.reference_month))=extract(month from m.reference_month))
          or s.frequency in ('weekly','custom'))
    ),0)::numeric(14,2) recurring_income_estimate
  from months m left join public.bank_income_sources s on true
  group by m.reference_month
),
operation_receivable_source as (
  select
    case
      when coalesce(s.payment_due_at, s.quoted_at::date) < date_trunc('month', current_date)::date
        then date_trunc('month', current_date)::date
      else date_trunc('month', coalesce(s.payment_due_at, s.quoted_at::date))::date
    end as reference_month,
    s.total_amount::numeric as amount
  from public.sales s
  where s.record_type='sale' and s.general_status<>'cancelled' and s.payment_status='receivable'

  union all

  select
    case
      when coalesce(s.payment_due_on, s.quoted_on) < date_trunc('month', current_date)::date
        then date_trunc('month', current_date)::date
      else date_trunc('month', coalesce(s.payment_due_on, s.quoted_on))::date
    end as reference_month,
    s.total_amount::numeric as amount
  from public.fitness_sales s
  where s.general_status<>'cancelled' and s.payment_status='receivable'
),
operation_receivable_values as (
  select m.reference_month,
    coalesce(sum(o.amount),0)::numeric(14,2) as operation_receivables
  from months m
  left join operation_receivable_source o on o.reference_month=m.reference_month
  group by m.reference_month
),
closed_months as (
  select (date_trunc('month', current_date)::date - (g.n || ' month')::interval)::date as month_start
  from generate_series(1,3) as g(n)
),
closed_profit as (
  select cm.month_start,
    coalesce(sum(s.total_profit) filter (
      where s.record_type='sale' and s.general_status<>'cancelled'
    ),0)::numeric(14,2) as monthly_profit
  from closed_months cm
  left join public.sales s on date_trunc('month',s.quoted_at)::date=cm.month_start
  group by cm.month_start
),
supplements_projection_value as (
  select round(avg(monthly_profit)*0.70,2)::numeric(14,2) as projected_monthly_receivable
  from closed_profit
),
supplements_projection_values as (
  select m.reference_month,
    case
      -- O mês atual usa somente valores efetivamente a receber das operações.
      -- A estimativa conservadora entra a partir do próximo mês para evitar dupla contagem.
      when m.reference_month > date_trunc('month',current_date)::date
        then coalesce(sp.projected_monthly_receivable,0)
      else 0::numeric
    end::numeric(14,2) as supplements_profit_projection
  from months m cross join supplements_projection_value sp
)
select
  m.reference_month,
  iv.card_invoices,
  csv.card_subscription_estimate,
  dcv.direct_charges,
  dv.debt_payments,
  dsv.direct_subscriptions,
  (iv.card_invoices+csv.card_subscription_estimate+dcv.direct_charges+dv.debt_payments+dsv.direct_subscriptions)::numeric(14,2) total_commitments,
  rv.receivables,
  riv.recurring_income_estimate,
  orv.operation_receivables,
  spv.supplements_profit_projection,
  (rv.receivables+riv.recurring_income_estimate+orv.operation_receivables+spv.supplements_profit_projection)::numeric(14,2) total_expected_income,
  ((rv.receivables+riv.recurring_income_estimate+orv.operation_receivables+spv.supplements_profit_projection)
    - (iv.card_invoices+csv.card_subscription_estimate+dcv.direct_charges+dv.debt_payments+dsv.direct_subscriptions))::numeric(14,2) projected_result
from months m
join invoice_values iv using(reference_month)
join card_subscription_values csv using(reference_month)
join direct_charge_values dcv using(reference_month)
join debt_values dv using(reference_month)
join direct_subscription_values dsv using(reference_month)
join receivable_values rv using(reference_month)
join recurring_income_values riv using(reference_month)
join operation_receivable_values orv using(reference_month)
join supplements_projection_values spv using(reference_month)
cross join guard g
where g.allowed
order by m.reference_month;
$$;

revoke execute on function public.bank_get_annual_projection(date, integer) from public, anon;
grant execute on function public.bank_get_annual_projection(date, integer) to authenticated;
