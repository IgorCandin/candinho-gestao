-- Candinho Company V23
-- Já aplicada diretamente no Supabase de produção como create_bank_write_rpcs_v23.
-- Migra as escritas diretas do Bank para RPCs SECURITY DEFINER.
-- Os grants diretos das tabelas Bank ainda NÃO são revogados nesta etapa.

create or replace function public.bank_save_balances(
  p_balance_date date,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.' using errcode = '42501';
  end if;
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode = '42501';
  end if;
  if p_balance_date is null then
    raise exception 'Informe uma data válida para os saldos.';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Nenhum saldo válido foi informado.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as x(account_id uuid, balance numeric)
    left join public.bank_accounts a on a.id = x.account_id and a.is_active = true
    where x.account_id is null or x.balance is null or a.id is null
  ) then
    raise exception 'Uma ou mais contas não estão mais ativas ou possuem saldo inválido.';
  end if;

  insert into public.bank_balance_snapshots(account_id, balance_date, balance, created_by)
  select x.account_id, p_balance_date, x.balance, v_user
  from jsonb_to_recordset(p_rows) as x(account_id uuid, balance numeric)
  on conflict (account_id, balance_date)
  do update set balance = excluded.balance, created_by = v_user;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.bank_create_account(
  p_name text,
  p_account_type text default 'bank',
  p_origin text default null,
  p_notes text default null,
  p_display_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_type text := coalesce(nullif(btrim(p_account_type), ''), 'bank');
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_name is null then raise exception 'Informe o nome da conta ou carteira.'; end if;
  if v_type not in ('bank','cash','wallet','saved','other') then raise exception 'Tipo de conta inválido.'; end if;

  insert into public.bank_accounts(name, account_type, origin, notes, display_order, is_active, created_by)
  values (v_name, v_type, nullif(btrim(p_origin),''), nullif(btrim(p_notes),''), coalesce(p_display_order,0), true, v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_create_card(
  p_name text,
  p_institution text,
  p_holder_name text,
  p_due_day integer,
  p_closing_day integer,
  p_origin text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_name is null then raise exception 'Informe o nome do cartão.'; end if;
  if p_due_day is null or p_due_day < 1 or p_due_day > 31 then raise exception 'Informe um dia de vencimento entre 1 e 31.'; end if;
  if p_closing_day is not null and (p_closing_day < 1 or p_closing_day > 31) then raise exception 'Informe um dia de fechamento entre 1 e 31.'; end if;

  insert into public.bank_cards(name, institution, holder_name, due_day, closing_day, origin, notes, is_active, created_by)
  values (v_name, nullif(btrim(p_institution),''), nullif(btrim(p_holder_name),''), p_due_day, p_closing_day,
          nullif(btrim(p_origin),''), nullif(btrim(p_notes),''), true, v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_save_card_invoices(
  p_card_id uuid,
  p_rows jsonb,
  p_blank_months jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if p_card_id is null or not exists(select 1 from public.bank_cards where id=p_card_id and is_active=true) then
    raise exception 'Esse cartão não está mais ativo.';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'Lista de faturas inválida.'; end if;
  if p_blank_months is null or jsonb_typeof(p_blank_months) <> 'array' then raise exception 'Lista de meses em branco inválida.'; end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as x(reference_month date, amount numeric, includes_recurring boolean)
    where x.reference_month is null
       or x.reference_month <> date_trunc('month', x.reference_month::timestamp)::date
       or x.amount is null
       or x.amount < 0
  ) then
    raise exception 'Uma das faturas possui mês ou valor inválido.';
  end if;

  insert into public.bank_card_invoices(card_id, reference_month, amount, includes_recurring, created_by, updated_by)
  select p_card_id, x.reference_month, x.amount, coalesce(x.includes_recurring,true), v_user, v_user
  from jsonb_to_recordset(p_rows) as x(reference_month date, amount numeric, includes_recurring boolean)
  on conflict (card_id, reference_month)
  do update set amount = excluded.amount,
                includes_recurring = excluded.includes_recurring,
                updated_by = v_user,
                updated_at = now();

  get diagnostics v_count = row_count;

  delete from public.bank_card_invoices i
  using (
    select value::text::date as reference_month
    from jsonb_array_elements_text(p_blank_months)
  ) b
  where i.card_id = p_card_id
    and i.reference_month = b.reference_month
    and i.status <> 'paid';

  return v_count;
end;
$$;

create or replace function public.bank_create_debt(
  p_name text,
  p_debt_type text,
  p_creditor_name text,
  p_original_amount numeric,
  p_monthly_amount numeric,
  p_start_date date,
  p_next_due_date date,
  p_origin text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(btrim(p_name),'');
  v_type text := coalesce(nullif(btrim(p_debt_type),''),'loan');
  v_due_day integer := case when p_next_due_date is null then null else extract(day from p_next_due_date)::integer end;
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_name is null then raise exception 'Informe um nome para a dívida.'; end if;
  if v_type not in ('loan','note') then raise exception 'Tipo de dívida inválido.'; end if;
  if p_original_amount is null or p_original_amount <= 0 then raise exception 'Informe o valor total.'; end if;
  if p_monthly_amount is not null and p_monthly_amount <= 0 then raise exception 'Informe um valor da parcela válido maior que zero.'; end if;

  insert into public.bank_debts(name,debt_type,creditor_name,original_amount,monthly_amount,total_paid,start_date,next_due_date,due_day,interest_free,origin,status,notes,created_by,updated_by)
  values (v_name,v_type,nullif(btrim(p_creditor_name),''),p_original_amount,p_monthly_amount,0,p_start_date,p_next_due_date,v_due_day,true,
          nullif(btrim(p_origin),''),'active',nullif(btrim(p_notes),''),v_user,v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_create_charge(
  p_title text,
  p_description text,
  p_amount numeric,
  p_due_date date,
  p_category text,
  p_origin text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_title text := nullif(btrim(p_title),'');
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_title is null then raise exception 'Informe o nome da cobrança.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe um valor válido maior que zero.'; end if;
  if p_due_date is null then raise exception 'Informe uma data de vencimento válida.'; end if;

  insert into public.bank_charges(title,description,amount,paid_amount,due_date,status,category,origin,charge_type,notes,created_by,updated_by)
  values (v_title,nullif(btrim(p_description),''),p_amount,0,p_due_date,'pending',nullif(btrim(p_category),''),nullif(btrim(p_origin),''),'manual',nullif(btrim(p_notes),''),v_user,v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_create_subscription(
  p_name text,
  p_provider text,
  p_amount numeric,
  p_billing_cycle text,
  p_billing_day integer,
  p_starts_on date,
  p_ends_on date,
  p_category text,
  p_origin text,
  p_payment_method_type text,
  p_card_id uuid,
  p_account_id uuid,
  p_include_in_projection boolean,
  p_projection_mode text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(btrim(p_name),'');
  v_cycle text := lower(coalesce(nullif(btrim(p_billing_cycle),''),'monthly'));
  v_method text := lower(coalesce(nullif(btrim(p_payment_method_type),''),'card'));
  v_projection text := lower(coalesce(nullif(btrim(p_projection_mode),''),'inside_card'));
  v_card_id uuid := p_card_id;
  v_account_id uuid := p_account_id;
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_name is null then raise exception 'Informe o nome do plano ou mensalidade.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe um valor válido maior que zero.'; end if;

  if v_cycle = 'annual' then v_cycle := 'yearly'; end if;
  if v_cycle not in ('monthly','yearly','weekly','custom') then raise exception 'Ciclo de cobrança inválido.'; end if;
  if p_billing_day is not null and (p_billing_day < 1 or p_billing_day > 31) then raise exception 'Informe um dia de cobrança entre 1 e 31.'; end if;
  if v_method not in ('card','account','cash','other') then raise exception 'Forma de pagamento inválida.'; end if;
  if v_projection not in ('inside_card','direct_charge','reference_only') then raise exception 'Modo de projeção inválido.'; end if;

  if v_method = 'card' then
    if v_card_id is null or not exists(select 1 from public.bank_cards where id=v_card_id and is_active=true) then
      raise exception 'Escolha um cartão ativo para essa mensalidade.';
    end if;
    v_account_id := null;
  elsif v_method = 'account' then
    if v_account_id is null or not exists(select 1 from public.bank_accounts where id=v_account_id and is_active=true) then
      raise exception 'Escolha uma conta ativa para essa mensalidade.';
    end if;
    v_card_id := null;
  else
    v_card_id := null;
    v_account_id := null;
  end if;

  insert into public.bank_subscriptions(name,provider,amount,billing_cycle,billing_day,starts_on,ends_on,category,origin,payment_method_type,card_id,account_id,include_in_projection,projection_mode,is_active,notes,created_by,updated_by)
  values (v_name,nullif(btrim(p_provider),''),p_amount,v_cycle,p_billing_day,p_starts_on,p_ends_on,nullif(btrim(p_category),''),nullif(btrim(p_origin),''),v_method,v_card_id,v_account_id,
          coalesce(p_include_in_projection,true),v_projection,true,nullif(btrim(p_notes),''),v_user,v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_toggle_subscription(
  p_subscription_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;

  update public.bank_subscriptions
  set is_active = coalesce(p_active,false), updated_by=v_user, updated_at=now()
  where id=p_subscription_id;

  if not found then raise exception 'Mensalidade não encontrada.'; end if;
end;
$$;

create or replace function public.bank_create_income_source(
  p_name text,
  p_payer_name text,
  p_amount numeric,
  p_frequency text,
  p_expected_day integer,
  p_starts_on date,
  p_ends_on date,
  p_category text,
  p_origin text,
  p_is_variable boolean,
  p_include_in_projection boolean,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(btrim(p_name),'');
  v_frequency text := lower(coalesce(nullif(btrim(p_frequency),''),'monthly'));
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_name is null then raise exception 'Informe o nome da entrada prevista.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor previsto com um valor válido maior que zero.'; end if;
  if v_frequency not in ('monthly','annual','weekly','custom') then raise exception 'Frequência inválida.'; end if;
  if p_expected_day is not null and (p_expected_day < 1 or p_expected_day > 31) then raise exception 'Informe um dia esperado entre 1 e 31.'; end if;

  insert into public.bank_income_sources(name,payer_name,amount,frequency,expected_day,starts_on,ends_on,category,origin,is_variable,include_in_projection,is_active,notes,created_by,updated_by)
  values (v_name,nullif(btrim(p_payer_name),''),p_amount,v_frequency,p_expected_day,p_starts_on,p_ends_on,nullif(btrim(p_category),''),nullif(btrim(p_origin),''),coalesce(p_is_variable,false),coalesce(p_include_in_projection,true),true,nullif(btrim(p_notes),''),v_user,v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_toggle_income_source(
  p_source_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;

  update public.bank_income_sources
  set is_active=coalesce(p_active,false), updated_by=v_user, updated_at=now()
  where id=p_source_id;

  if not found then raise exception 'Entrada prevista não encontrada.'; end if;
end;
$$;

create or replace function public.bank_create_receivable(
  p_title text,
  p_payer_name text,
  p_description text,
  p_amount numeric,
  p_due_date date,
  p_category text,
  p_origin text,
  p_income_source_id uuid,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_title text := nullif(btrim(p_title),'');
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_title is null then raise exception 'Informe o nome da conta a receber.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor a receber com um valor válido maior que zero.'; end if;
  if p_due_date is null then raise exception 'Informe uma data de vencimento válida.'; end if;
  if p_income_source_id is not null and not exists(select 1 from public.bank_income_sources where id=p_income_source_id) then
    raise exception 'A entrada prevista vinculada não existe.';
  end if;

  insert into public.bank_receivables(title,payer_name,description,amount,received_amount,due_date,status,category,origin,source_type,source_id,notes,created_by,updated_by)
  values (v_title,nullif(btrim(p_payer_name),''),nullif(btrim(p_description),''),p_amount,0,p_due_date,'pending',nullif(btrim(p_category),''),nullif(btrim(p_origin),''),case when p_income_source_id is null then 'manual' else 'income_source' end,p_income_source_id,nullif(btrim(p_notes),''),v_user,v_user)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.bank_mark_commitment_paid(
  p_commitment_key text,
  p_reference_month date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_key text := nullif(btrim(p_commitment_key),'');
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if v_key is null or position(':' in v_key)=0 then raise exception 'Compromisso inválido.'; end if;
  if p_reference_month is null or p_reference_month <> date_trunc('month',p_reference_month::timestamp)::date then raise exception 'Mês de referência inválido.'; end if;

  insert into public.bank_month_commitment_resolutions(commitment_key,reference_month,resolution,resolved_on,created_by,updated_at)
  values (v_key,p_reference_month,'paid',current_date,v_user,now())
  on conflict (commitment_key,reference_month)
  do update set resolution='paid', resolved_on=current_date, created_by=v_user, updated_at=now();
end;
$$;

create or replace function public.bank_quick_update(
  p_balance_date date,
  p_reference_month date,
  p_balances jsonb,
  p_invoices jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sessão não encontrada.' using errcode='42501'; end if;
  if not public.can_write_bank() then raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.' using errcode='42501'; end if;
  if p_balance_date is null then raise exception 'Informe uma data válida para os saldos.'; end if;
  if p_reference_month is null or p_reference_month <> date_trunc('month',p_reference_month::timestamp)::date then raise exception 'Informe um mês válido para as faturas.'; end if;
  if p_balances is null or jsonb_typeof(p_balances) <> 'array' then raise exception 'Lista de saldos inválida.'; end if;
  if p_invoices is null or jsonb_typeof(p_invoices) <> 'array' then raise exception 'Lista de faturas inválida.'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_balances) as x(account_id uuid,balance numeric)
    left join public.bank_accounts a on a.id=x.account_id and a.is_active=true
    where x.account_id is null or x.balance is null or a.id is null
  ) then raise exception 'Uma ou mais contas não estão mais ativas ou possuem saldo inválido.'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_invoices) as x(card_id uuid,amount numeric,includes_recurring boolean)
    left join public.bank_cards c on c.id=x.card_id and c.is_active=true
    where x.card_id is null or x.amount is null or x.amount < 0 or c.id is null
  ) then raise exception 'Um ou mais cartões não estão mais ativos ou possuem fatura inválida.'; end if;

  insert into public.bank_balance_snapshots(account_id,balance_date,balance,created_by)
  select x.account_id,p_balance_date,x.balance,v_user
  from jsonb_to_recordset(p_balances) as x(account_id uuid,balance numeric)
  on conflict (account_id,balance_date)
  do update set balance=excluded.balance, created_by=v_user;

  insert into public.bank_card_invoices(card_id,reference_month,amount,includes_recurring,created_by,updated_by)
  select x.card_id,p_reference_month,x.amount,coalesce(x.includes_recurring,true),v_user,v_user
  from jsonb_to_recordset(p_invoices) as x(card_id uuid,amount numeric,includes_recurring boolean)
  on conflict (card_id,reference_month)
  do update set amount=excluded.amount, includes_recurring=excluded.includes_recurring, updated_by=v_user, updated_at=now();
end;
$$;

revoke all on function public.bank_save_balances(date,jsonb) from public, anon;
revoke all on function public.bank_create_account(text,text,text,text,integer) from public, anon;
revoke all on function public.bank_create_card(text,text,text,integer,integer,text,text) from public, anon;
revoke all on function public.bank_save_card_invoices(uuid,jsonb,jsonb) from public, anon;
revoke all on function public.bank_create_debt(text,text,text,numeric,numeric,date,date,text,text) from public, anon;
revoke all on function public.bank_create_charge(text,text,numeric,date,text,text,text) from public, anon;
revoke all on function public.bank_create_subscription(text,text,numeric,text,integer,date,date,text,text,text,uuid,uuid,boolean,text,text) from public, anon;
revoke all on function public.bank_toggle_subscription(uuid,boolean) from public, anon;
revoke all on function public.bank_create_income_source(text,text,numeric,text,integer,date,date,text,text,boolean,boolean,text) from public, anon;
revoke all on function public.bank_toggle_income_source(uuid,boolean) from public, anon;
revoke all on function public.bank_create_receivable(text,text,text,numeric,date,text,text,uuid,text) from public, anon;
revoke all on function public.bank_mark_commitment_paid(text,date) from public, anon;
revoke all on function public.bank_quick_update(date,date,jsonb,jsonb) from public, anon;

grant execute on function public.bank_save_balances(date,jsonb) to authenticated, service_role;
grant execute on function public.bank_create_account(text,text,text,text,integer) to authenticated, service_role;
grant execute on function public.bank_create_card(text,text,text,integer,integer,text,text) to authenticated, service_role;
grant execute on function public.bank_save_card_invoices(uuid,jsonb,jsonb) to authenticated, service_role;
grant execute on function public.bank_create_debt(text,text,text,numeric,numeric,date,date,text,text) to authenticated, service_role;
grant execute on function public.bank_create_charge(text,text,numeric,date,text,text,text) to authenticated, service_role;
grant execute on function public.bank_create_subscription(text,text,numeric,text,integer,date,date,text,text,text,uuid,uuid,boolean,text,text) to authenticated, service_role;
grant execute on function public.bank_toggle_subscription(uuid,boolean) to authenticated, service_role;
grant execute on function public.bank_create_income_source(text,text,numeric,text,integer,date,date,text,text,boolean,boolean,text) to authenticated, service_role;
grant execute on function public.bank_toggle_income_source(uuid,boolean) to authenticated, service_role;
grant execute on function public.bank_create_receivable(text,text,text,numeric,date,text,text,uuid,text) to authenticated, service_role;
grant execute on function public.bank_mark_commitment_paid(text,date) to authenticated, service_role;
grant execute on function public.bank_quick_update(date,date,jsonb,jsonb) to authenticated, service_role;

comment on function public.bank_create_subscription(text,text,numeric,text,integer,date,date,text,text,text,uuid,uuid,boolean,text,text) is
'V23 Bank write RPC. Accepts annual from UI and normalizes it to yearly for the database constraint.';
