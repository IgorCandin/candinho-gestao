-- Bank 2.0 laboratory: isolated data for manual work and statement imports.
-- Nothing in this migration writes to the existing Bank tables.

create table if not exists public.bank_lab_holders (
  id text primary key,
  name text not null,
  person_type text not null check (person_type in ('pf', 'pj')),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_lab_accounts (
  id uuid primary key default gen_random_uuid(),
  holder_id text not null references public.bank_lab_holders(id) on delete restrict,
  institution text not null,
  name text not null,
  account_type text not null default 'Conta',
  current_balance numeric(14,2) not null default 0,
  balance_date date,
  balance_source text not null default 'manual' check (balance_source in ('manual', 'import')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holder_id, institution, name)
);

create table if not exists public.bank_lab_imports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_lab_accounts(id) on delete cascade,
  file_name text not null,
  file_hash text not null,
  imported_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  statement_balance numeric(14,2),
  statement_date date,
  imported_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (account_id, file_hash)
);

create table if not exists public.bank_lab_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_lab_accounts(id) on delete cascade,
  import_id uuid references public.bank_lab_imports(id) on delete set null,
  transaction_date date not null,
  description text not null,
  amount numeric(14,2) not null check (amount <> 0),
  category text,
  source text not null default 'manual' check (source in ('manual', 'import')),
  external_id text,
  fingerprint text,
  manually_edited_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bank_lab_transactions_import_fingerprint_uidx
  on public.bank_lab_transactions (account_id, fingerprint)
  where fingerprint is not null;

create index if not exists bank_lab_accounts_holder_idx
  on public.bank_lab_accounts (holder_id, is_active, display_order);
create index if not exists bank_lab_transactions_account_date_idx
  on public.bank_lab_transactions (account_id, transaction_date desc, created_at desc);
create index if not exists bank_lab_imports_account_created_idx
  on public.bank_lab_imports (account_id, created_at desc);

alter table public.bank_lab_holders enable row level security;
alter table public.bank_lab_accounts enable row level security;
alter table public.bank_lab_imports enable row level security;
alter table public.bank_lab_transactions enable row level security;

drop policy if exists bank_lab_holders_read on public.bank_lab_holders;
create policy bank_lab_holders_read on public.bank_lab_holders
for select to authenticated using (public.can_access_bank());

drop policy if exists bank_lab_accounts_read on public.bank_lab_accounts;
create policy bank_lab_accounts_read on public.bank_lab_accounts
for select to authenticated using (public.can_access_bank());
drop policy if exists bank_lab_accounts_insert on public.bank_lab_accounts;
create policy bank_lab_accounts_insert on public.bank_lab_accounts
for insert to authenticated with check (public.can_write_bank());
drop policy if exists bank_lab_accounts_update on public.bank_lab_accounts;
create policy bank_lab_accounts_update on public.bank_lab_accounts
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
drop policy if exists bank_lab_accounts_delete on public.bank_lab_accounts;
create policy bank_lab_accounts_delete on public.bank_lab_accounts
for delete to authenticated using (public.can_write_bank());

drop policy if exists bank_lab_imports_read on public.bank_lab_imports;
create policy bank_lab_imports_read on public.bank_lab_imports
for select to authenticated using (public.can_access_bank());
drop policy if exists bank_lab_imports_insert on public.bank_lab_imports;
create policy bank_lab_imports_insert on public.bank_lab_imports
for insert to authenticated with check (public.can_write_bank());
drop policy if exists bank_lab_imports_update on public.bank_lab_imports;
create policy bank_lab_imports_update on public.bank_lab_imports
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
drop policy if exists bank_lab_imports_delete on public.bank_lab_imports;
create policy bank_lab_imports_delete on public.bank_lab_imports
for delete to authenticated using (public.can_write_bank());

drop policy if exists bank_lab_transactions_read on public.bank_lab_transactions;
create policy bank_lab_transactions_read on public.bank_lab_transactions
for select to authenticated using (public.can_access_bank());
drop policy if exists bank_lab_transactions_insert on public.bank_lab_transactions;
create policy bank_lab_transactions_insert on public.bank_lab_transactions
for insert to authenticated with check (public.can_write_bank());
drop policy if exists bank_lab_transactions_update on public.bank_lab_transactions;
create policy bank_lab_transactions_update on public.bank_lab_transactions
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
drop policy if exists bank_lab_transactions_delete on public.bank_lab_transactions;
create policy bank_lab_transactions_delete on public.bank_lab_transactions
for delete to authenticated using (public.can_write_bank());

revoke all on table public.bank_lab_holders from public, anon;
revoke all on table public.bank_lab_accounts from public, anon;
revoke all on table public.bank_lab_imports from public, anon;
revoke all on table public.bank_lab_transactions from public, anon;
grant select on table public.bank_lab_holders to authenticated;
grant select, insert, update, delete on table public.bank_lab_accounts to authenticated;
grant select, insert, update, delete on table public.bank_lab_imports to authenticated;
grant select, insert, update, delete on table public.bank_lab_transactions to authenticated;

insert into public.bank_lab_holders (id, name, person_type, display_order)
values
  ('igor_pf', 'Igor', 'pf', 10),
  ('giulia_pf', 'Giulia', 'pf', 20),
  ('candinho_suplementos_pj', 'Candinho Suplementos', 'pj', 30)
on conflict (id) do update
set name = excluded.name,
    person_type = excluded.person_type,
    display_order = excluded.display_order;

insert into public.bank_lab_accounts
  (holder_id, institution, name, account_type, is_active, display_order)
values
  ('igor_pf', 'Banco do Brasil', 'Banco do Brasil', 'Conta corrente', true, 10),
  ('igor_pf', 'Sicoob', 'Sicoob', 'Conta corrente', true, 20),
  ('igor_pf', 'Nubank', 'Nubank', 'Conta e cartão', true, 30),
  ('igor_pf', 'BRB', 'BRB / BRBCard', 'Conta e cartão', true, 40),
  ('igor_pf', 'Mercado Pago', 'Mercado Pago', 'Carteira digital', true, 50),
  ('igor_pf', 'Caixa', 'Caixa', 'Conta corrente', false, 60),
  ('candinho_suplementos_pj', 'Sicoob', 'Sicoob PJ', 'Conta empresarial', true, 10),
  ('candinho_suplementos_pj', 'Nubank', 'Nubank PJ', 'Conta empresarial', true, 20),
  ('giulia_pf', 'Sicoob', 'Sicoob', 'Conta corrente', true, 10),
  ('giulia_pf', 'Nubank', 'Nubank', 'Conta e cartão', true, 20),
  ('giulia_pf', 'Neon', 'Neon', 'Conta digital', true, 30),
  ('giulia_pf', 'ShopeePay', 'Shopee / ShopeePay', 'Carteira digital', true, 40)
on conflict (holder_id, institution, name) do nothing;

create or replace function public.bank_lab_import_statement(
  p_account_id uuid,
  p_file_name text,
  p_file_hash text,
  p_statement_balance numeric,
  p_statement_date date,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_import_id uuid;
  v_total integer := coalesce(jsonb_array_length(p_rows), 0);
  v_inserted integer := 0;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar o Bank.' using errcode = '42501';
  end if;

  if p_account_id is null or not exists (
    select 1 from public.bank_lab_accounts where id = p_account_id and is_active
  ) then
    raise exception 'Selecione uma conta ativa do Bank 2.0.';
  end if;

  if p_file_hash is null or btrim(p_file_hash) = '' then
    raise exception 'Arquivo inválido.';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or v_total = 0 then
    raise exception 'Nenhuma movimentação válida foi encontrada no arquivo.';
  end if;

  select id into v_import_id
  from public.bank_lab_imports
  where account_id = p_account_id and file_hash = p_file_hash;

  if v_import_id is not null then
    return jsonb_build_object(
      'already_imported', true,
      'imported_rows', 0,
      'duplicate_rows', v_total
    );
  end if;

  insert into public.bank_lab_imports (
    account_id, file_name, file_hash, statement_balance, statement_date
  ) values (
    p_account_id, left(coalesce(nullif(btrim(p_file_name), ''), 'extrato'), 180),
    p_file_hash, p_statement_balance, p_statement_date
  ) returning id into v_import_id;

  insert into public.bank_lab_transactions (
    account_id, import_id, transaction_date, description, amount,
    source, external_id, fingerprint
  )
  select
    p_account_id,
    v_import_id,
    x.transaction_date,
    left(btrim(x.description), 500),
    x.amount,
    'import',
    nullif(btrim(x.external_id), ''),
    x.fingerprint
  from jsonb_to_recordset(p_rows) as x(
    transaction_date date,
    description text,
    amount numeric,
    external_id text,
    fingerprint text
  )
  where x.transaction_date is not null
    and nullif(btrim(x.description), '') is not null
    and x.amount is not null
    and x.amount <> 0
    and nullif(btrim(x.fingerprint), '') is not null
  on conflict (account_id, fingerprint) where fingerprint is not null do nothing;

  get diagnostics v_inserted = row_count;

  update public.bank_lab_imports
  set imported_rows = v_inserted,
      duplicate_rows = greatest(v_total - v_inserted, 0)
  where id = v_import_id;

  if p_statement_balance is not null then
    update public.bank_lab_accounts
    set current_balance = p_statement_balance,
        balance_date = coalesce(p_statement_date, current_date),
        balance_source = 'import',
        updated_at = now()
    where id = p_account_id;
  end if;

  return jsonb_build_object(
    'already_imported', false,
    'imported_rows', v_inserted,
    'duplicate_rows', greatest(v_total - v_inserted, 0),
    'balance_updated', p_statement_balance is not null
  );
end;
$$;

revoke all on function public.bank_lab_import_statement(uuid,text,text,numeric,date,jsonb) from public, anon;
grant execute on function public.bank_lab_import_statement(uuid,text,text,numeric,date,jsonb) to authenticated;
