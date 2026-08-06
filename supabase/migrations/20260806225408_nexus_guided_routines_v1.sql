create table if not exists public.nexus_user_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  source_key text,
  is_active boolean not null default true,
  run_count integer not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nexus_user_routines_source_check
    check (source in ('manual','learned','template')),
  constraint nexus_user_routines_title_check
    check (length(btrim(title)) between 1 and 120),
  constraint nexus_user_routines_steps_check
    check (
      jsonb_typeof(steps)='array'
      and jsonb_array_length(steps) between 2 and 8
    )
);

create unique index if not exists nexus_user_routines_source_key_uidx
  on public.nexus_user_routines(user_id,source_key)
  where source_key is not null;

create index if not exists nexus_user_routines_user_idx
  on public.nexus_user_routines(user_id,is_active,updated_at desc);

create table if not exists public.nexus_routine_runs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null
    references public.nexus_user_routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  current_step integer not null default 0,
  history jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint nexus_routine_runs_status_check
    check (status in ('active','completed','cancelled')),
  constraint nexus_routine_runs_current_step_check check (current_step >= 0),
  constraint nexus_routine_runs_history_check check (jsonb_typeof(history)='array')
);

create unique index if not exists nexus_routine_runs_one_active_uidx
  on public.nexus_routine_runs(user_id)
  where status='active';

create index if not exists nexus_routine_runs_user_history_idx
  on public.nexus_routine_runs(user_id,started_at desc);

alter table public.nexus_user_routines enable row level security;
alter table public.nexus_routine_runs enable row level security;

drop policy if exists nexus_user_routines_select_own
  on public.nexus_user_routines;
create policy nexus_user_routines_select_own
  on public.nexus_user_routines
  for select to authenticated
  using (user_id=auth.uid());

drop policy if exists nexus_routine_runs_select_own
  on public.nexus_routine_runs;
create policy nexus_routine_runs_select_own
  on public.nexus_routine_runs
  for select to authenticated
  using (user_id=auth.uid());

grant select on public.nexus_user_routines to authenticated;
grant select on public.nexus_routine_runs to authenticated;

create or replace function public.nexus_create_routine_v1(
  p_title text,
  p_steps jsonb,
  p_description text default null,
  p_source text default 'manual',
  p_source_key text default null
)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_title text := left(btrim(coalesce(p_title,'')),120);
  v_description text := nullif(left(btrim(coalesce(p_description,'')),500),'');
  v_source text := lower(btrim(coalesce(p_source,'manual')));
  v_source_key text := nullif(left(btrim(coalesce(p_source_key,'')),300),'');
  v_count integer;
  v_step jsonb;
  v_href text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  if v_title='' then
    raise exception 'Dê um nome para a rotina';
  end if;

  if jsonb_typeof(p_steps)<>'array' then
    raise exception 'Etapas inválidas';
  end if;

  v_count := jsonb_array_length(p_steps);
  if v_count < 2 or v_count > 8 then
    raise exception 'A rotina precisa ter de 2 a 8 etapas';
  end if;

  if v_source not in ('manual','learned','template') then
    v_source := 'manual';
  end if;

  for v_step in select value from jsonb_array_elements(p_steps)
  loop
    if jsonb_typeof(v_step)<>'object'
       or coalesce(v_step->>'type','route')<>'route' then
      raise exception
        'Nesta versão, rotinas aceitam apenas etapas de navegação';
    end if;

    v_href := left(btrim(coalesce(v_step->>'href','')),320);

    if v_href=''
       or left(v_href,1)<>'/'
       or position(':id' in v_href)>0
       or position('://' in v_href)>0 then
      raise exception 'Uma das rotas da rotina é inválida';
    end if;

    if not public.nexus_shortcut_scope_allowed_v1(
      public.nexus_scope_from_route_v1(v_href)
    ) then
      raise exception
        'Sem acesso a uma das operações desta rotina'
        using errcode='42501';
    end if;
  end loop;

  if v_source_key is not null then
    update public.nexus_user_routines
      set title=v_title,
          description=v_description,
          steps=p_steps,
          source=v_source,
          is_active=true,
          updated_at=now()
    where user_id=v_user
      and source_key=v_source_key
    returning id into v_id;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.nexus_user_routines(
    user_id,title,description,steps,source,source_key
  )
  values (
    v_user,v_title,v_description,p_steps,v_source,v_source_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function
  public.nexus_create_routine_v1(text,jsonb,text,text,text)
  to authenticated;

create or replace function public.nexus_delete_routine_v1(
  p_routine_id uuid
)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  update public.nexus_routine_runs
    set status='cancelled',
        completed_at=now(),
        updated_at=now()
  where routine_id=p_routine_id
    and user_id=v_user
    and status='active';

  delete from public.nexus_user_routines
  where id=p_routine_id
    and user_id=v_user;

  get diagnostics v_deleted = row_count;
  return v_deleted>0;
end;
$$;

grant execute on function public.nexus_delete_routine_v1(uuid)
  to authenticated;

create or replace function public.nexus_active_routine_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    return null;
  end if;

  select jsonb_build_object(
    'run_id',rr.id,
    'routine_id',r.id,
    'title',r.title,
    'description',r.description,
    'source',r.source,
    'steps',r.steps,
    'current_step',rr.current_step,
    'total_steps',jsonb_array_length(r.steps),
    'status',rr.status,
    'started_at',rr.started_at,
    'updated_at',rr.updated_at,
    'current',case
      when rr.current_step < jsonb_array_length(r.steps)
        then r.steps->rr.current_step
      else null
    end,
    'progress_percent',
      least(
        100,
        round(
          (
            100.0*rr.current_step/
            greatest(jsonb_array_length(r.steps),1)
          )::numeric,
          0
        )
      )
  )
  into v_result
  from public.nexus_routine_runs rr
  join public.nexus_user_routines r
    on r.id=rr.routine_id
  where rr.user_id=v_user
    and rr.status='active'
  order by rr.started_at desc
  limit 1;

  return v_result;
end;
$$;

grant execute on function public.nexus_active_routine_v1()
  to authenticated;

create or replace function public.nexus_start_routine_v1(
  p_routine_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_run uuid;
  v_exists boolean;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  select exists(
    select 1
    from public.nexus_user_routines
    where id=p_routine_id
      and user_id=v_user
      and is_active
  )
  into v_exists;

  if not v_exists then
    raise exception 'Rotina não encontrada';
  end if;

  update public.nexus_routine_runs
    set status='cancelled',
        completed_at=now(),
        updated_at=now(),
        history=history || jsonb_build_array(
          jsonb_build_object('at',now(),'action','replaced')
        )
  where user_id=v_user
    and status='active';

  insert into public.nexus_routine_runs(
    routine_id,user_id,status,current_step,history
  )
  values (
    p_routine_id,
    v_user,
    'active',
    0,
    jsonb_build_array(
      jsonb_build_object('at',now(),'action','started','step',0)
    )
  )
  returning id into v_run;

  update public.nexus_user_routines
    set run_count=run_count+1,
        last_run_at=now(),
        updated_at=now()
  where id=p_routine_id
    and user_id=v_user;

  return public.nexus_active_routine_v1();
end;
$$;

grant execute on function public.nexus_start_routine_v1(uuid)
  to authenticated;

create or replace function public.nexus_advance_routine_v1(
  p_run_id uuid,
  p_action text default 'arrive',
  p_href text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action,'arrive')));
  v_current integer;
  v_steps jsonb;
  v_total integer;
  v_expected text;
  v_expected_path text;
  v_current_path text;
  v_routine_id uuid;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  select rr.current_step,r.steps,rr.routine_id
    into v_current,v_steps,v_routine_id
  from public.nexus_routine_runs rr
  join public.nexus_user_routines r
    on r.id=rr.routine_id
  where rr.id=p_run_id
    and rr.user_id=v_user
    and rr.status='active'
  for update of rr;

  if v_routine_id is null then
    return public.nexus_active_routine_v1();
  end if;

  v_total := jsonb_array_length(v_steps);

  if v_current >= v_total then
    update public.nexus_routine_runs
      set status='completed',
          completed_at=now(),
          updated_at=now()
    where id=p_run_id
      and user_id=v_user;
    return null;
  end if;

  if v_action not in ('arrive','skip') then
    raise exception 'Ação inválida';
  end if;

  v_expected := coalesce(v_steps->v_current->>'href','');

  if v_action='arrive' then
    v_expected_path :=
      split_part(split_part(v_expected,'?',1),'#',1);
    v_current_path :=
      split_part(split_part(coalesce(p_href,''),'?',1),'#',1);

    if v_current_path=''
       or v_current_path<>v_expected_path then
      return public.nexus_active_routine_v1();
    end if;
  end if;

  v_current := v_current + 1;

  if v_current >= v_total then
    update public.nexus_routine_runs
      set current_step=v_current,
          status='completed',
          completed_at=now(),
          updated_at=now(),
          history=history || jsonb_build_array(
            jsonb_build_object(
              'at',now(),
              'action',v_action,
              'href',p_href,
              'step',v_current-1,
              'completed',true
            )
          )
    where id=p_run_id
      and user_id=v_user;

    return null;
  end if;

  update public.nexus_routine_runs
    set current_step=v_current,
        updated_at=now(),
        history=history || jsonb_build_array(
          jsonb_build_object(
            'at',now(),
            'action',v_action,
            'href',p_href,
            'step',v_current-1
          )
        )
  where id=p_run_id
    and user_id=v_user;

  return public.nexus_active_routine_v1();
end;
$$;

grant execute on function
  public.nexus_advance_routine_v1(uuid,text,text)
  to authenticated;

create or replace function public.nexus_cancel_routine_v1(
  p_run_id uuid
)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_updated integer;
begin
  if v_user is null then
    return false;
  end if;

  update public.nexus_routine_runs
    set status='cancelled',
        completed_at=now(),
        updated_at=now(),
        history=history || jsonb_build_array(
          jsonb_build_object('at',now(),'action','cancelled')
        )
  where id=p_run_id
    and user_id=v_user
    and status='active';

  get diagnostics v_updated = row_count;
  return v_updated>0;
end;
$$;

grant execute on function public.nexus_cancel_routine_v1(uuid)
  to authenticated;

create or replace function public.nexus_routines_workspace_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_routines jsonb := '[]'::jsonb;
  v_suggestions jsonb := '[]'::jsonb;
  v_recent_runs jsonb := '[]'::jsonb;
  v_active jsonb;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',r.id,
        'title',r.title,
        'description',r.description,
        'steps',r.steps,
        'source',r.source,
        'source_key',r.source_key,
        'run_count',r.run_count,
        'last_run_at',r.last_run_at,
        'created_at',r.created_at,
        'updated_at',r.updated_at
      )
      order by coalesce(r.last_run_at,r.updated_at) desc
    ),
    '[]'::jsonb
  )
  into v_routines
  from public.nexus_user_routines r
  where r.user_id=v_user
    and r.is_active;

  with ordered as (
    select
      e.session_id,
      e.route as step1,
      e.target_route as step2,
      lead(e.route) over(
        partition by e.session_id
        order by e.created_at,e.id
      ) as next_route,
      lead(e.target_route) over(
        partition by e.session_id
        order by e.created_at,e.id
      ) as step3,
      e.created_at
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind='navigation_click'
      and e.created_at>=now()-interval '30 days'
      and e.session_id is not null
      and e.target_route is not null
  ),
  grouped as (
    select
      step1,step2,step3,
      count(*)::integer as repetitions,
      count(
        distinct
        (created_at at time zone 'America/Sao_Paulo')::date
      )::integer as distinct_days,
      max(created_at) as last_seen_at
    from ordered
    where next_route=step2
      and step3 is not null
      and step1<>step2
      and step2<>step3
      and position(':id' in step1)=0
      and position(':id' in step2)=0
      and position(':id' in step3)=0
    group by step1,step2,step3
    having count(*)>=2
    order by count(*) desc,max(created_at) desc
    limit 8
  ),
  filtered as (
    select
      g.*,
      'learned:' || g.step1 || '|' || g.step2 || '|' || g.step3
        as source_key
    from grouped g
    where public.nexus_shortcut_scope_allowed_v1(
      public.nexus_scope_from_route_v1(g.step1)
    )
      and public.nexus_shortcut_scope_allowed_v1(
        public.nexus_scope_from_route_v1(g.step2)
      )
      and public.nexus_shortcut_scope_allowed_v1(
        public.nexus_scope_from_route_v1(g.step3)
      )
      and not exists (
        select 1
        from public.nexus_user_routines r
        where r.user_id=v_user
          and r.source_key=
            'learned:' || g.step1 || '|' || g.step2 || '|' || g.step3
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source_key',source_key,
        'steps',jsonb_build_array(
          jsonb_build_object('type','route','href',step1),
          jsonb_build_object('type','route','href',step2),
          jsonb_build_object('type','route','href',step3)
        ),
        'repetitions',repetitions,
        'distinct_days',distinct_days,
        'last_seen_at',last_seen_at
      )
      order by repetitions desc,last_seen_at desc
    ),
    '[]'::jsonb
  )
  into v_suggestions
  from filtered;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'run_id',rr.id,
        'routine_id',r.id,
        'title',r.title,
        'status',rr.status,
        'started_at',rr.started_at,
        'completed_at',rr.completed_at,
        'current_step',rr.current_step,
        'total_steps',jsonb_array_length(r.steps)
      )
      order by rr.started_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_runs
  from (
    select *
    from public.nexus_routine_runs
    where user_id=v_user
      and status<>'active'
    order by started_at desc
    limit 8
  ) rr
  join public.nexus_user_routines r
    on r.id=rr.routine_id;

  v_active := public.nexus_active_routine_v1();

  return jsonb_build_object(
    'generated_at',now(),
    'active_run',v_active,
    'routines',v_routines,
    'suggestions',v_suggestions,
    'recent_runs',v_recent_runs,
    'stats',jsonb_build_object(
      'routines',jsonb_array_length(v_routines),
      'suggestions',jsonb_array_length(v_suggestions),
      'recent_runs',jsonb_array_length(v_recent_runs),
      'has_active',v_active is not null
    )
  );
end;
$$;

grant execute on function public.nexus_routines_workspace_v1()
  to authenticated;
