revoke all on function public.validate_sale_payment_entry() from public,anon,authenticated;
revoke all on function public.sync_sale_payment_state(uuid) from public,anon,authenticated;
revoke all on function public.trigger_sync_sale_payment_state() from public,anon,authenticated;

revoke all on function public.mark_sale_received(uuid,date,text) from public,anon;
grant execute on function public.mark_sale_received(uuid,date,text) to authenticated;

revoke all on function public.reschedule_operational_event(text,uuid,timestamptz) from public,anon;
grant execute on function public.reschedule_operational_event(text,uuid,timestamptz) to authenticated;

revoke all on function public.complete_operational_event(text,uuid,date,text,text,text) from public,anon;
grant execute on function public.complete_operational_event(text,uuid,date,text,text,text) to authenticated;

revoke all on function public.append_operational_event_note(text,uuid,text) from public,anon;
grant execute on function public.append_operational_event_note(text,uuid,text) to authenticated;
