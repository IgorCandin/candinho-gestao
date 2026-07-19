create table if not exists public.marketing_projects (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid unique references public.central_media_assets(id) on delete set null,
  title text not null,
  summary text,
  objective text,
  product text,
  content_format text,
  audience text,
  hook text,
  script_text text,
  cta text,
  status text not null default 'idea',
  processing_status text not null default 'pending',
  ai_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('idea','planning','recording','editing','published','archived')),
  check (processing_status in ('pending','processing','ready','error'))
);

create index if not exists marketing_projects_status_idx on public.marketing_projects(status, updated_at desc);
create index if not exists marketing_projects_processing_idx on public.marketing_projects(processing_status, updated_at desc);

alter table public.marketing_projects enable row level security;

drop policy if exists marketing_projects_select on public.marketing_projects;
create policy marketing_projects_select on public.marketing_projects
for select to authenticated using (public.central_can_access_scope('marketing'));

drop policy if exists marketing_projects_insert on public.marketing_projects;
create policy marketing_projects_insert on public.marketing_projects
for insert to authenticated with check (public.central_can_write_scope('marketing'));

drop policy if exists marketing_projects_update on public.marketing_projects;
create policy marketing_projects_update on public.marketing_projects
for update to authenticated using (public.central_can_write_scope('marketing')) with check (public.central_can_write_scope('marketing'));

drop policy if exists marketing_projects_delete on public.marketing_projects;
create policy marketing_projects_delete on public.marketing_projects
for delete to authenticated using (public.central_can_write_scope('marketing'));

grant select, insert, update, delete on public.marketing_projects to authenticated;

insert into public.marketing_projects (
  media_asset_id,
  title,
  processing_status,
  created_by,
  created_at,
  updated_at
)
select
  a.id,
  initcap(replace(replace(regexp_replace(a.original_filename, '\.[^.]+$', ''), '_', ' '), '-', ' ')),
  'pending',
  a.created_by,
  a.created_at,
  a.updated_at
from public.central_media_assets a
where a.operation_scope = 'marketing'
  and lower(coalesce(a.mime_type,'')) = 'application/pdf'
on conflict (media_asset_id) do nothing;
