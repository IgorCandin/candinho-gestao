-- Restore only the privileges used by the migration board (read + upsert).
-- Preserve RLS, its policies and every audit record.
grant select, insert, update on table public.migration_audit_checks to authenticated;
-- These inherited privileges are unnecessary and TRUNCATE bypasses RLS.
revoke truncate, references, trigger on table public.migration_audit_checks from anon, authenticated;
