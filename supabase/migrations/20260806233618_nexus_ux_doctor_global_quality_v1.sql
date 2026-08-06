create table if not exists public.ux_health_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  route text not null,
  signal_type text not null,
  severity text not null default 'attention',
  viewport_class text not null default 'unknown',
  viewport_width integer,
  viewport_height integer,
  overflow_px integer,
  payload jsonb not null default '{}'::jsonb,
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint ux_health_signals_type_check check (
    signal_type in ('horizontal_overflow','fixed_clip','client_error')
  ),
  constraint ux_health_signals_severity_check check (
    severity in ('info','attention','high')
  ),
  constraint ux_health_signals_viewport_check check (
    viewport_class in ('mobile','tablet','desktop','unknown')
  ),
  constraint ux_health_signals_occurrence_check check (occurrence_count >= 1),
  unique(user_id,fingerprint)
);

create index if not exists ux_health_signals_user_recent_idx
  on public.ux_health_signals(user_id,last_seen_at desc);

create index if not exists ux_health_signals_route_recent_idx
  on public.ux_health_signals(user_id,route,last_seen_at desc);

alter table public.ux_health_signals enable row level security;

drop policy if exists ux_health_signals_select_own
  on public.ux_health_signals;

create policy ux_health_signals_select_own
  on public.ux_health_signals
  for select to authenticated
  using (user_id=auth.uid());

grant select on public.ux_health_signals to authenticated;

create or replace function public.nexus_record_ux_health_signal_v1(
  p_signal_type text,
  p_route text,
  p_viewport_class text default 'unknown',
  p_viewport_width integer default null,
  p_viewport_height integer default null,
  p_overflow_px integer default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_type text := lower(btrim(coalesce(p_signal_type,'')));
  v_route text;
  v_viewport text := lower(btrim(coalesce(p_viewport_class,'unknown')));
  v_overflow integer := greatest(0,coalesce(p_overflow_px,0));
  v_severity text;
  v_element text;
  v_fingerprint text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id=v_user and p.active
  ) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;

  if v_type not in ('horizontal_overflow','fixed_clip','client_error') then
    raise exception 'Sinal de UX inválido';
  end if;

  if coalesce(p_route,'')='' or left(btrim(p_route),1)<>'/' then
    raise exception 'Rota inválida';
  end if;

  v_route := public.normalize_nexus_route_v1(p_route);

  if v_viewport not in ('mobile','tablet','desktop','unknown') then
    v_viewport := 'unknown';
  end if;

  v_severity := case
    when v_type='client_error' then 'high'
    when v_type='horizontal_overflow' and v_overflow >= 120 then 'high'
    when v_type='fixed_clip' and v_overflow >= 80 then 'high'
    else 'attention'
  end;

  v_element := left(coalesce(p_payload->>'element',''),120);

  v_fingerprint := md5(
    v_type || '|' || v_route || '|' || v_viewport || '|' || v_element
  );

  insert into public.ux_health_signals(
    user_id,
    fingerprint,
    route,
    signal_type,
    severity,
    viewport_class,
    viewport_width,
    viewport_height,
    overflow_px,
    payload
  )
  values (
    v_user,
    v_fingerprint,
    v_route,
    v_type,
    v_severity,
    v_viewport,
    case
      when p_viewport_width between 1 and 10000
        then p_viewport_width
      else null
    end,
    case
      when p_viewport_height between 1 and 10000
        then p_viewport_height
      else null
    end,
    v_overflow,
    coalesce(p_payload,'{}'::jsonb)
  )
  on conflict(user_id,fingerprint) do update
    set last_seen_at=now(),
        occurrence_count=public.ux_health_signals.occurrence_count+1,
        severity=case
          when excluded.severity='high' then 'high'
          else public.ux_health_signals.severity
        end,
        viewport_width=excluded.viewport_width,
        viewport_height=excluded.viewport_height,
        overflow_px=greatest(
          public.ux_health_signals.overflow_px,
          excluded.overflow_px
        ),
        payload=excluded.payload
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function
  public.nexus_record_ux_health_signal_v1(
    text,text,text,integer,integer,integer,jsonb
  )
from public;

grant execute on function
  public.nexus_record_ux_health_signal_v1(
    text,text,text,integer,integer,integer,jsonb
  )
to authenticated;

create or replace function public.nexus_ux_doctor_snapshot_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_pending integer := 0;
  v_high integer := 0;
  v_auto integer := 0;
  v_auto_high integer := 0;
  v_repeated integer := 0;
  v_score integer := 100;
  v_manual jsonb := '[]'::jsonb;
  v_auto_signals jsonb := '[]'::jsonb;
  v_routes jsonb := '[]'::jsonb;
  v_devices jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  select
    count(*) filter(
      where status not in ('resolved','ignored')
    )::integer,
    count(*) filter(
      where status not in ('resolved','ignored')
        and severity in ('high','critical')
    )::integer
  into v_pending,v_high
  from public.ux_issue_reports
  where reporter_user_id=v_user;

  select
    count(*)::integer,
    count(*) filter(where severity='high')::integer,
    count(*) filter(where occurrence_count>=2)::integer
  into v_auto,v_auto_high,v_repeated
  from public.ux_health_signals
  where user_id=v_user
    and last_seen_at>=now()-interval '14 days';

  v_score := greatest(
    0,
    100
      - least(60,v_high*12)
      - least(25,greatest(v_pending-v_high,0)*4)
      - least(30,v_auto_high*7)
      - least(20,greatest(v_auto-v_auto_high,0)*2)
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',x.id,
        'category',x.category,
        'severity',x.severity,
        'status',x.status,
        'description',x.description,
        'route',x.route,
        'viewport_class',x.viewport_class,
        'screen_width',x.screen_width,
        'screen_height',x.screen_height,
        'error_message',x.error_message,
        'fingerprint',x.fingerprint,
        'created_at',x.created_at,
        'updated_at',x.updated_at
      )
      order by x.created_at desc
    ),
    '[]'::jsonb
  )
  into v_manual
  from (
    select *
    from public.ux_issue_reports
    where reporter_user_id=v_user
      and status not in ('resolved','ignored')
    order by
      case severity
        when 'critical' then 0
        when 'high' then 1
        else 2
      end,
      created_at desc
    limit 30
  ) x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',s.id,
        'route',s.route,
        'signal_type',s.signal_type,
        'severity',s.severity,
        'viewport_class',s.viewport_class,
        'viewport_width',s.viewport_width,
        'viewport_height',s.viewport_height,
        'overflow_px',s.overflow_px,
        'occurrence_count',s.occurrence_count,
        'first_seen_at',s.first_seen_at,
        'last_seen_at',s.last_seen_at,
        'payload',s.payload
      )
      order by
        case s.severity when 'high' then 0 else 1 end,
        s.occurrence_count desc,
        s.last_seen_at desc
    ),
    '[]'::jsonb
  )
  into v_auto_signals
  from (
    select *
    from public.ux_health_signals
    where user_id=v_user
      and last_seen_at>=now()-interval '14 days'
    order by
      case severity when 'high' then 0 else 1 end,
      occurrence_count desc,
      last_seen_at desc
    limit 40
  ) s;

  with combined as (
    select
      coalesce(route,'Rota não identificada') as route,
      count(*)::integer as issue_count,
      count(*) filter(
        where severity in ('high','critical')
      )::integer as high_count,
      max(created_at) as last_seen
    from public.ux_issue_reports
    where reporter_user_id=v_user
      and status not in ('resolved','ignored')
    group by coalesce(route,'Rota não identificada')

    union all

    select
      route,
      sum(occurrence_count)::integer as issue_count,
      sum(
        case
          when severity='high' then occurrence_count
          else 0
        end
      )::integer as high_count,
      max(last_seen_at) as last_seen
    from public.ux_health_signals
    where user_id=v_user
      and last_seen_at>=now()-interval '14 days'
    group by route
  ),
  grouped as (
    select
      route,
      sum(issue_count)::integer as issue_count,
      sum(high_count)::integer as high_count,
      max(last_seen) as last_seen
    from combined
    group by route
    order by
      sum(high_count) desc,
      sum(issue_count) desc,
      max(last_seen) desc
    limit 12
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'route',route,
        'issue_count',issue_count,
        'high_count',high_count,
        'last_seen_at',last_seen
      )
      order by high_count desc,issue_count desc,last_seen desc
    ),
    '[]'::jsonb
  )
  into v_routes
  from grouped;

  with d as (
    select
      coalesce(viewport_class,'unknown') as viewport_class,
      count(*)::integer as total
    from public.ux_issue_reports
    where reporter_user_id=v_user
      and status not in ('resolved','ignored')
    group by coalesce(viewport_class,'unknown')

    union all

    select
      viewport_class,
      sum(occurrence_count)::integer as total
    from public.ux_health_signals
    where user_id=v_user
      and last_seen_at>=now()-interval '14 days'
    group by viewport_class
  ),
  dg as (
    select
      viewport_class,
      sum(total)::integer as total
    from d
    group by viewport_class
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'viewport_class',viewport_class,
        'total',total
      )
      order by total desc
    ),
    '[]'::jsonb
  )
  into v_devices
  from dg;

  return jsonb_build_object(
    'generated_at',now(),
    'health_score',v_score,
    'manual_pending',coalesce(v_pending,0),
    'manual_high',coalesce(v_high,0),
    'auto_active',coalesce(v_auto,0),
    'auto_high',coalesce(v_auto_high,0),
    'repeated_signals',coalesce(v_repeated,0),
    'manual_reports',v_manual,
    'auto_signals',v_auto_signals,
    'top_routes',v_routes,
    'device_breakdown',v_devices
  );
end;
$$;

revoke all on function public.nexus_ux_doctor_snapshot_v1() from public;
grant execute on function public.nexus_ux_doctor_snapshot_v1()
  to authenticated;
