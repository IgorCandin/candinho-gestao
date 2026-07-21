begin;

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists
public.central_calendar_internal_config (
  singleton boolean primary key
    default true check (singleton),
  sync_secret text not null
    default encode(gen_random_bytes(32),'hex'),
  sync_endpoint text not null
    default 'https://ilboydbakpcfoaexpnhw.supabase.co/functions/v1/google-calendar-sync',
  updated_at timestamptz not null default now()
);

insert into public.central_calendar_internal_config(
  singleton
)
values(true)
on conflict(singleton) do nothing;

alter table public.central_calendar_internal_config
enable row level security;

revoke all on public.central_calendar_internal_config
from public,anon,authenticated;
grant all on public.central_calendar_internal_config
to service_role;

create or replace function
public.dispatch_google_calendar_sync()
returns bigint
language plpgsql
security definer
set search_path to 'public','net'
as $function$
declare
  v_endpoint text;
  v_secret text;
  v_request_id bigint;
begin
  select sync_endpoint,sync_secret
  into v_endpoint,v_secret
  from public.central_calendar_internal_config
  where singleton=true;

  if v_endpoint is null or v_secret is null then
    return null;
  end if;

  select net.http_post(
    url:=v_endpoint,
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-candinho-sync-secret',v_secret
    ),
    body:='{"limit":100}'::jsonb,
    timeout_milliseconds:=8000
  ) into v_request_id;

  return v_request_id;
end;
$function$;

revoke all on function
public.dispatch_google_calendar_sync()
from public,anon,authenticated;
grant execute on function
public.dispatch_google_calendar_sync()
to service_role;

create or replace function
public.queue_post_sale_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.enqueue_google_calendar_sync(
    'post_sale',
    new.id,
    case
      when new.status='planned'
        and new.completed_at is null
        and new.cancelled_at is null
      then 'upsert'
      else 'delete'
    end
  );

  perform public.dispatch_google_calendar_sync();
  return new;
end;
$function$;

create or replace function
public.queue_strategic_agenda_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.enqueue_google_calendar_sync(
    'strategic_agenda',
    new.id,
    case
      when new.status='planned'
        and new.scheduled_on is not null
      then 'upsert'
      else 'delete'
    end
  );

  perform public.dispatch_google_calendar_sync();
  return new;
end;
$function$;

do $block$
declare
  v_job record;
begin
  for v_job in
    select jobid
    from cron.job
    where jobname=
      'candinho-google-calendar-sync-retry'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'candinho-google-calendar-sync-retry',
    '*/15 * * * *',
    $cron$
      select public.dispatch_google_calendar_sync();
    $cron$
  );
end;
$block$;

commit;
