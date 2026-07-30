begin;

grant select,insert,update,delete
on table public.customer_relationships
  to authenticated,service_role;

grant select,insert,update,delete
on table public.customer_partner_affiliations
  to authenticated,service_role;

grant select,insert
on table public.nexus_activity_events
  to authenticated,service_role;

grant select,insert,update,delete
on table public.nexus_signals
  to authenticated,service_role;

grant usage,select
on sequence public.nexus_activity_events_id_seq
  to authenticated,service_role;

commit;
