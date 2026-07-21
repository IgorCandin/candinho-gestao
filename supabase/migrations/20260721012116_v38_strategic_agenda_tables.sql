create table if not exists public.central_strategic_agenda_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  week_number integer not null check (week_number between 1 and 4),
  task text not null,
  objective text,
  priority text not null check (priority in ('low','medium','high','extreme')),
  category text not null,
  action_href text,
  action_label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.central_strategic_agenda_items (
  id uuid primary key default gen_random_uuid(),
  reference_month date not null,
  template_id uuid references public.central_strategic_agenda_templates(id) on delete set null,
  code text,
  week_number integer not null check (week_number between 1 and 4),
  task text not null,
  objective text,
  priority text not null check (priority in ('low','medium','high','extreme')),
  category text not null,
  action_href text,
  action_label text,
  sort_order integer not null default 0,
  status text not null default 'planned' check (status in ('planned','completed','postponed')),
  completed_at timestamptz,
  postponed_at timestamptz,
  impact_note text,
  notes text,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists central_strategic_agenda_items_template_month_unique
  on public.central_strategic_agenda_items(reference_month,template_id)
  where template_id is not null;
create index if not exists central_strategic_agenda_items_month_idx
  on public.central_strategic_agenda_items(reference_month,week_number,status,sort_order);
