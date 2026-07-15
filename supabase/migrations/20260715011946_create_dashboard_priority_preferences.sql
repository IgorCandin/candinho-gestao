create table if not exists public.dashboard_priority_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('payment', 'lead', 'stock', 'delivery', 'supplier')),
  entity_id uuid not null,
  hidden_until timestamptz,
  permanently_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, entity_id)
);

create index if not exists dashboard_priority_preferences_user_active_idx
  on public.dashboard_priority_preferences (user_id, permanently_hidden, hidden_until);

alter table public.dashboard_priority_preferences enable row level security;

drop policy if exists dashboard_priority_preferences_read_own on public.dashboard_priority_preferences;
create policy dashboard_priority_preferences_read_own
  on public.dashboard_priority_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists dashboard_priority_preferences_insert_own on public.dashboard_priority_preferences;
create policy dashboard_priority_preferences_insert_own
  on public.dashboard_priority_preferences for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_operation('supplements'));

drop policy if exists dashboard_priority_preferences_update_own on public.dashboard_priority_preferences;
create policy dashboard_priority_preferences_update_own
  on public.dashboard_priority_preferences for update to authenticated
  using (user_id = auth.uid() and public.can_access_operation('supplements'))
  with check (user_id = auth.uid() and public.can_access_operation('supplements'));

drop policy if exists dashboard_priority_preferences_delete_own on public.dashboard_priority_preferences;
create policy dashboard_priority_preferences_delete_own
  on public.dashboard_priority_preferences for delete to authenticated
  using (user_id = auth.uid() and public.can_access_operation('supplements'));

grant select, insert, update, delete on public.dashboard_priority_preferences to authenticated;
