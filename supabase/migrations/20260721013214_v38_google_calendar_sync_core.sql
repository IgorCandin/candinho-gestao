begin;

create table if not exists public.central_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique,
  google_account_email text,
  calendar_id text not null default 'primary',
  refresh_token text,
  access_token text,
  access_token_expires_at timestamptz,
  granted_scope text,
  status text not null default 'disconnected'
    check (status in ('connected','disconnected','error','revoked')),
  sync_post_sale boolean not null default true,
  sync_strategic_agenda boolean not null default true,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.central_google_calendar_oauth_states (
  state text primary key,
  user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.central_calendar_event_bindings (
  id uuid primary key default gen_random_uuid(),
  source_type text not null
    check (source_type in ('post_sale','strategic_agenda')),
  source_id uuid not null,
  google_event_id text not null,
  google_calendar_id text not null default 'primary',
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,source_id)
);

create table if not exists public.central_calendar_sync_queue (
  id uuid primary key default gen_random_uuid(),
  source_type text not null
    check (source_type in ('post_sale','strategic_agenda')),
  source_id uuid not null,
  action text not null check (action in ('upsert','delete')),
  status text not null default 'pending'
    check (status in ('pending','processing','done','error')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(source_type,source_id)
);

alter table public.central_google_calendar_connections enable row level security;
alter table public.central_google_calendar_oauth_states enable row level security;
alter table public.central_calendar_event_bindings enable row level security;
alter table public.central_calendar_sync_queue enable row level security;

revoke all on public.central_google_calendar_connections
  from public,anon,authenticated;
revoke all on public.central_google_calendar_oauth_states
  from public,anon,authenticated;
revoke all on public.central_calendar_event_bindings
  from public,anon,authenticated;
revoke all on public.central_calendar_sync_queue
  from public,anon,authenticated;

grant all on public.central_google_calendar_connections to service_role;
grant all on public.central_google_calendar_oauth_states to service_role;
grant all on public.central_calendar_event_bindings to service_role;
grant all on public.central_calendar_sync_queue to service_role;

create or replace function public.central_google_calendar_status()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_connected record;
  v_pending integer:=0;
  v_errors integer:=0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  select
    c.google_account_email,
    c.calendar_id,
    c.status,
    c.sync_post_sale,
    c.sync_strategic_agenda,
    c.last_sync_at,
    c.last_error
  into v_connected
  from public.central_google_calendar_connections c
  where c.status='connected'
  order by c.updated_at desc
  limit 1;

  select
    count(*) filter(where q.status='pending'),
    count(*) filter(where q.status='error')
  into v_pending,v_errors
  from public.central_calendar_sync_queue q;

  return jsonb_build_object(
    'configured',found,
    'connected',found,
    'email',case when found then v_connected.google_account_email else null end,
    'calendar_id',case when found then v_connected.calendar_id else null end,
    'status',case when found then v_connected.status else 'disconnected' end,
    'sync_post_sale',case when found then v_connected.sync_post_sale else true end,
    'sync_strategic_agenda',case when found then v_connected.sync_strategic_agenda else true end,
    'last_sync_at',case when found then v_connected.last_sync_at else null end,
    'last_error',case when found then v_connected.last_error else null end,
    'pending_jobs',coalesce(v_pending,0),
    'error_jobs',coalesce(v_errors,0)
  );
end;
$function$;

grant execute on function public.central_google_calendar_status()
to authenticated,service_role;
revoke all on function public.central_google_calendar_status()
from anon,public;

commit;
