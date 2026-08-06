create table if not exists public.ux_issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid default auth.uid(),
  category text not null check (category in ('layout','broken_action','wrong_data','confusing_flow','slow_screen','integration','other')),
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  status text not null default 'open' check (status in ('open','triaged','in_progress','resolved','ignored')),
  description text not null check (btrim(description) <> ''),
  route text,
  previous_route text,
  viewport_class text check (viewport_class is null or viewport_class in ('mobile','tablet','desktop','unknown')),
  screen_width integer,
  screen_height integer,
  device_pixel_ratio numeric(8,3),
  user_agent text,
  session_id text,
  recent_actions jsonb not null default '[]'::jsonb,
  client_context jsonb not null default '{}'::jsonb,
  error_message text,
  screenshot_url text,
  fingerprint text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ux_issue_reports_status_created_idx
  on public.ux_issue_reports(status, created_at desc);
create index if not exists ux_issue_reports_route_created_idx
  on public.ux_issue_reports(route, created_at desc);
create index if not exists ux_issue_reports_fingerprint_idx
  on public.ux_issue_reports(fingerprint) where fingerprint is not null;

alter table public.ux_issue_reports enable row level security;

drop policy if exists ux_issue_reports_authenticated_select on public.ux_issue_reports;
create policy ux_issue_reports_authenticated_select
on public.ux_issue_reports for select
to authenticated
using (true);

drop policy if exists ux_issue_reports_authenticated_insert on public.ux_issue_reports;
create policy ux_issue_reports_authenticated_insert
on public.ux_issue_reports for insert
to authenticated
with check (reporter_user_id is null or reporter_user_id = auth.uid());

drop policy if exists ux_issue_reports_authenticated_update on public.ux_issue_reports;
create policy ux_issue_reports_authenticated_update
on public.ux_issue_reports for update
to authenticated
using (true)
with check (true);

grant select, insert, update on public.ux_issue_reports to authenticated;

create or replace view public.ux_issue_reports_overview
with (security_invoker = true)
as
select
  r.*,
  case
    when r.status in ('resolved','ignored') then false
    else true
  end as is_pending,
  extract(epoch from (now() - r.created_at))/3600.0 as age_hours,
  case r.category
    when 'layout' then 'Layout / menu cortado'
    when 'broken_action' then 'Botão / função quebrada'
    when 'wrong_data' then 'Informação errada'
    when 'confusing_flow' then 'Fluxo confuso'
    when 'slow_screen' then 'Tela lenta'
    when 'integration' then 'Integração'
    else 'Outro'
  end as category_label
from public.ux_issue_reports r;

grant select on public.ux_issue_reports_overview to authenticated;

create or replace function public.touch_ux_issue_report_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_ux_issue_report_updated_at on public.ux_issue_reports;
create trigger trg_touch_ux_issue_report_updated_at
before update on public.ux_issue_reports
for each row execute function public.touch_ux_issue_report_updated_at();
