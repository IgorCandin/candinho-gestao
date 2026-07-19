alter policy dashboard_priority_preferences_delete_own
on public.dashboard_priority_preferences
using ((user_id = (select auth.uid())) and can_access_operation('supplements'::text));

alter policy dashboard_priority_preferences_insert_own
on public.dashboard_priority_preferences
with check ((user_id = (select auth.uid())) and can_access_operation('supplements'::text));

alter policy dashboard_priority_preferences_read_own
on public.dashboard_priority_preferences
using (user_id = (select auth.uid()));

alter policy dashboard_priority_preferences_update_own
on public.dashboard_priority_preferences
using ((user_id = (select auth.uid())) and can_access_operation('supplements'::text))
with check ((user_id = (select auth.uid())) and can_access_operation('supplements'::text));
