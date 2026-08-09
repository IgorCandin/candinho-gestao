-- Avoid duplicate permissive SELECT policies while keeping read and write
-- permissions explicit for the Bank 2.0 laboratory.

drop policy if exists bank_lab_accounts_write on public.bank_lab_accounts;
drop policy if exists bank_lab_imports_write on public.bank_lab_imports;
drop policy if exists bank_lab_transactions_write on public.bank_lab_transactions;
drop policy if exists bank_lab_accounts_insert on public.bank_lab_accounts;
drop policy if exists bank_lab_accounts_update on public.bank_lab_accounts;
drop policy if exists bank_lab_accounts_delete on public.bank_lab_accounts;
drop policy if exists bank_lab_imports_insert on public.bank_lab_imports;
drop policy if exists bank_lab_imports_update on public.bank_lab_imports;
drop policy if exists bank_lab_imports_delete on public.bank_lab_imports;
drop policy if exists bank_lab_transactions_insert on public.bank_lab_transactions;
drop policy if exists bank_lab_transactions_update on public.bank_lab_transactions;
drop policy if exists bank_lab_transactions_delete on public.bank_lab_transactions;

create policy bank_lab_accounts_insert on public.bank_lab_accounts
for insert to authenticated with check (public.can_write_bank());
create policy bank_lab_accounts_update on public.bank_lab_accounts
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
create policy bank_lab_accounts_delete on public.bank_lab_accounts
for delete to authenticated using (public.can_write_bank());

create policy bank_lab_imports_insert on public.bank_lab_imports
for insert to authenticated with check (public.can_write_bank());
create policy bank_lab_imports_update on public.bank_lab_imports
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
create policy bank_lab_imports_delete on public.bank_lab_imports
for delete to authenticated using (public.can_write_bank());

create policy bank_lab_transactions_insert on public.bank_lab_transactions
for insert to authenticated with check (public.can_write_bank());
create policy bank_lab_transactions_update on public.bank_lab_transactions
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());
create policy bank_lab_transactions_delete on public.bank_lab_transactions
for delete to authenticated using (public.can_write_bank());
