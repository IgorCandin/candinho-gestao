begin;

alter table public.physique_athletes
  add column if not exists avatar_path text;

create or replace view public.physique_athlete_overview
with (security_invoker=true)
as
select
  a.id,
  a.display_name,
  a.phone,
  a.email,
  a.instagram_username,
  a.status,
  a.primary_goal,
  a.notes,
  a.central_contact_id,
  c.display_name as central_contact_name,
  c.operation_scope as central_contact_scope,
  a.supplements_customer_id,
  sc.name as supplements_customer_name,
  a.fitness_customer_id,
  fc.name as fitness_customer_name,
  count(distinct tp.id)::integer as training_plan_count,
  count(distinct tp.id) filter (where tp.status='active')::integer as active_training_plan_count,
  max(tp.updated_at) as last_plan_update_at,
  a.created_at,
  a.updated_at,
  a.avatar_path
from public.physique_athletes a
left join public.central_contacts c on c.id=a.central_contact_id
left join public.customers sc on sc.id=a.supplements_customer_id
left join public.fitness_customers fc on fc.id=a.fitness_customer_id
left join public.physique_training_plans tp on tp.athlete_id=a.id
group by a.id,c.display_name,c.operation_scope,sc.name,fc.name;

create table if not exists public.physique_shape_analyses (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.physique_athletes(id) on delete cascade,
  analyzed_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  summary text not null,
  strengths text[] not null default '{}',
  priorities text[] not null default '{}',
  symmetry_notes text,
  posing_notes text,
  limitations text,
  image_paths jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists physique_shape_analyses_athlete_date_idx
  on public.physique_shape_analyses(athlete_id, analyzed_on desc, created_at desc);

alter table public.physique_shape_analyses enable row level security;
drop policy if exists physique_shape_analyses_manage on public.physique_shape_analyses;
create policy physique_shape_analyses_manage
on public.physique_shape_analyses
for all
to authenticated
using (public.can_manage_physique())
with check (public.can_manage_physique());

revoke all on public.physique_shape_analyses from anon, authenticated;
grant select, insert, update, delete on public.physique_shape_analyses to authenticated;
grant all on public.physique_shape_analyses to service_role;

create table if not exists public.central_company_public_identity (
  id smallint primary key default 1 check (id=1),
  trade_name text not null default 'Candinho Suplementos',
  cnpj text,
  opened_on date,
  city text,
  state text,
  legal_status text,
  company_size text,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.central_company_public_identity enable row level security;
drop policy if exists company_public_identity_read on public.central_company_public_identity;
create policy company_public_identity_read
on public.central_company_public_identity
for select
to anon, authenticated
using (true);

drop policy if exists company_public_identity_admin on public.central_company_public_identity;
create policy company_public_identity_admin
on public.central_company_public_identity
for all
to authenticated
using (public.can_manage_users() or public.current_user_role()='admin'::public.app_role)
with check (public.can_manage_users() or public.current_user_role()='admin'::public.app_role);

revoke all on public.central_company_public_identity from anon, authenticated;
grant select on public.central_company_public_identity to anon, authenticated;
grant insert, update, delete on public.central_company_public_identity to authenticated;
grant all on public.central_company_public_identity to service_role;

insert into public.central_company_public_identity(
  id, trade_name, cnpj, opened_on, city, state, legal_status, company_size
)
values(
  1,
  'Candinho Suplementos',
  '65.293.608/0001-05',
  '2026-02-24',
  'Caparaó',
  'MG',
  'Empresa formalizada e ativa',
  'ME'
)
on conflict (id) do nothing;

create table if not exists public.central_company_profile_sources (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_title text,
  source_domain text,
  status text not null default 'review' check (status in ('review','applied','dismissed','error')),
  summary text,
  proposed_payload jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  public_safe boolean not null default false,
  error_message text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists central_company_profile_sources_url_uidx
  on public.central_company_profile_sources(lower(source_url));

alter table public.central_company_profile_sources enable row level security;

drop policy if exists company_profile_sources_admin on public.central_company_profile_sources;
create policy company_profile_sources_admin
on public.central_company_profile_sources
for all
to authenticated
using (public.can_manage_users() or public.current_user_role()='admin'::public.app_role)
with check (public.can_manage_users() or public.current_user_role()='admin'::public.app_role);

drop policy if exists company_profile_sources_public_read on public.central_company_profile_sources;
create policy company_profile_sources_public_read
on public.central_company_profile_sources
for select
to anon, authenticated
using (status='applied' and public_safe=true);

revoke all on public.central_company_profile_sources from anon, authenticated;
grant select on public.central_company_profile_sources to anon, authenticated;
grant insert, update, delete on public.central_company_profile_sources to authenticated;
grant all on public.central_company_profile_sources to service_role;

commit;
