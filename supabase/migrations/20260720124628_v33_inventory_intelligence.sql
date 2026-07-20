-- Candinho Company V33
-- Inteligência de estoque: Curva ABC, capital parado, excesso e prioridades.
-- Já aplicado diretamente no Supabase de produção.

begin;

create or replace view public.inventory_intelligence_overview
with (security_invoker = true)
as
with sales_metrics as (
  select
    si.product_id,
    max(s.quoted_at) filter (
      where s.record_type='sale'
        and s.general_status<>'cancelled'
    ) as last_sale_at_all,
    coalesce(sum(si.quantity) filter (
      where s.record_type='sale'
        and s.general_status<>'cancelled'
        and s.quoted_at >= now()-interval '30 days'
    ),0)::integer as units_30d,
    coalesce(sum(si.quantity) filter (
      where s.record_type='sale'
        and s.general_status<>'cancelled'
        and s.quoted_at >= now()-interval '90 days'
    ),0)::integer as units_90d,
    coalesce(sum(si.total_price) filter (
      where s.record_type='sale'
        and s.general_status<>'cancelled'
        and s.quoted_at >= now()-interval '90 days'
    ),0)::numeric(12,2) as revenue_90d,
    coalesce(sum(si.total_profit) filter (
      where s.record_type='sale'
        and s.general_status<>'cancelled'
        and s.quoted_at >= now()-interval '90 days'
    ),0)::numeric(12,2) as profit_90d
  from public.sale_items si
  join public.sales s
    on s.id=si.sale_id
  group by si.product_id
),
lot_metrics as (
  select
    product_id,
    coalesce(sum(quantity_on_hand) filter (
      where expiry_status='expired'
    ),0)::integer as expired_units,
    coalesce(sum(quantity_on_hand) filter (
      where expiry_status='expires_30'
    ),0)::integer as expires_30_units,
    coalesce(sum(quantity_on_hand) filter (
      where expiry_status='expires_60'
    ),0)::integer as expires_60_units,
    coalesce(sum(quantity_on_hand) filter (
      where expiry_status='expires_90'
    ),0)::integer as expires_90_units,
    coalesce(sum(quantity_on_hand) filter (
      where expiry_status='quarantined'
    ),0)::integer as quarantined_units
  from public.inventory_lot_overview
  group by product_id
),
base as (
  select
    ppo.product_id,
    ppo.product_name,
    ppo.category,
    ppo.brand,
    ppo.image_url,
    ppo.cost_price,
    ppo.sale_price,
    ppo.min_stock,
    ppo.ideal_stock,
    ppo.supplier_id,
    ppo.supplier_name,
    ppo.lead_time_days,
    ppo.target_cover_days,
    ppo.flavor_tracking_enabled,
    p.lot_tracking_enabled,
    p.created_at as product_created_at,
    greatest(
      (
        (now() at time zone 'America/Sao_Paulo')::date
        -(p.created_at at time zone 'America/Sao_Paulo')::date
      ),
      0
    )::integer as product_age_days,
    ppo.physical_quantity,
    ppo.reserved_quantity,
    ppo.available_quantity,
    ppo.incoming_quantity,
    ppo.backlog_quantity,
    ppo.weighted_daily_demand,
    ppo.coverage_days,
    ppo.target_units,
    ppo.suggested_order_quantity,
    ppo.estimated_order_cost,
    ppo.purchase_priority,
    ppo.estimated_stockout_on,
    coalesce(sm.units_30d,0)::integer as units_30d,
    coalesce(sm.units_90d,0)::integer as units_90d,
    coalesce(sm.revenue_90d,0)::numeric(12,2) as revenue_90d,
    coalesce(sm.profit_90d,0)::numeric(12,2) as profit_90d,
    sm.last_sale_at_all,
    case
      when sm.last_sale_at_all is null
        then null
      else greatest(
        (
          (now() at time zone 'America/Sao_Paulo')::date
          -(sm.last_sale_at_all at time zone 'America/Sao_Paulo')::date
        ),
        0
      )::integer
    end as days_since_last_sale,
    coalesce(lm.expired_units,0)::integer as expired_units,
    coalesce(lm.expires_30_units,0)::integer as expires_30_units,
    coalesce(lm.expires_60_units,0)::integer as expires_60_units,
    coalesce(lm.expires_90_units,0)::integer as expires_90_units,
    coalesce(lm.quarantined_units,0)::integer as quarantined_units,
    (
      ppo.physical_quantity
      *ppo.cost_price
    )::numeric(12,2) as stock_cost_value,
    greatest(
      ppo.available_quantity
      +ppo.incoming_quantity
      -ppo.target_units,
      0
    )::integer as excess_units,
    (
      greatest(
        ppo.available_quantity
        +ppo.incoming_quantity
        -ppo.target_units,
        0
      )
      *ppo.cost_price
    )::numeric(12,2) as excess_capital
  from public.purchase_planning_overview ppo
  join public.products p
    on p.id=ppo.product_id
  left join sales_metrics sm
    on sm.product_id=ppo.product_id
  left join lot_metrics lm
    on lm.product_id=ppo.product_id
),
ranked as (
  select
    b.*,
    sum(b.revenue_90d) over()
      as total_revenue_90d,
    sum(b.revenue_90d) over(
      order by
        b.revenue_90d desc,
        b.product_name
      rows between unbounded preceding
      and current row
    ) as cumulative_revenue_90d
  from base b
),
classified as (
  select
    r.*,
    case
      when r.revenue_90d<=0
        or r.total_revenue_90d<=0
        then 'N'
      when
        r.cumulative_revenue_90d
        /r.total_revenue_90d<=0.80
        then 'A'
      when
        r.cumulative_revenue_90d
        /r.total_revenue_90d<=0.95
        then 'B'
      else 'C'
    end as abc_class,
    case
      when r.total_revenue_90d>0
        then round(
          (
            r.revenue_90d
            /r.total_revenue_90d
          )*100,
          2
        )
      else 0
    end::numeric(8,2)
      as revenue_share_pct,
    case
      when r.total_revenue_90d>0
        then round(
          (
            r.cumulative_revenue_90d
            /r.total_revenue_90d
          )*100,
          2
        )
      else 0
    end::numeric(8,2)
      as cumulative_revenue_share_pct,
    (
      r.physical_quantity>0
      and (
        (
          r.last_sale_at_all is null
          and r.product_age_days>=60
        )
        or r.days_since_last_sale>=60
      )
    ) as slow_stock_60d,
    (
      r.physical_quantity>0
      and (
        (
          r.last_sale_at_all is null
          and r.product_age_days>=90
        )
        or r.days_since_last_sale>=90
      )
    ) as stagnant_stock_90d,
    (
      r.excess_units>0
      and (
        r.revenue_90d=0
        or coalesce(r.coverage_days,0)
          >greatest(
            r.target_cover_days*2,
            60
          )
      )
    ) as overstock
  from ranked r
)
select
  c.*,
  case
    when c.expired_units>0
      then 'expired'
    when c.expires_30_units>0
      then 'expiry_30'
    when c.purchase_priority='critical'
      then 'stockout_critical'
    when c.purchase_priority='urgent'
      then 'reorder_urgent'
    when c.stagnant_stock_90d
      then 'stagnant'
    when c.overstock
      then 'overstock'
    when c.purchase_priority='attention'
      then 'reorder_attention'
    when c.expires_60_units>0
      then 'expiry_60'
    when c.slow_stock_60d
      then 'slow'
    when c.expires_90_units>0
      then 'expiry_90'
    else 'healthy'
  end as top_action,
  case
    when c.expired_units>0 then 1
    when c.expires_30_units>0 then 2
    when c.purchase_priority='critical' then 3
    when c.purchase_priority='urgent' then 4
    when c.stagnant_stock_90d then 5
    when c.overstock then 6
    when c.purchase_priority='attention' then 7
    when c.expires_60_units>0 then 8
    when c.slow_stock_60d then 9
    when c.expires_90_units>0 then 10
    else 99
  end::integer as action_priority,
  case
    when c.stagnant_stock_90d
      then c.stock_cost_value
    else 0
  end::numeric(12,2)
    as stagnant_capital_90d
from classified c;

grant select
on public.inventory_intelligence_overview
to authenticated,service_role;

revoke all
on public.inventory_intelligence_overview
from anon;

create or replace function
public.inventory_intelligence_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_summary jsonb;
  v_rows jsonb;
  v_abc jsonb;
begin
  select *
  into v_profile
  from public.profiles
  where id=auth.uid()
    and active=true;

  if not found
     or not (
       v_profile.role='admin'
       or v_profile.can_access_supplements
     )
  then
    raise exception 'Acesso negado';
  end if;

  select jsonb_build_object(
    'total_products',
      count(*),
    'products_with_stock',
      count(*) filter(
        where physical_quantity>0
      ),
    'stock_cost_value',
      coalesce(
        sum(stock_cost_value),
        0
      ),
    'stagnant_products_90d',
      count(*) filter(
        where stagnant_stock_90d
      ),
    'stagnant_capital_90d',
      coalesce(
        sum(stagnant_capital_90d),
        0
      ),
    'slow_products_60d',
      count(*) filter(
        where slow_stock_60d
      ),
    'excess_products',
      count(*) filter(
        where overstock
      ),
    'excess_capital',
      coalesce(
        sum(excess_capital) filter(
          where overstock
        ),
        0
      ),
    'critical_products',
      count(*) filter(
        where purchase_priority='critical'
      ),
    'urgent_products',
      count(*) filter(
        where purchase_priority='urgent'
      ),
    'attention_products',
      count(*) filter(
        where purchase_priority='attention'
      ),
    'expired_units',
      coalesce(
        sum(expired_units),
        0
      ),
    'expires_30_units',
      coalesce(
        sum(expires_30_units),
        0
      ),
    'expires_60_units',
      coalesce(
        sum(expires_60_units),
        0
      ),
    'expires_90_units',
      coalesce(
        sum(expires_90_units),
        0
      ),
    'quarantined_units',
      coalesce(
        sum(quarantined_units),
        0
      ),
    'action_products',
      count(*) filter(
        where top_action<>'healthy'
      ),
    'abc_a',
      count(*) filter(
        where abc_class='A'
      ),
    'abc_b',
      count(*) filter(
        where abc_class='B'
      ),
    'abc_c',
      count(*) filter(
        where abc_class='C'
      ),
    'abc_n',
      count(*) filter(
        where abc_class='N'
      ),
    'revenue_90d',
      coalesce(
        sum(revenue_90d),
        0
      ),
    'profit_90d',
      coalesce(
        sum(profit_90d),
        0
      )
  )
  into v_summary
  from public.inventory_intelligence_overview;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        x.action_priority,
        greatest(
          x.stagnant_capital_90d,
          x.excess_capital,
          x.estimated_order_cost
        ) desc,
        x.revenue_90d desc,
        x.product_name
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.inventory_intelligence_overview x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'abc_class',
          z.abc_class,
        'products',
          z.products,
        'revenue_90d',
          z.revenue_90d,
        'stock_cost_value',
          z.stock_cost_value,
        'physical_units',
          z.physical_units
      )
      order by
        case z.abc_class
          when 'A' then 1
          when 'B' then 2
          when 'C' then 3
          else 4
        end
    ),
    '[]'::jsonb
  )
  into v_abc
  from (
    select
      abc_class,
      count(*)::integer
        as products,
      coalesce(
        sum(revenue_90d),
        0
      )::numeric(12,2)
        as revenue_90d,
      coalesce(
        sum(stock_cost_value),
        0
      )::numeric(12,2)
        as stock_cost_value,
      coalesce(
        sum(physical_quantity),
        0
      )::integer
        as physical_units
    from public.inventory_intelligence_overview
    group by abc_class
  ) z;

  return jsonb_build_object(
    'generated_at',
      now(),
    'summary',
      coalesce(
        v_summary,
        '{}'::jsonb
      ),
    'abc',
      v_abc,
    'rows',
      v_rows
  );
end;
$$;

revoke all
on function public.inventory_intelligence_snapshot()
from public,anon;

grant execute
on function public.inventory_intelligence_snapshot()
to authenticated,service_role;

commit;
