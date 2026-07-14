-- PROPOSTA PARA REVISÃO. NÃO EXECUTADA.
-- Cria staging privado e isolado; não promove dados para public.*.

begin;

create extension if not exists pgcrypto;
create schema if not exists appsheet_import;

revoke all on schema appsheet_import from public, anon, authenticated;
grant usage on schema appsheet_import to service_role;

create table if not exists appsheet_import.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  source_sha256 text not null unique check (source_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now(),
  status text not null default 'staged'
    check (status in ('staged', 'validated', 'approved', 'promoted', 'rejected')),
  sheet_counts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(sheet_counts) = 'object'),
  validation_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_summary) = 'object'),
  final_import_approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  notes text,
  constraint import_approval_consistency check (
    (not final_import_approved and approved_at is null and approved_by is null)
    or (final_import_approved and status = 'approved' and approved_at is not null and approved_by is not null)
  )
);

comment on table appsheet_import.import_runs is
  'Execuções idempotentes identificadas pelo SHA-256 do XLSX; não autorizam promoção automaticamente.';

create table if not exists appsheet_import.raw_rows (
  import_run_id uuid not null references appsheet_import.import_runs(id) on delete cascade,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  formulas jsonb not null default '{}'::jsonb check (jsonb_typeof(formulas) = 'object'),
  payload_sha256 text generated always as (
    encode(digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex')
  ) stored,
  primary key (import_run_id, source_sheet, source_row)
);

create index if not exists raw_rows_original_id_idx
  on appsheet_import.raw_rows(import_run_id, source_sheet, original_id)
  where original_id is not null and btrim(original_id) <> '';

create table if not exists appsheet_import.prepared_entities (
  id bigint generated always as identity primary key,
  import_run_id uuid not null references appsheet_import.import_runs(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'customer', 'sale', 'lead', 'sale_item', 'product', 'stock_balance',
    'inventory_movement', 'supplier_order', 'partner', 'partner_movement',
    'payment', 'delivery'
  )),
  source_subkey text not null default '0',
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  natural_key text not null,
  normalized_payload jsonb not null check (jsonb_typeof(normalized_payload) = 'object'),
  validation_errors jsonb not null default '[]'::jsonb
    check (jsonb_typeof(validation_errors) = 'array'),
  is_valid boolean generated always as (jsonb_array_length(validation_errors) = 0) stored,
  match_status text not null default 'pending'
    check (match_status in ('pending', 'matched', 'not_found', 'ambiguous', 'new')),
  target_id uuid,
  approved_for_promotion boolean not null default false,
  prepared_at timestamptz not null default now(),
  unique (import_run_id, entity_type, source_sheet, source_row, source_subkey)
);

create index if not exists prepared_entities_review_idx
  on appsheet_import.prepared_entities(import_run_id, entity_type, is_valid, match_status);
create index if not exists prepared_entities_natural_key_idx
  on appsheet_import.prepared_entities(import_run_id, entity_type, natural_key);

create table if not exists appsheet_import.validation_issues (
  id bigint generated always as identity primary key,
  import_run_id uuid not null references appsheet_import.import_runs(id) on delete cascade,
  entity_type text,
  source_sheet text not null,
  source_row integer not null,
  original_id text,
  issue_code text not null,
  severity text not null default 'error' check (severity in ('info', 'warning', 'error')),
  field_name text not null default '',
  raw_value text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  detected_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row, issue_code, field_name)
);

alter table appsheet_import.import_runs enable row level security;
alter table appsheet_import.import_runs force row level security;
alter table appsheet_import.raw_rows enable row level security;
alter table appsheet_import.raw_rows force row level security;
alter table appsheet_import.prepared_entities enable row level security;
alter table appsheet_import.prepared_entities force row level security;
alter table appsheet_import.validation_issues enable row level security;
alter table appsheet_import.validation_issues force row level security;

revoke all on all tables in schema appsheet_import from public, anon, authenticated;
revoke all on all sequences in schema appsheet_import from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema appsheet_import to service_role;
grant usage, select on all sequences in schema appsheet_import to service_role;

create or replace function appsheet_import.try_numeric(value text)
returns numeric
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  cleaned text;
begin
  if value is null or btrim(value) = '' then return null; end if;
  cleaned := regexp_replace(value, '(R\$|%|\s)', '', 'gi');
  if cleaned ~ '^-?[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$' then
    cleaned := replace(replace(cleaned, '.', ''), ',', '.');
  elsif cleaned ~ '^-?[0-9]+,[0-9]+$' then
    cleaned := replace(cleaned, ',', '.');
  end if;
  return cleaned::numeric;
exception when others then
  return null;
end;
$$;

create or replace function appsheet_import.try_timestamptz(value text)
returns timestamptz
language plpgsql
stable
set search_path = pg_catalog
as $$
begin
  if value is null or btrim(value) = '' then return null; end if;
  if value ~ '^\d{1,2}/\d{1,2}/\d{4}' then
    return to_timestamp(substring(value from '^\d{1,2}/\d{1,2}/\d{4}'), 'DD/MM/YYYY');
  end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function appsheet_import.try_boolean(value text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when lower(btrim(value)) in ('true', 'sim', 'yes', '1', 'x') then true
    when lower(btrim(value)) in ('false', 'não', 'nao', 'no', '0', '') then false
    else null
  end;
$$;

create or replace function appsheet_import.register_run(
  p_source_filename text,
  p_source_sha256 text,
  p_sheet_counts jsonb default '{}'::jsonb,
  p_imported_at timestamptz default now()
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  run_id uuid;
begin
  insert into appsheet_import.import_runs(source_filename, source_sha256, imported_at, sheet_counts)
  values (p_source_filename, lower(p_source_sha256), p_imported_at, coalesce(p_sheet_counts, '{}'::jsonb))
  on conflict (source_sha256) do update
    set source_filename = excluded.source_filename,
        sheet_counts = excluded.sheet_counts
  returning id into run_id;
  return run_id;
end;
$$;

create or replace function appsheet_import.stage_raw_row(
  p_import_run_id uuid,
  p_source_sheet text,
  p_source_row integer,
  p_original_id text,
  p_imported_at timestamptz,
  p_payload jsonb,
  p_formulas jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from appsheet_import.import_runs
    where id = p_import_run_id and status in ('staged', 'validated') and not final_import_approved
  ) then
    raise exception 'Execução inexistente, bloqueada ou já aprovada';
  end if;

  insert into appsheet_import.raw_rows(
    import_run_id, source_sheet, source_row, original_id, imported_at, payload, formulas
  ) values (
    p_import_run_id, p_source_sheet, p_source_row, nullif(btrim(p_original_id), ''),
    p_imported_at, p_payload, coalesce(p_formulas, '{}'::jsonb)
  )
  on conflict (import_run_id, source_sheet, source_row) do update
    set original_id = excluded.original_id,
        payload = excluded.payload,
        formulas = excluded.formulas;
end;
$$;

revoke all on function appsheet_import.try_numeric(text) from public, anon, authenticated;
revoke all on function appsheet_import.try_timestamptz(text) from public, anon, authenticated;
revoke all on function appsheet_import.try_boolean(text) from public, anon, authenticated;
revoke all on function appsheet_import.register_run(text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function appsheet_import.stage_raw_row(uuid, text, integer, text, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function appsheet_import.try_numeric(text) to service_role;
grant execute on function appsheet_import.try_timestamptz(text) to service_role;
grant execute on function appsheet_import.try_boolean(text) to service_role;
grant execute on function appsheet_import.register_run(text, text, jsonb, timestamptz) to service_role;
grant execute on function appsheet_import.stage_raw_row(uuid, text, integer, text, timestamptz, jsonb, jsonb) to service_role;

commit;
