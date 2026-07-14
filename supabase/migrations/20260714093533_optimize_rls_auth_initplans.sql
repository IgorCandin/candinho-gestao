begin;

alter policy profiles_read on public.profiles
  using ((id = (select auth.uid())) or (public.current_user_role() = 'admin'::public.app_role));

alter policy audit_events_insert on public.audit_events
  with check ((select auth.uid()) is not null);

commit;
