-- Candinho Company · início operacional do Physique (pós-V38, sem nova versão numerada)
-- Mudança aditiva: avaliações, fotos/evolução e importação estruturada de ficha.

create table if not exists public.physique_assessments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.physique_athletes(id) on delete cascade,
  assessed_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  source_type text not null default 'manual' check (source_type in ('manual','pdf','mixed')),
  weight_kg numeric(7,2),
  height_cm numeric(7,2),
  body_fat_pct numeric(6,2),
  chest_cm numeric(7,2),
  waist_cm numeric(7,2),
  abdomen_cm numeric(7,2),
  hips_cm numeric(7,2),
  arm_left_cm numeric(7,2),
  arm_right_cm numeric(7,2),
  thigh_left_cm numeric(7,2),
  thigh_right_cm numeric(7,2),
  calf_left_cm numeric(7,2),
  calf_right_cm numeric(7,2),
  notes text,
  ai_status text not null default 'not_requested' check (ai_status in ('not_requested','interpreted','reviewed','failed')),
  ai_model text,
  ai_payload jsonb not null default '{}'::jsonb,
  ai_interpreted_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists physique_assessments_athlete_idx
  on public.physique_assessments(athlete_id, assessed_on desc, created_at desc);

create table if not exists public.physique_assessment_attachments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.physique_assessments(id) on delete cascade,
  attachment_type text not null default 'other'
    check (attachment_type in ('assessment_pdf','front','side','back','other')),
  file_name text not null,
  file_url text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists physique_assessment_attachments_assessment_idx
  on public.physique_assessment_attachments(assessment_id, attachment_type, created_at desc);

alter table public.physique_training_plans
  add column if not exists ai_model text,
  add column if not exists ai_imported_at timestamptz,
  add column if not exists ai_payload jsonb not null default '{}'::jsonb;

alter table public.physique_assessments enable row level security;
alter table public.physique_assessment_attachments enable row level security;

drop policy if exists physique_assessments_manage on public.physique_assessments;
create policy physique_assessments_manage on public.physique_assessments
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

drop policy if exists physique_assessment_attachments_manage on public.physique_assessment_attachments;
create policy physique_assessment_attachments_manage on public.physique_assessment_attachments
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

grant select,insert,update,delete on
  public.physique_assessments,
  public.physique_assessment_attachments
  to authenticated;

create or replace function public.create_physique_training_plan_from_ai(
  p_athlete_id uuid,
  p_title text,
  p_goal text default null,
  p_status text default 'active',
  p_starts_on date default null,
  p_ends_on date default null,
  p_coach_name text default null,
  p_notes text default null,
  p_ai_model text default null,
  p_ai_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan_id uuid;
  v_day jsonb;
  v_exercise jsonb;
  v_day_id uuid;
  v_day_order integer := 0;
  v_exercise_order integer;
begin
  if not public.can_manage_physique() then
    raise exception 'Sem permissão para gerenciar a Physique';
  end if;

  if not exists(select 1 from public.physique_athletes where id=p_athlete_id) then
    raise exception 'Atleta não encontrado';
  end if;

  if p_status not in ('draft','active','archived') then
    raise exception 'Status de ficha inválido';
  end if;

  insert into public.physique_training_plans(
    athlete_id,title,goal,status,source_type,starts_on,ends_on,coach_name,notes,
    ai_model,ai_imported_at,ai_payload
  ) values (
    p_athlete_id,
    coalesce(nullif(btrim(p_title),''),'Ficha importada'),
    nullif(btrim(p_goal),''),
    p_status,
    'attachment',
    p_starts_on,
    p_ends_on,
    nullif(btrim(p_coach_name),''),
    nullif(btrim(p_notes),''),
    nullif(btrim(p_ai_model),''),
    case when p_ai_model is null then null else now() end,
    coalesce(p_ai_payload,'{}'::jsonb)
  ) returning id into v_plan_id;

  for v_day in
    select value from jsonb_array_elements(coalesce(p_ai_payload->'days','[]'::jsonb))
  loop
    v_day_order := v_day_order + 1;
    insert into public.physique_training_days(plan_id,day_order,day_label,focus,notes)
    values(
      v_plan_id,
      v_day_order,
      coalesce(nullif(btrim(v_day->>'day_label'),''),'Treino '||v_day_order),
      nullif(btrim(v_day->>'focus'),''),
      nullif(btrim(v_day->>'notes'),'')
    ) returning id into v_day_id;

    v_exercise_order := 0;
    for v_exercise in
      select value from jsonb_array_elements(coalesce(v_day->'exercises','[]'::jsonb))
    loop
      v_exercise_order := v_exercise_order + 1;
      insert into public.physique_training_exercises(
        day_id,exercise_order,exercise_name,sets_text,reps_text,rest_seconds,
        technique,load_guidance,notes
      ) values (
        v_day_id,
        v_exercise_order,
        coalesce(nullif(btrim(v_exercise->>'exercise_name'),''),'Exercício '||v_exercise_order),
        nullif(btrim(v_exercise->>'sets_text'),''),
        nullif(btrim(v_exercise->>'reps_text'),''),
        case when (v_exercise->>'rest_seconds') ~ '^[0-9]+$' then (v_exercise->>'rest_seconds')::integer else null end,
        nullif(btrim(v_exercise->>'technique'),''),
        nullif(btrim(v_exercise->>'load_guidance'),''),
        nullif(btrim(v_exercise->>'notes'),'')
      );
    end loop;
  end loop;

  return v_plan_id;
end;
$function$;

revoke all on function public.create_physique_training_plan_from_ai(uuid,text,text,text,date,date,text,text,text,jsonb) from anon,public;
grant execute on function public.create_physique_training_plan_from_ai(uuid,text,text,text,date,date,text,text,text,jsonb) to authenticated,service_role;

insert into public.ui_feature_flags(key,enabled,description)
values(
  'physique_enabled',
  true,
  'Candinho Physique Athletes: operação inicializada para cadastro, avaliações, evolução, fotos e fichas de treino.'
)
on conflict(key) do update
set enabled=excluded.enabled,
    description=excluded.description,
    updated_at=now();
