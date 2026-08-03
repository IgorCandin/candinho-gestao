revoke all on function public.public_create_catalog_lead_v2(text,text,uuid,text,text) from public;
grant execute on function public.public_create_catalog_lead_v2(text,text,uuid,text,text)
  to anon,authenticated,service_role;

revoke all on function public.sync_catalog_public_lead_to_commercial_v1(uuid) from public;
revoke all on function public.sync_catalog_public_lead_to_commercial_v1(uuid) from anon;
grant execute on function public.sync_catalog_public_lead_to_commercial_v1(uuid)
  to authenticated,service_role;

revoke all on function public.set_commercial_inbox_status_v1(uuid,text) from public;
revoke all on function public.set_commercial_inbox_status_v1(uuid,text) from anon;
grant execute on function public.set_commercial_inbox_status_v1(uuid,text)
  to authenticated,service_role;

revoke all on function public.sync_commercial_inbox_from_lead_v1() from public;
revoke all on function public.sync_commercial_inbox_from_lead_v1() from anon;
