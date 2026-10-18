alter table public.migration_audit_checks drop constraint migration_audit_checks_operation_check;
alter table public.migration_audit_checks add constraint migration_audit_checks_operation_check check (operation in ('supplements','fitness','company'));
comment on column public.migration_audit_checks.operation is 'supplements/fitness: operational comparison; company: cross-area roadmap. Existing RLS and grants preserved.';
