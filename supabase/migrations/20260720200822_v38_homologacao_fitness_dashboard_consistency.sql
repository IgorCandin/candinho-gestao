begin;

create or replace view public.fitness_dashboard_summary
with (security_invoker = true)
as
with period_bounds as (
  select
    date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date as current_month_start,
    (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) + interval '1 month')::date as next_month_start
),
sales as (
  select
    count(*) filter (
      where fs.general_status <> 'cancelled'
        and fs.delivered_on >= b.current_month_start
        and fs.delivered_on < b.next_month_start
    )::integer as month_sales,
    coalesce(sum(fs.total_amount) filter (
      where fs.general_status <> 'cancelled'
        and fs.delivered_on >= b.current_month_start
        and fs.delivered_on < b.next_month_start
    ), 0)::numeric(12,2) as month_revenue,
    coalesce(sum(fs.total_profit) filter (
      where fs.general_status <> 'cancelled'
        and fs.delivered_on >= b.current_month_start
        and fs.delivered_on < b.next_month_start
    ), 0)::numeric(12,2) as month_profit,
    count(*) filter (
      where fs.general_status <> 'cancelled'
        and fs.delivery_status = 'to_deliver'
    )::integer as pending_delivery,
    count(*) filter (
      where fs.general_status <> 'cancelled'
        and fs.payment_status = 'receivable'
    )::integer as pending_payment,
    coalesce(sum(fs.total_amount) filter (
      where fs.general_status <> 'cancelled'
        and fs.payment_status = 'receivable'
    ), 0)::numeric(12,2) as receivable_total
  from public.fitness_sales fs
  cross join period_bounds b
),
stock as (
  select
    count(*) filter (where fso.physical_quantity > 0)::integer as variants_with_stock,
    coalesce(sum(fso.physical_quantity), 0)::integer as physical_units,
    coalesce(sum(fso.reserved_quantity), 0)::integer as reserved_units,
    coalesce(sum(fso.available_quantity), 0)::integer as available_units,
    coalesce(sum(fso.incoming_quantity), 0)::integer as incoming_units,
    coalesce(sum(fso.stock_cost_value), 0)::numeric(12,2) as stock_cost_value,
    coalesce(sum(fso.stock_sale_value), 0)::numeric(12,2) as stock_sale_value,
    count(*) filter (
      where fso.operational_status in ('incoming','out_of_stock','low_stock')
    )::integer as attention_variants
  from public.fitness_stock_operational fso
  where fso.product_active
    and fso.variant_active
),
orders as (
  select
    count(*) filter (
      where fpo.status in ('pending','partial')
    )::integer as open_orders
  from public.fitness_purchase_orders fpo
)
select
  sales.month_sales,
  sales.month_revenue,
  sales.month_profit,
  sales.pending_delivery,
  sales.pending_payment,
  sales.receivable_total,
  stock.variants_with_stock,
  stock.physical_units,
  stock.reserved_units,
  stock.available_units,
  stock.incoming_units,
  stock.stock_cost_value,
  stock.stock_sale_value,
  stock.attention_variants,
  orders.open_orders
from sales
cross join stock
cross join orders;

create or replace view public.fitness_dashboard_summary_v2
with (security_invoker = true)
as
select
  d.month_sales,
  d.month_revenue,
  d.month_profit,
  d.pending_delivery,
  d.pending_payment,
  d.receivable_total,
  d.variants_with_stock,
  d.physical_units,
  d.reserved_units,
  d.available_units,
  d.incoming_units,
  d.stock_cost_value,
  d.stock_sale_value,
  d.attention_variants,
  d.open_orders,
  (
    select count(*)::integer
    from public.fitness_customers fc
    where fc.active
  ) as active_customers,
  (
    select count(*)::integer
    from public.fitness_stock_operational fso
    where fso.product_active
      and fso.variant_active
      and fso.operational_status = 'low_stock'
  ) as low_stock_variants,
  (
    select count(*)::integer
    from public.fitness_stock_overview fso
    where fso.product_active
      and fso.variant_active
      and fso.stock_status = 'out_of_stock'
  ) as out_of_stock_variants
from public.fitness_dashboard_summary d;

grant select on public.fitness_dashboard_summary to authenticated, service_role;
grant select on public.fitness_dashboard_summary_v2 to authenticated, service_role;
revoke all on public.fitness_dashboard_summary from anon;
revoke all on public.fitness_dashboard_summary_v2 from anon;

commit;
