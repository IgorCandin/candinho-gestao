revoke all on public.customer_opportunity_radar_v2 from authenticated,service_role;
revoke all on public.customer_opportunity_radar_summary from authenticated,service_role;
revoke all on public.customer_opportunity_radar_v3 from authenticated,service_role;
revoke all on public.customer_opportunity_radar_summary_v3 from authenticated,service_role;
grant select on public.customer_opportunity_radar_v2 to authenticated,service_role;
grant select on public.customer_opportunity_radar_summary to authenticated,service_role;
grant select on public.customer_opportunity_radar_v3 to authenticated,service_role;
grant select on public.customer_opportunity_radar_summary_v3 to authenticated,service_role;
