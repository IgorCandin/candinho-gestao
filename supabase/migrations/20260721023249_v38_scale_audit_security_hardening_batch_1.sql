begin;

revoke all on function public.central_can_manage_demand_gaps() from anon, public;
revoke all on function public.central_can_manage_strategic_agenda() from anon, public;
revoke all on function public.central_generate_strategic_agenda_month(date) from anon, public;
revoke all on function public.enforce_product_flavor_activation_guard() from anon, public;
revoke all on function public.fitness_refresh_quote_totals() from anon, public;
revoke all on function public.queue_post_sale_google_calendar_sync() from anon, public;
revoke all on function public.queue_strategic_agenda_google_calendar_sync() from anon, public;
revoke all on function public.require_product_flavor_when_enabled() from anon, public;
revoke all on function public.sync_post_sale_batch_trigger() from anon, public;

grant execute on function public.central_can_manage_demand_gaps() to authenticated, service_role;
grant execute on function public.central_can_manage_strategic_agenda() to authenticated, service_role;
grant execute on function public.central_generate_strategic_agenda_month(date) to authenticated, service_role;
grant execute on function public.enforce_product_flavor_activation_guard() to authenticated, service_role;
grant execute on function public.fitness_refresh_quote_totals() to authenticated, service_role;
grant execute on function public.queue_post_sale_google_calendar_sync() to authenticated, service_role;
grant execute on function public.queue_strategic_agenda_google_calendar_sync() to authenticated, service_role;
grant execute on function public.require_product_flavor_when_enabled() to authenticated, service_role;
grant execute on function public.sync_post_sale_batch_trigger() to authenticated, service_role;

commit;
