-- Estrutura de auditoria para correções pós-importação e indicadores comerciais oficiais.

create table if not exists appsheet_import.data_correction_runs (
  id uuid primary key default gen_random_uuid(),
  correction_key text not null unique,
  source_filename text not null,
  source_sha256 text not null,
  status text not null check (status in ('applying', 'applied', 'rolled_back')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  rolled_back_at timestamptz
);

create table if not exists appsheet_import.data_correction_preimages (
  run_id uuid not null references appsheet_import.data_correction_runs(id) on delete cascade,
  entity_type text not null,
  entity_key text not null,
  before_data jsonb,
  after_data jsonb,
  captured_at timestamptz not null default now(),
  primary key (run_id, entity_type, entity_key)
);

create or replace view public.commercial_sales
with (security_invoker = true)
as
select
  s.*,
  c.name as customer_name
from public.sales s
left join public.customers c on c.id = s.customer_id
where s.record_type = 'sale'
  and s.general_status <> 'cancelled'
  and coalesce(c.name, '') <> all (array['Igor Candinho', 'Brinde']);

create or replace view public.commercial_dashboard_summary
with (security_invoker = true)
as
with commercial as (
  select * from public.commercial_sales
), period_bounds as (
  select
    date_trunc('month', current_date)::date as current_month_start,
    (date_trunc('month', current_date) + interval '1 month')::date as next_month_start,
    (date_trunc('month', current_date) - interval '1 month')::date as previous_month_start
), stock as (
  select
    coalesce(sum(sb.quantity) filter (where p.active), 0)::bigint as operational_units,
    coalesce(sum(sb.quantity), 0)::bigint as all_units,
    coalesce(sum(sb.quantity * p.cost_price) filter (where p.active), 0)::numeric(12,2) as stock_cost_value,
    coalesce(sum(sb.quantity * p.sale_price) filter (where p.active), 0)::numeric(12,2) as stock_sale_value
  from public.stock_balances sb
  join public.products p on p.id = sb.product_id
  join public.locations l on l.id = sb.location_id
  where l.active and l.tracks_inventory
)
select
  count(*)::integer as total_sales,
  coalesce(sum(commercial.total_amount), 0)::numeric(12,2) as total_revenue,
  coalesce(sum(commercial.total_profit), 0)::numeric(12,2) as total_profit,
  coalesce(sum(commercial.total_amount) filter (where commercial.paid_at is null), 0)::numeric(12,2) as receivable_total,
  count(*) filter (where commercial.paid_at is null)::integer as receivable_sales,
  count(*) filter (
    where commercial.delivered_at::date >= b.current_month_start
      and commercial.delivered_at::date < b.next_month_start
  )::integer as current_month_sales,
  coalesce(sum(commercial.total_amount) filter (
    where commercial.delivered_at::date >= b.current_month_start
      and commercial.delivered_at::date < b.next_month_start
  ), 0)::numeric(12,2) as current_month_revenue,
  coalesce(sum(commercial.total_profit) filter (
    where commercial.delivered_at::date >= b.current_month_start
      and commercial.delivered_at::date < b.next_month_start
  ), 0)::numeric(12,2) as current_month_profit,
  count(*) filter (
    where commercial.delivered_at::date >= b.previous_month_start
      and commercial.delivered_at::date < b.current_month_start
  )::integer as previous_month_sales,
  coalesce(sum(commercial.total_amount) filter (
    where commercial.delivered_at::date >= b.previous_month_start
      and commercial.delivered_at::date < b.current_month_start
  ), 0)::numeric(12,2) as previous_month_revenue,
  coalesce(sum(commercial.total_profit) filter (
    where commercial.delivered_at::date >= b.previous_month_start
      and commercial.delivered_at::date < b.current_month_start
  ), 0)::numeric(12,2) as previous_month_profit,
  st.operational_units,
  st.all_units,
  st.stock_cost_value,
  st.stock_sale_value,
  (st.stock_sale_value - st.stock_cost_value)::numeric(12,2) as stock_potential_profit
from commercial
cross join period_bounds b
cross join stock st
group by
  b.current_month_start,
  b.next_month_start,
  b.previous_month_start,
  st.operational_units,
  st.all_units,
  st.stock_cost_value,
  st.stock_sale_value;

revoke all on public.commercial_sales, public.commercial_dashboard_summary from anon;
grant select on public.commercial_sales, public.commercial_dashboard_summary to authenticated;
