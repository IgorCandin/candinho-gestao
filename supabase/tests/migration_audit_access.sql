-- Read-only regression checks: zero returned rows means access is correct.
select 'missing authenticated read/upsert privilege' as failure
where not has_table_privilege('authenticated','public.migration_audit_checks','SELECT')
   or not has_table_privilege('authenticated','public.migration_audit_checks','INSERT')
   or not has_table_privilege('authenticated','public.migration_audit_checks','UPDATE');

select 'unexpected destructive or anonymous privilege' as failure
where has_table_privilege('authenticated','public.migration_audit_checks','DELETE')
   or has_table_privilege('authenticated','public.migration_audit_checks','TRUNCATE')
   or has_table_privilege('anon','public.migration_audit_checks','SELECT')
   or has_table_privilege('anon','public.migration_audit_checks','TRUNCATE');

select 'RLS disabled' as failure
from pg_class where oid='public.migration_audit_checks'::regclass and not relrowsecurity;
