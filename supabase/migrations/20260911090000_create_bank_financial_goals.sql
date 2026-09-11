create table if not exists public.bank_financial_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  goal_type text not null default 'reserve' check (goal_type in ('reserve','expense')),
  category text not null default 'other' check (category in ('health','travel','purchase','bill','emergency','other')),
  target_amount numeric(14,2) not null check (target_amount > 0),
  reserved_amount numeric(14,2) not null default 0 check (reserved_amount >= 0),
  expected_spend_min numeric(14,2) check (expected_spend_min is null or expected_spend_min >= 0),
  expected_spend_max numeric(14,2) check (expected_spend_max is null or expected_spend_max >= 0),
  due_date date,
  payment_method text,
  priority text not null default 'normal' check (priority in ('normal','attention','urgent')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_spend_max is null or expected_spend_min is null or expected_spend_max >= expected_spend_min)
);

create index if not exists bank_financial_goals_status_due_idx
  on public.bank_financial_goals(status,due_date);
create index if not exists bank_financial_goals_created_by_idx
  on public.bank_financial_goals(created_by) where created_by is not null;

alter table public.bank_financial_goals enable row level security;
grant select, insert, update, delete on public.bank_financial_goals to authenticated;

create policy bank_financial_goals_select on public.bank_financial_goals
  for select to authenticated using (public.can_access_bank());
create policy bank_financial_goals_insert on public.bank_financial_goals
  for insert to authenticated with check (public.can_write_bank());
create policy bank_financial_goals_update on public.bank_financial_goals
  for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
create policy bank_financial_goals_delete on public.bank_financial_goals
  for delete to authenticated using (public.can_write_bank());

create trigger bank_financial_goals_set_updated_at
before update on public.bank_financial_goals
for each row execute function public.set_updated_at();
