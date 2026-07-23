begin;

alter table public.physique_athlete_import_sessions
  add column if not exists ai_payload jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz;

create index if not exists physique_athlete_import_sessions_completed_idx
  on public.physique_athlete_import_sessions(athlete_id, completed_at desc)
  where status = 'completed';

create or replace view public.physique_athlete_import_session_overview
with (security_invoker = true)
as
select
  s.id,
  s.athlete_id,
  s.title,
  s.status,
  s.context,
  s.ai_summary,
  s.ai_payload,
  s.created_at,
  s.updated_at,
  s.completed_at,
  count(f.id)::integer as file_count,
  coalesce(
    array_agg(distinct f.file_type) filter (where f.file_type is not null),
    array[]::text[]
  ) as file_types
from public.physique_athlete_import_sessions s
left join public.physique_athlete_import_files f on f.session_id = s.id
group by s.id;

grant select on public.physique_athlete_import_session_overview to authenticated;

create or replace view public.physique_athlete_current_dossier
with (security_invoker = true)
as
select distinct on (s.athlete_id)
  s.athlete_id,
  s.id as session_id,
  s.title,
  s.context,
  s.ai_summary,
  s.ai_payload,
  s.completed_at,
  s.created_at,
  o.file_count,
  o.file_types
from public.physique_athlete_import_sessions s
join public.physique_athlete_import_session_overview o on o.id = s.id
where s.status = 'completed'
order by
  s.athlete_id,
  coalesce(s.completed_at, s.updated_at, s.created_at) desc;

grant select on public.physique_athlete_current_dossier to authenticated;

create or replace function public.complete_physique_import_session(
  p_session_id uuid,
  p_ai_summary text,
  p_ai_payload jsonb,
  p_context jsonb,
  p_primary_goal text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete_id uuid;
begin
  if not public.can_manage_physique() then
    raise exception 'Sem permissão para concluir atualização do Physique';
  end if;

  select athlete_id
    into v_athlete_id
  from public.physique_athlete_import_sessions
  where id = p_session_id
    and status = 'open'
  for update;

  if v_athlete_id is null then
    raise exception 'Atualização aberta não encontrada';
  end if;

  if not exists (
    select 1
    from public.physique_athlete_import_files
    where session_id = p_session_id
  ) then
    raise exception 'Adicione pelo menos um arquivo antes de concluir';
  end if;

  update public.physique_athlete_import_sessions
  set
    status = 'completed',
    context = coalesce(p_context, '{}'::jsonb),
    ai_summary = nullif(trim(coalesce(p_ai_summary, '')), ''),
    ai_payload = coalesce(p_ai_payload, '{}'::jsonb),
    completed_at = now(),
    updated_at = now()
  where id = p_session_id;

  delete from public.physique_athlete_snapshots
  where session_id = p_session_id
    and snapshot_type = 'session_summary'
    and source_file_id is null;

  insert into public.physique_athlete_snapshots(
    athlete_id,
    session_id,
    source_file_id,
    snapshot_type,
    snapshot_date,
    payload,
    summary
  )
  values (
    v_athlete_id,
    p_session_id,
    null,
    'session_summary',
    (now() at time zone 'America/Sao_Paulo')::date,
    coalesce(p_ai_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_ai_summary, '')), '')
  );

  if nullif(trim(coalesce(p_primary_goal, '')), '') is not null then
    update public.physique_athletes
    set primary_goal = trim(p_primary_goal)
    where id = v_athlete_id;
  end if;
end;
$$;

grant execute on function public.complete_physique_import_session(
  uuid,
  text,
  jsonb,
  jsonb,
  text
) to authenticated;

commit;
