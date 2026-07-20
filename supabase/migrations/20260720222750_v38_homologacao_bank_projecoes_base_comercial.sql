begin;

-- Candinho Company · V38
-- Homologação do Bank e da base comercial executiva.
--
-- Corrige:
-- 1. projeção de lucro de Suplementos baseada em vendas comerciais entregues;
-- 2. calendário mensal usando America/Sao_Paulo;
-- 3. exclusão de Igor Candinho e Brinde dos recebíveis comerciais;
-- 4. patrimônio e lista de recebíveis usando a mesma base comercial;
-- 5. fechamento mensal usando a mesma regra de recebíveis;
-- 6. closed_on usando o dia local do Brasil.
--
-- Esta migration já foi aplicada diretamente no Supabase de produção.

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
stable security definer
set search_path to 'public'
as $function$
begin
  if not public.can_access_bank() then
    raise exception 'Usuário sem acesso à Candinho Bank';
  end if;

  return query
  with context as (
    select
      date_trunc(
        'month',
        now() at time zone 'America/Sao_Paulo'
      )::date as current_month
  ),
  months as (
    select
      (
        ctx.current_month
        - (g.n || ' month')::interval
      )::date as month_start
    from context ctx
    cross join generate_series(1, 3) as g(n)
  ),
  profits as (
    select
      m.month_start,
      coalesce(
        sum(cs.total_profit) filter (
          where cs.delivered_at is not null
            and cs.delivered_at::date >= m.month_start
            and cs.delivered_at::date
              < (m.month_start + interval '1 month')::date
        ),
        0
      )::numeric(14,2) as monthly_profit
    from months m
    left join public.commercial_sales cs
      on true
    group by m.month_start
  )
  select
    min(p.month_start)::date,
    max(p.month_start)::date,
    round(
      avg(p.monthly_profit),
      2
    )::numeric(14,2),
    0.70::numeric(5,2),
    round(
      avg(p.monthly_profit) * 0.70,
      2
    )::numeric(14,2),
    jsonb_agg(
      jsonb_build_object(
        'month',
        p.month_start,
        'profit',
        p.monthly_profit
      )
      order by p.month_start
    )
  from profits p;
end;
$function$;

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

create or replace function public.bank_get_company_patrimony()
returns table(
  total_cash_balance numeric,
  company_cash_balance numeric,
  supplements_stock_cost numeric,
  supplements_stock_sale_value numeric,
  fitness_stock_cost numeric,
  fitness_stock_sale_value numeric,
  total_inventory_cost numeric,
  bank_receivables numeric,
  operation_receivables numeric,
  total_receivables numeric,
  company_debt_remaining numeric,
  total_debt_remaining numeric,
  operational_net_position numeric,
  total_net_position numeric
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if not public.can_access_bank() then
    raise exception
      'Usuário sem acesso à Candinho Bank';
  end if;

  return query
  with latest_balances as (
    select distinct on(s.account_id)
      s.account_id,
      s.balance
    from public.bank_balance_snapshots s
    join public.bank_accounts a
      on a.id = s.account_id
      and a.is_active = true
    order by
      s.account_id,
      s.balance_date desc,
      s.created_at desc
  ),
  cash as (
    select
      coalesce(
        sum(lb.balance),
        0
      )::numeric(14,2)
        as total_cash,
      coalesce(
        sum(lb.balance) filter (
          where lower(
            coalesce(a.origin, '')
          ) like '%company%'
          or lower(
            coalesce(a.origin, '')
          ) like '%candinho%'
        ),
        0
      )::numeric(14,2)
        as company_cash
    from latest_balances lb
    join public.bank_accounts a
      on a.id = lb.account_id
  ),
  supplement_stock as (
    select
      coalesce(
        sum(stock_cost_value),
        0
      )::numeric(14,2)
        as cost_value,
      coalesce(
        sum(stock_sale_value),
        0
      )::numeric(14,2)
        as sale_value
    from public.inventory_control_overview
  ),
  fitness_stock as (
    select
      coalesce(
        sum(
          sb.quantity
          * fv.cost_price
        ),
        0
      )::numeric(14,2)
        as cost_value,
      coalesce(
        sum(
          sb.quantity
          * fv.sale_price
        ),
        0
      )::numeric(14,2)
        as sale_value
    from public.fitness_stock_balances sb
    join public.fitness_variants fv
      on fv.id = sb.variant_id
    where fv.active = true
  ),
  bank_recv as (
    select
      coalesce(
        sum(
          greatest(
            amount - received_amount,
            0
          )
        ) filter (
          where status not in(
            'received',
            'cancelled'
          )
        ),
        0
      )::numeric(14,2)
        as total
    from public.bank_receivables
  ),
  operation_recv as (
    select
      (
        coalesce(
          (
            select
              sum(s.total_amount)
            from public.sales s
            left join public.customers c
              on c.id = s.customer_id
            where s.record_type = 'sale'
              and s.general_status
                <> 'cancelled'
              and s.payment_status
                = 'receivable'
              and coalesce(c.name, '')
                not in(
                  'Igor Candinho',
                  'Brinde'
                )
          ),
          0
        )
        +
        coalesce(
          (
            select
              sum(total_amount)
            from public.fitness_sales
            where general_status
              <> 'cancelled'
              and payment_status
                = 'receivable'
          ),
          0
        )
      )::numeric(14,2)
        as total
  ),
  debts as (
    select
      coalesce(
        sum(
          greatest(
            original_amount - total_paid,
            0
          )
        ) filter (
          where status in(
            'active',
            'paused'
          )
          and (
            lower(
              coalesce(origin, '')
            ) like '%company%'
            or lower(
              coalesce(origin, '')
            ) like '%candinho%'
          )
        ),
        0
      )::numeric(14,2)
        as company_total,
      coalesce(
        sum(
          greatest(
            original_amount - total_paid,
            0
          )
        ) filter (
          where status in(
            'active',
            'paused'
          )
        ),
        0
      )::numeric(14,2)
        as all_total
    from public.bank_debts
  )
  select
    c.total_cash,
    c.company_cash,
    ss.cost_value,
    ss.sale_value,
    fs.cost_value,
    fs.sale_value,
    (
      ss.cost_value
      + fs.cost_value
    )::numeric(14,2),
    br.total,
    orc.total,
    (
      br.total
      + orc.total
    )::numeric(14,2),
    d.company_total,
    d.all_total,
    (
      c.company_cash
      + ss.cost_value
      + fs.cost_value
      + orc.total
      - d.company_total
    )::numeric(14,2),
    (
      c.total_cash
      + ss.cost_value
      + fs.cost_value
      + br.total
      + orc.total
      - d.all_total
    )::numeric(14,2)
  from cash c
  cross join supplement_stock ss
  cross join fitness_stock fs
  cross join bank_recv br
  cross join operation_recv orc
  cross join debts d;
end;
$function$;

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
stable security definer
set search_path to 'public'
as $function$
begin
  if not public.can_access_bank() then
    raise exception
      'Usuário sem acesso à Candinho Bank';
  end if;

  return query
  select *
  from (
    select
      'supplements'::text
        as operation,
      'Candinho Suplementos'::text
        as operation_label,
      s.id as sale_id,
      c.name::text
        as customer_name,
      coalesce(
        items.product_summary,
        'Venda sem itens'
      )::text
        as product_summary,
      s.total_amount::numeric(14,2)
        as amount,
      s.total_profit::numeric(14,2)
        as profit,
      coalesce(
        s.payment_due_at,
        s.quoted_at::date
      )::date
        as due_date,
      s.quoted_at::date
        as quoted_on,
      s.payment_status::text
        as payment_status,
      s.delivery_status::text
        as delivery_status,
      (
        '/vendas/'
        || s.id::text
      )::text
        as href
    from public.sales s
    join public.customers c
      on c.id = s.customer_id
    left join lateral (
      select
        string_agg(
          p.name
          || ' ×'
          || si.quantity::text,
          ' · '
          order by p.name, si.id
        ) as product_summary
      from public.sale_items si
      join public.products p
        on p.id = si.product_id
      where si.sale_id = s.id
    ) items
      on true
    where s.record_type = 'sale'
      and s.general_status
        <> 'cancelled'
      and s.payment_status
        = 'receivable'
      and coalesce(c.name, '')
        not in(
          'Igor Candinho',
          'Brinde'
        )

    union all

    select
      'fitness'::text
        as operation,
      'Candinho Fitness'::text
        as operation_label,
      s.id as sale_id,
      s.customer_name::text
        as customer_name,
      coalesce(
        items.product_summary,
        'Venda sem itens'
      )::text
        as product_summary,
      s.total_amount::numeric(14,2)
        as amount,
      s.total_profit::numeric(14,2)
        as profit,
      coalesce(
        s.payment_due_on,
        s.quoted_on
      )::date
        as due_date,
      s.quoted_on::date
        as quoted_on,
      s.payment_status::text
        as payment_status,
      s.delivery_status::text
        as delivery_status,
      (
        '/fitness/vendas/'
        || s.id::text
      )::text
        as href
    from public.fitness_sales s
    left join lateral (
      select
        string_agg(
          fp.name
          || case
            when fv.size is not null
              and btrim(fv.size) <> ''
              then ' ' || fv.size
            else ''
          end
          || case
            when fv.color is not null
              and btrim(fv.color) <> ''
              then ' · ' || fv.color
            else ''
          end
          || ' ×'
          || si.quantity::text,
          ' · '
          order by
            fp.name,
            fv.size,
            fv.color,
            si.id
        ) as product_summary
      from public.fitness_sale_items si
      join public.fitness_variants fv
        on fv.id = si.variant_id
      join public.fitness_products fp
        on fp.id = fv.product_id
      where si.sale_id = s.id
    ) items
      on true
    where s.general_status
      <> 'cancelled'
      and s.payment_status
        = 'receivable'
  ) receivables
  order by
    due_date asc nulls last,
    quoted_on asc,
    customer_name asc;
end;
$function$;

create or replace function public.bank_close_month(
  p_reference_month date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_month date :=
    date_trunc(
      'month',
      p_reference_month::timestamp
    )::date;

  v_month_end date :=
    (
      date_trunc(
        'month',
        p_reference_month::timestamp
      )
      + interval '1 month - 1 day'
    )::date;

  v_today date :=
    (
      now()
      at time zone 'America/Sao_Paulo'
    )::date;

  v_id uuid;
  v_total_balance numeric(14,2);
  v_company_cash numeric(14,2);
  v_bank_receivables numeric(14,2);
  v_operation_receivables numeric(14,2);
  v_supp_stock numeric(14,2);
  v_fit_stock numeric(14,2);
  v_company_debt numeric(14,2);
  v_total_debt numeric(14,2);
  v_projected_income numeric(14,2);
  v_projected_commitments numeric(14,2);
  v_projected_result numeric(14,2);
begin
  if not public.can_write_bank() then
    raise exception
      'Usuário sem permissão para fechar meses da Candinho Bank';
  end if;

  with latest_balances as (
    select distinct on(s.account_id)
      s.account_id,
      s.balance
    from public.bank_balance_snapshots s
    join public.bank_accounts a
      on a.id = s.account_id
      and a.is_active = true
    where s.balance_date <= v_month_end
    order by
      s.account_id,
      s.balance_date desc,
      s.created_at desc
  )
  select
    coalesce(
      sum(lb.balance),
      0
    )::numeric(14,2),
    coalesce(
      sum(lb.balance) filter (
        where lower(
          coalesce(a.origin, '')
        ) like '%company%'
        or lower(
          coalesce(a.origin, '')
        ) like '%candinho%'
      ),
      0
    )::numeric(14,2)
  into
    v_total_balance,
    v_company_cash
  from latest_balances lb
  join public.bank_accounts a
    on a.id = lb.account_id;

  select
    coalesce(
      sum(
        greatest(
          amount - received_amount,
          0
        )
      ) filter (
        where status not in(
          'received',
          'cancelled'
        )
          and due_date <= v_month_end
      ),
      0
    )::numeric(14,2)
  into v_bank_receivables
  from public.bank_receivables;

  select
    (
      coalesce(
        (
          select
            sum(s.total_amount)
          from public.sales s
          left join public.customers c
            on c.id = s.customer_id
          where s.record_type = 'sale'
            and s.general_status
              <> 'cancelled'
            and s.payment_status
              = 'receivable'
            and coalesce(c.name, '')
              not in(
                'Igor Candinho',
                'Brinde'
              )
            and coalesce(
              s.payment_due_at,
              s.quoted_at::date
            ) <= v_month_end
        ),
        0
      )
      +
      coalesce(
        (
          select
            sum(total_amount)
          from public.fitness_sales
          where general_status
            <> 'cancelled'
            and payment_status
              = 'receivable'
            and coalesce(
              payment_due_on,
              quoted_on
            ) <= v_month_end
        ),
        0
      )
    )::numeric(14,2)
  into v_operation_receivables;

  select
    coalesce(
      sum(stock_cost_value),
      0
    )::numeric(14,2)
  into v_supp_stock
  from public.inventory_control_overview;

  select
    coalesce(
      sum(
        sb.quantity
        * fv.cost_price
      ),
      0
    )::numeric(14,2)
  into v_fit_stock
  from public.fitness_stock_balances sb
  join public.fitness_variants fv
    on fv.id = sb.variant_id
  where fv.active = true;

  select
    coalesce(
      sum(
        greatest(
          original_amount - total_paid,
          0
        )
      ) filter (
        where status in(
          'active',
          'paused'
        )
          and (
            lower(
              coalesce(origin, '')
            ) like '%company%'
            or lower(
              coalesce(origin, '')
            ) like '%candinho%'
          )
      ),
      0
    )::numeric(14,2),
    coalesce(
      sum(
        greatest(
          original_amount - total_paid,
          0
        )
      ) filter (
        where status in(
          'active',
          'paused'
        )
      ),
      0
    )::numeric(14,2)
  into
    v_company_debt,
    v_total_debt
  from public.bank_debts;

  select
    total_expected_income,
    total_commitments,
    projected_result
  into
    v_projected_income,
    v_projected_commitments,
    v_projected_result
  from public.bank_get_annual_projection(
    v_month,
    1
  )
  limit 1;

  insert into public.bank_month_closures(
    reference_month,
    closed_on,
    total_balance,
    company_cash_balance,
    bank_receivables,
    operation_receivables,
    supplements_stock_cost,
    fitness_stock_cost,
    company_debt_remaining,
    total_debt_remaining,
    projected_income,
    projected_commitments,
    projected_result,
    operational_net_position,
    total_net_position,
    notes,
    created_by,
    updated_by
  )
  values(
    v_month,
    v_today,
    v_total_balance,
    v_company_cash,
    v_bank_receivables,
    v_operation_receivables,
    v_supp_stock,
    v_fit_stock,
    v_company_debt,
    v_total_debt,
    coalesce(v_projected_income, 0),
    coalesce(v_projected_commitments, 0),
    coalesce(v_projected_result, 0),
    (
      v_company_cash
      + v_supp_stock
      + v_fit_stock
      + v_operation_receivables
      - v_company_debt
    )::numeric(14,2),
    (
      v_total_balance
      + v_supp_stock
      + v_fit_stock
      + v_bank_receivables
      + v_operation_receivables
      - v_total_debt
    )::numeric(14,2),
    nullif(
      btrim(p_notes),
      ''
    ),
    auth.uid(),
    auth.uid()
  )
  on conflict(reference_month)
  do update set
    closed_on =
      excluded.closed_on,
    total_balance =
      excluded.total_balance,
    company_cash_balance =
      excluded.company_cash_balance,
    bank_receivables =
      excluded.bank_receivables,
    operation_receivables =
      excluded.operation_receivables,
    supplements_stock_cost =
      excluded.supplements_stock_cost,
    fitness_stock_cost =
      excluded.fitness_stock_cost,
    company_debt_remaining =
      excluded.company_debt_remaining,
    total_debt_remaining =
      excluded.total_debt_remaining,
    projected_income =
      excluded.projected_income,
    projected_commitments =
      excluded.projected_commitments,
    projected_result =
      excluded.projected_result,
    operational_net_position =
      excluded.operational_net_position,
    total_net_position =
      excluded.total_net_position,
    notes =
      excluded.notes,
    updated_by =
      auth.uid(),
    updated_at =
      now()
  returning id
  into v_id;

  return v_id;
end;
$function$;

commit;
