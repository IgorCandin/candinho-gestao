create table if not exists public.migration_audit_checks (
  check_key text primary key,
  operation text not null check (operation in ('supplements', 'fitness')),
  area text not null,
  legacy_href text not null,
  company_href text not null,
  state text not null default 'pending' check (state in ('pending', 'reviewing', 'approved', 'issue')),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.migration_audit_checks enable row level security;

drop policy if exists migration_audit_checks_read on public.migration_audit_checks;
create policy migration_audit_checks_read on public.migration_audit_checks
for select to authenticated
using ((select public.can_manage_users()) or (select public.can_access_operation('supplements')) or (select public.can_access_operation('fitness')));

drop policy if exists migration_audit_checks_write on public.migration_audit_checks;
create policy migration_audit_checks_write on public.migration_audit_checks
for all to authenticated
using ((select public.can_manage_users()) or (select public.can_access_operation('supplements')) or (select public.can_access_operation('fitness')))
with check ((select public.can_manage_users()) or (select public.can_access_operation('supplements')) or (select public.can_access_operation('fitness')));

create index if not exists migration_audit_checks_operation_idx on public.migration_audit_checks(operation, state);
