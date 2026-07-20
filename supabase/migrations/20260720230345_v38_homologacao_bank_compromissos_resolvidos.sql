begin;

-- V38 · Evita reprojetar compromissos mensais já resolvidos/pagos.

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
stable security definer
set search_path to 'public'
as $function$
with context as (
  select
    coalesce(
      date_trunc(
        'month',
        p_start_month::timestamp
      )::date,
      date_trunc(
        'month',
        now() at time zone 'America/Sao_Paulo'
      )::date
    ) as start_month,
    date_trunc(
      'month',
      now() at time zone 'America/Sao_Paulo'
    )::date as current_month
),
months as (
  select
    (
      ctx.start_month
      + (g.n || ' month')::interval
    )::date as reference_month
  from context ctx
  cross join generate_series(
    0,
    greatest(
      least(p_months, 60),
      1
    ) - 1
  ) as g(n)
),
guard as (
  select
    public.can_access_bank() as allowed
),
invoice_values as (
  select
    m.reference_month,
    coalesce(
      sum(i.amount) filter (
        where i.amount is not null
          and i.status not in(
            'paid',
            'cancelled'
          )
      ),
      0
    )::numeric(14,2)
      as card_invoices
  from months m
  left join public.bank_card_invoices i
    on date_trunc(
      'month',
      i.reference_month::timestamp
    )::date = m.reference_month
  group by m.reference_month
),
card_subscription_values as (
  select
    m.reference_month,
    coalesce(
      sum(s.amount) filter (
        where s.is_active
          and s.include_in_projection
          and s.projection_mode = 'inside_card'
          and s.card_id is not null
          and (
            s.starts_on is null
            or s.starts_on
              <= (
                m.reference_month
                + interval '1 month - 1 day'
              )::date
          )
          and (
            s.ends_on is null
            or s.ends_on
              >= m.reference_month
          )
          and not exists(
            select 1
            from public.bank_card_invoices i2
            where i2.card_id = s.card_id
              and date_trunc(
                'month',
                i2.reference_month::timestamp
              )::date = m.reference_month
              and i2.amount is not null
              and i2.status <> 'cancelled'
              and i2.includes_recurring = true
          )
          and not exists(
            select 1
            from public.bank_month_commitment_resolutions r
            where r.commitment_key = 'subscription:' || s.id::text
              and r.reference_month = m.reference_month
              and r.resolution = 'paid'
          )
          and (
            s.billing_cycle = 'monthly'
            or (
              s.billing_cycle = 'annual'
              and extract(
                month from coalesce(
                  s.starts_on,
                  m.reference_month
                )
              ) = extract(
                month from m.reference_month
              )
            )
            or s.billing_cycle in(
              'weekly',
              'custom'
            )
          )
      ),
      0
    )::numeric(14,2)
      as card_subscription_estimate
  from months m
  left join public.bank_subscriptions s
    on true
  group by m.reference_month
),
direct_charge_values as (
  select
    m.reference_month,
    coalesce(
      sum(
        greatest(
          c.amount - c.paid_amount,
          0
        )
      ) filter (
        where c.status not in(
          'paid',
          'cancelled'
        )
          and c.charge_type
            <> 'card_invoice'
      ),
      0
    )::numeric(14,2)
      as direct_charges
  from months m
  left join public.bank_charges c
    on date_trunc(
      'month',
      c.due_date::timestamp
    )::date = m.reference_month
  group by m.reference_month
),
debt_schedule as (
  select
    d.id as debt_id,
    (
      date_trunc(
        'month',
        d.next_due_date::timestamp
      )::date
      + (g.n || ' month')::interval
    )::date as reference_month,
    least(
      coalesce(
        d.monthly_amount,
        greatest(
          d.original_amount
            - d.total_paid,
          0
        )
      ),
      greatest(
        d.original_amount
          - d.total_paid,
        0
      )
      - (
        g.n
        * coalesce(
          d.monthly_amount,
          greatest(
            d.original_amount
              - d.total_paid,
            0
          )
        )
      )
    )::numeric(14,2)
      as amount
  from public.bank_debts d
  cross join lateral generate_series(
    0,
    greatest(
      ceil(
        greatest(
          d.original_amount
            - d.total_paid,
          0
        )
        / nullif(
          coalesce(
            d.monthly_amount,
            greatest(
              d.original_amount
                - d.total_paid,
              0
            )
          ),
          0
        )
      )::integer - 1,
      0
    )
  ) as g(n)
  where d.status = 'active'
    and d.next_due_date is not null
    and greatest(
      d.original_amount
        - d.total_paid,
      0
    ) > 0
),
debt_values as (
  select
    m.reference_month,
    coalesce(
      sum(ds.amount) filter (
        where ds.amount > 0
          and not exists(
            select 1
            from public.bank_charges c
            where c.charge_type = 'loan'
              and c.source_id = ds.debt_id
              and c.status <> 'cancelled'
              and date_trunc(
                'month',
                c.due_date::timestamp
              )::date = m.reference_month
          )
          and not exists(
            select 1
            from public.bank_month_commitment_resolutions r
            where r.commitment_key = 'debt:' || ds.debt_id::text
              and r.reference_month = m.reference_month
              and r.resolution = 'paid'
          )
      ),
      0
    )::numeric(14,2)
      as debt_payments
  from months m
  left join debt_schedule ds
    on ds.reference_month
      = m.reference_month
  group by m.reference_month
),
direct_subscription_values as (
  select
    m.reference_month,
    coalesce(
      sum(s.amount) filter (
        where s.is_active
          and s.include_in_projection
          and s.projection_mode
            = 'direct_charge'
          and (
            s.starts_on is null
            or s.starts_on
              <= (
                m.reference_month
                + interval '1 month - 1 day'
              )::date
          )
          and (
            s.ends_on is null
            or s.ends_on
              >= m.reference_month
          )
          and not exists(
            select 1
            from public.bank_charges c
            where c.charge_type
              = 'subscription'
              and c.source_id = s.id
              and c.status <> 'cancelled'
              and date_trunc(
                'month',
                c.due_date::timestamp
              )::date
                = m.reference_month
          )
          and not exists(
            select 1
            from public.bank_month_commitment_resolutions r
            where r.commitment_key = 'subscription:' || s.id::text
              and r.reference_month = m.reference_month
              and r.resolution = 'paid'
          )
          and (
            s.billing_cycle = 'monthly'
            or (
              s.billing_cycle = 'annual'
              and extract(
                month from coalesce(
                  s.starts_on,
                  m.reference_month
                )
              ) = extract(
                month from m.reference_month
              )
            )
            or s.billing_cycle in(
              'weekly',
              'custom'
            )
          )
      ),
      0
    )::numeric(14,2)
      as direct_subscriptions
  from months m
  left join public.bank_subscriptions s
    on true
  group by m.reference_month
),
receivable_values as (
  select
    m.reference_month,
    coalesce(
      sum(
        greatest(
          r.amount
            - r.received_amount,
          0
        )
      ) filter (
        where r.status not in(
          'received',
          'cancelled'
        )
      ),
      0
    )::numeric(14,2)
      as receivables
  from months m
  cross join context ctx
  left join public.bank_receivables r
    on (
      case
        when r.due_date
          < ctx.current_month
          then ctx.current_month
        else date_trunc(
          'month',
          r.due_date::timestamp
        )::date
      end
    ) = m.reference_month
  group by m.reference_month
),
recurring_income_values as (
  select
    m.reference_month,
    coalesce(
      sum(s.amount) filter (
        where s.is_active
          and s.include_in_projection
          and (
            s.starts_on is null
            or s.starts_on
              <= (
                m.reference_month
                + interval '1 month - 1 day'
              )::date
          )
          and (
            s.ends_on is null
            or s.ends_on
              >= m.reference_month
          )
          and not exists(
            select 1
            from public.bank_receivables r
            where r.source_type
              = 'income_source'
              and r.source_id = s.id
              and r.status <> 'cancelled'
              and date_trunc(
                'month',
                r.due_date::timestamp
              )::date
                = m.reference_month
          )
          and (
            s.frequency = 'monthly'
            or (
              s.frequency = 'annual'
              and extract(
                month from coalesce(
                  s.starts_on,
                  m.reference_month
                )
              ) = extract(
                month from m.reference_month
              )
            )
            or s.frequency in(
              'weekly',
              'custom'
            )
          )
      ),
      0
    )::numeric(14,2)
      as recurring_income_estimate
  from months m
  left join public.bank_income_sources s
    on true
  group by m.reference_month
),
operation_receivable_source as (
  select
    case
      when coalesce(
        s.payment_due_at,
        s.quoted_at::date
      ) < ctx.current_month
        then ctx.current_month
      else date_trunc(
        'month',
        coalesce(
          s.payment_due_at,
          s.quoted_at::date
        )::timestamp
      )::date
    end as reference_month,
    s.total_amount::numeric as amount
  from public.sales s
  left join public.customers c
    on c.id = s.customer_id
  cross join context ctx
  where s.record_type = 'sale'
    and s.general_status <> 'cancelled'
    and s.payment_status = 'receivable'
    and coalesce(c.name, '')
      not in(
        'Igor Candinho',
        'Brinde'
      )

  union all

  select
    case
      when coalesce(
        s.payment_due_on,
        s.quoted_on
      ) < ctx.current_month
        then ctx.current_month
      else date_trunc(
        'month',
        coalesce(
          s.payment_due_on,
          s.quoted_on
        )::timestamp
      )::date
    end as reference_month,
    s.total_amount::numeric as amount
  from public.fitness_sales s
  cross join context ctx
  where s.general_status <> 'cancelled'
    and s.payment_status = 'receivable'
),
operation_receivable_values as (
  select
    m.reference_month,
    coalesce(
      sum(o.amount),
      0
    )::numeric(14,2)
      as operation_receivables
  from months m
  left join operation_receivable_source o
    on o.reference_month
      = m.reference_month
  group by m.reference_month
),
closed_months as (
  select
    (
      ctx.current_month
      - (g.n || ' month')::interval
    )::date as month_start
  from context ctx
  cross join generate_series(
    1,
    3
  ) as g(n)
),
closed_profit as (
  select
    cm.month_start,
    coalesce(
      sum(cs.total_profit) filter (
        where cs.delivered_at
          is not null
          and cs.delivered_at::date
            >= cm.month_start
          and cs.delivered_at::date
            < (
              cm.month_start
              + interval '1 month'
            )::date
      ),
      0
    )::numeric(14,2)
      as monthly_profit
  from closed_months cm
  left join public.commercial_sales cs
    on true
  group by cm.month_start
),
supplements_projection_value as (
  select
    round(
      avg(monthly_profit) * 0.70,
      2
    )::numeric(14,2)
      as projected_monthly_receivable
  from closed_profit
),
supplements_projection_values as (
  select
    m.reference_month,
    case
      when m.reference_month
        > ctx.current_month
        then coalesce(
          sp.projected_monthly_receivable,
          0
        )
      else 0::numeric
    end::numeric(14,2)
      as supplements_profit_projection
  from months m
  cross join context ctx
  cross join supplements_projection_value sp
)
select
  m.reference_month,
  iv.card_invoices,
  csv.card_subscription_estimate,
  dcv.direct_charges,
  dv.debt_payments,
  dsv.direct_subscriptions,
  (
    iv.card_invoices
    + csv.card_subscription_estimate
    + dcv.direct_charges
    + dv.debt_payments
    + dsv.direct_subscriptions
  )::numeric(14,2)
    as total_commitments,
  rv.receivables,
  riv.recurring_income_estimate,
  orv.operation_receivables,
  spv.supplements_profit_projection,
  (
    rv.receivables
    + riv.recurring_income_estimate
    + orv.operation_receivables
    + spv.supplements_profit_projection
  )::numeric(14,2)
    as total_expected_income,
  (
    (
      rv.receivables
      + riv.recurring_income_estimate
      + orv.operation_receivables
      + spv.supplements_profit_projection
    )
    - (
      iv.card_invoices
      + csv.card_subscription_estimate
      + dcv.direct_charges
      + dv.debt_payments
      + dsv.direct_subscriptions
    )
  )::numeric(14,2)
    as projected_result
from months m
join invoice_values iv
  using(reference_month)
join card_subscription_values csv
  using(reference_month)
join direct_charge_values dcv
  using(reference_month)
join debt_values dv
  using(reference_month)
join direct_subscription_values dsv
  using(reference_month)
join receivable_values rv
  using(reference_month)
join recurring_income_values riv
  using(reference_month)
join operation_receivable_values orv
  using(reference_month)
join supplements_projection_values spv
  using(reference_month)
cross join guard g
where g.allowed
order by m.reference_month;
$function$;

commit;
