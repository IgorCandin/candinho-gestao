alter view public.commercial_dashboard_summary set (security_invoker = true);
alter view public.pending_orders set (security_invoker = true);
alter view public.dashboard_operational_summary set (security_invoker = true);
alter view public.dashboard_priority_items set (security_invoker = true);
