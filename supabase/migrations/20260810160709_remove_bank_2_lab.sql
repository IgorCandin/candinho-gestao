begin;

drop function if exists public.bank_lab_import_statement(
  uuid,
  text,
  text,
  numeric,
  date,
  jsonb
);

drop table if exists public.bank_lab_transactions cascade;
drop table if exists public.bank_lab_imports cascade;
drop table if exists public.bank_lab_accounts cascade;
drop table if exists public.bank_lab_holders cascade;

commit;
