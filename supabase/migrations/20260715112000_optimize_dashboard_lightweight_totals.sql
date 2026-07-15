create or replace view public.dashboard_lightweight_totals
with (security_invoker = true)
as
select
  coalesce((select sum(cs.total_amount) from public.commercial_sales cs), 0)::numeric(12,2) as total_revenue,
  (select count(*)::integer from public.products p where p.active) as active_products_count,
  coalesce((select sum(po.total_amount) from public.pending_orders po), 0)::numeric(12,2) as pending_orders_value;

grant select on public.dashboard_lightweight_totals to authenticated;
revoke all on public.dashboard_lightweight_totals from anon;
