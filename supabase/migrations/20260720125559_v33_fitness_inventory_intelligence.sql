-- Candinho Company V33
-- Inteligência de estoque Fitness: Curva ABC, variações, excesso e consignação.
-- Já aplicado diretamente no Supabase de produção.

begin;

create or replace view public.fitness_inventory_intelligence_overview
with (security_invoker = true)
as
with sales_metrics as (
  select
    fsi.variant_id,
    max(fs.quoted_on) filter (
      where fs.general_status<>'cancelled'
    ) as last_sale_on,
    coalesce(sum(fsi.quantity) filter (
      where fs.general_status<>'cancelled'
        and fs.quoted_on >=
          (now() at time zone 'America/Sao_Paulo')::date-30
    ),0)::integer as units_30d,
    coalesce(sum(fsi.quantity) filter (
      where fs.general_status<>'cancelled'
        and fs.quoted_on >=
          (now() at time zone 'America/Sao_Paulo')::date-60
    ),0)::integer as units_60d,
    coalesce(sum(fsi.quantity) filter (
      where fs.general_status<>'cancelled'
        and fs.quoted_on >=
          (now() at time zone 'America/Sao_Paulo')::date-90
    ),0)::integer as units_90d,
    coalesce(sum(fsi.quantity*fsi.unit_price) filter (
      where fs.general_status<>'cancelled'
        and fs.quoted_on >=
          (now() at time zone 'America/Sao_Paulo')::date-90
    ),0)::numeric(12,2) as revenue_90d,
    coalesce(sum(
      fsi.quantity
      *greatest(fsi.unit_price-fsi.unit_cost,0)
    ) filter (
      where fs.general_status<>'cancelled'
        and fs.quoted_on >=
          (now() at time zone 'America/Sao_Paulo')::date-90
    ),0)::numeric(12,2) as profit_90d
  from public.fitness_sale_items fsi
  join public.fitness_sales fs
    on fs.id=fsi.sale_id
  group by fsi.variant_id
),
consignment_metrics as (
  select
    fci.variant_id,
    coalesce(sum(
      greatest(
        fci.quantity_sent
        -fci.quantity_returned
        -fci.quantity_sold,
        0
      )
    ) filter (
      where fc.status in ('open','partial')
    ),0)::integer as open_consigned_quantity,
    coalesce(sum(
      greatest(
        fci.quantity_sent
        -fci.quantity_returned
        -fci.quantity_sold,
        0
      )
    ) filter (
      where fc.status in ('open','partial')
        and fc.expected_return_on is not null
        and fc.expected_return_on <
          (now() at time zone 'America/Sao_Paulo')::date
    ),0)::integer as overdue_consigned_quantity,
    count(distinct fc.id) filter (
      where fc.status in ('open','partial')
        and fc.expected_return_on is not null
        and fc.expected_return_on <
          (now() at time zone 'America/Sao_Paulo')::date
        and greatest(
          fci.quantity_sent
          -fci.quantity_returned
          -fci.quantity_sold,
          0
        )>0
    )::integer as overdue_consignment_count
  from public.fitness_consignment_items fci
  join public.fitness_consignments fc
    on fc.id=fci.consignment_id
  group by fci.variant_id
),
base as (
  select
    fso.variant_id,
    fso.product_id,
    fso.product_name,
    fso.category,
    fso.image_url,
    fso.size,
    fso.color,
    fso.sku,
    fso.cost_price,
    fso.sale_price,
    fso.minimum_stock,
    fso.reorder_target,
    fso.default_supplier_id,
    fso.default_supplier_name,
    fso.physical_quantity,
    fso.reserved_quantity,
    fso.available_quantity,
    fso.incoming_quantity,
    fso.consigned_quantity,
    fso.stock_cost_value,
    fso.stock_sale_value,
    fso.stock_status,
    fso.operational_status,
    fso.quantity_below_minimum,
    fso.suggested_reorder_quantity,
    fv.created_at as variant_created_at,
    greatest(
      (
        (now() at time zone 'America/Sao_Paulo')::date
        -(fv.created_at at time zone 'America/Sao_Paulo')::date
      ),
      0
    )::integer as variant_age_days,
    coalesce(sm.units_30d,0)::integer as units_30d,
    coalesce(sm.units_60d,0)::integer as units_60d,
    coalesce(sm.units_90d,0)::integer as units_90d,
    coalesce(sm.revenue_90d,0)::numeric(12,2) as revenue_90d,
    coalesce(sm.profit_90d,0)::numeric(12,2) as profit_90d,
    sm.last_sale_on,
    case
      when sm.last_sale_on is null
        then null
      else greatest(
        (now() at time zone 'America/Sao_Paulo')::date
        -sm.last_sale_on,
        0
      )::integer
    end as days_since_last_sale,
    coalesce(
      cm.open_consigned_quantity,
      fso.consigned_quantity,
      0
    )::integer as open_consigned_quantity,
    coalesce(
      cm.overdue_consigned_quantity,
      0
    )::integer as overdue_consigned_quantity,
    coalesce(
      cm.overdue_consignment_count,
      0
    )::integer as overdue_consignment_count,
    (
      greatest(
        coalesce(sm.units_30d,0),
        0
      )::numeric/30*0.60
      +greatest(
        coalesce(sm.units_60d,0)
        -coalesce(sm.units_30d,0),
        0
      )::numeric/30*0.25
      +greatest(
        coalesce(sm.units_90d,0)
        -coalesce(sm.units_60d,0),
        0
      )::numeric/30*0.15
    )::numeric(12,4)
      as weighted_daily_demand,
    greatest(
      fso.available_quantity
      +fso.incoming_quantity
      -fso.reorder_target,
      0
    )::integer as excess_units,
    (
      greatest(
        fso.available_quantity
        +fso.incoming_quantity
        -fso.reorder_target,
        0
      )
      *fso.cost_price
    )::numeric(12,2)
      as excess_capital
  from public.fitness_stock_operational fso
  join public.fitness_variants fv
    on fv.id=fso.variant_id
  left join sales_metrics sm
    on sm.variant_id=fso.variant_id
  left join consignment_metrics cm
    on cm.variant_id=fso.variant_id
  where fso.product_active
    and fso.variant_active
),
with_coverage as (
  select
    b.*,
    case
      when b.weighted_daily_demand>0
        then round(
          b.available_quantity::numeric
          /b.weighted_daily_demand,
          1
        )
      else null
    end as coverage_days,
    (
      b.physical_quantity>0
      and (
        (
          b.last_sale_on is null
          and b.variant_age_days>=60
        )
        or b.days_since_last_sale>=60
      )
    ) as slow_stock_60d,
    (
      b.physical_quantity>0
      and (
        (
          b.last_sale_on is null
          and b.variant_age_days>=90
        )
        or b.days_since_last_sale>=90
      )
    ) as stagnant_stock_90d
  from base b
),
product_revenue as (
  select
    product_id,
    max(product_name)
      as product_name,
    sum(revenue_90d)::numeric(12,2)
      as product_revenue_90d,
    sum(stock_cost_value)::numeric(12,2)
      as product_stock_cost
  from with_coverage
  group by product_id
),
product_ranked as (
  select
    pr.*,
    sum(product_revenue_90d) over()
      as total_revenue_90d,
    sum(product_revenue_90d) over(
      order by
        product_revenue_90d desc,
        product_name
      rows between unbounded preceding
      and current row
    ) as cumulative_revenue_90d
  from product_revenue pr
),
product_class as (
  select
    pr.*,
    case
      when product_revenue_90d<=0
        or total_revenue_90d<=0
        then 'N'
      when cumulative_revenue_90d
        /total_revenue_90d<=0.80
        then 'A'
      when cumulative_revenue_90d
        /total_revenue_90d<=0.95
        then 'B'
      else 'C'
    end as abc_class,
    case
      when total_revenue_90d>0
        then round(
          (
            product_revenue_90d
            /total_revenue_90d
          )*100,
          2
        )
      else 0
    end::numeric(8,2)
      as product_revenue_share_pct
  from product_ranked pr
),
classified as (
  select
    wc.*,
    pc.abc_class,
    pc.product_revenue_90d,
    pc.product_revenue_share_pct,
    (
      wc.excess_units>0
      and (
        wc.revenue_90d=0
        or coalesce(
          wc.coverage_days,
          0
        )>60
      )
    ) as overstock
  from with_coverage wc
  join product_class pc
    on pc.product_id=wc.product_id
)
select
  c.*,
  case
    when c.overdue_consigned_quantity>0
      then 'consignment_overdue'
    when c.operational_status='out_of_stock'
      and (
        c.reorder_target>0
        or c.units_90d>0
      )
      then 'stockout_critical'
    when c.operational_status='low_stock'
      then 'reorder_attention'
    when c.stagnant_stock_90d
      then 'stagnant'
    when c.overstock
      then 'overstock'
    when c.slow_stock_60d
      then 'slow'
    when c.open_consigned_quantity>0
      then 'consigned'
    else 'healthy'
  end as top_action,
  case
    when c.overdue_consigned_quantity>0
      then 1
    when c.operational_status='out_of_stock'
      and (
        c.reorder_target>0
        or c.units_90d>0
      )
      then 2
    when c.operational_status='low_stock'
      then 3
    when c.stagnant_stock_90d
      then 4
    when c.overstock
      then 5
    when c.slow_stock_60d
      then 6
    when c.open_consigned_quantity>0
      then 7
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
on public.fitness_inventory_intelligence_overview
to authenticated,service_role;

revoke all
on public.fitness_inventory_intelligence_overview
from anon;

create or replace function
public.fitness_inventory_intelligence_snapshot()
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
       or v_profile.can_access_fitness
     )
  then
    raise exception 'Acesso negado';
  end if;

  select jsonb_build_object(
    'total_variants',
      count(*),
    'total_products',
      count(distinct product_id),
    'variants_with_stock',
      count(*) filter(
        where physical_quantity>0
      ),
    'stock_cost_value',
      coalesce(
        sum(stock_cost_value),
        0
      ),
    'out_of_stock_variants',
      count(*) filter(
        where operational_status='out_of_stock'
      ),
    'low_stock_variants',
      count(*) filter(
        where operational_status='low_stock'
      ),
    'stagnant_variants_90d',
      count(*) filter(
        where stagnant_stock_90d
      ),
    'stagnant_capital_90d',
      coalesce(
        sum(stagnant_capital_90d),
        0
      ),
    'slow_variants_60d',
      count(*) filter(
        where slow_stock_60d
      ),
    'excess_variants',
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
    'consigned_units',
      coalesce(
        sum(open_consigned_quantity),
        0
      ),
    'overdue_consigned_units',
      coalesce(
        sum(overdue_consigned_quantity),
        0
      ),
    'overdue_consignments',
      coalesce(
        sum(overdue_consignment_count),
        0
      ),
    'action_variants',
      count(*) filter(
        where top_action<>'healthy'
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
  from public.fitness_inventory_intelligence_overview;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        x.action_priority,
        greatest(
          x.stagnant_capital_90d,
          x.excess_capital
        ) desc,
        x.revenue_90d desc,
        x.product_name,
        x.color,
        x.size
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.fitness_inventory_intelligence_overview x;

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
      count(distinct product_id)::integer
        as products,
      sum(revenue_90d)::numeric(12,2)
        as revenue_90d,
      sum(stock_cost_value)::numeric(12,2)
        as stock_cost_value,
      sum(physical_quantity)::integer
        as physical_units
    from public.fitness_inventory_intelligence_overview
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
on function public.fitness_inventory_intelligence_snapshot()
from public,anon;

grant execute
on function public.fitness_inventory_intelligence_snapshot()
to authenticated,service_role;

commit;
