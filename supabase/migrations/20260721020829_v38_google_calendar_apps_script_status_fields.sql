begin;

alter table public.central_calendar_internal_config
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_error text;

commit;
