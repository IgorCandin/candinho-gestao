-- Candinho Company · Bank V39 · 2026-08-04
-- Permite alterar os dados completos de planos/mensalidades sem reabrir
-- escrita direta nas tabelas do Bank.

begin;

create or replace function public.bank_update_subscription(
  p_subscription_id uuid,
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
  p_due_mode text,
  p_notes text
)
returns public.bank_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_subscription public.bank_subscriptions;
  v_name text := nullif(btrim(p_name), '');
  v_cycle text := lower(coalesce(nullif(btrim(p_billing_cycle), ''), 'monthly'));
  v_method text := lower(coalesce(nullif(btrim(p_payment_method_type), ''), 'card'));
  v_projection text := lower(coalesce(nullif(btrim(p_projection_mode), ''), 'inside_card'));
  v_due_mode text := lower(coalesce(nullif(btrim(p_due_mode), ''), 'fixed_day'));
  v_card_id uuid := p_card_id;
  v_account_id uuid := p_account_id;
  v_billing_day integer := p_billing_day;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.' using errcode = '42501';
  end if;

  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.'
      using errcode = '42501';
  end if;

  if p_subscription_id is null then
    raise exception 'Mensalidade inválida.';
  end if;

  if v_name is null then
    raise exception 'Informe o nome do plano ou mensalidade.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um valor válido maior que zero.';
  end if;

  if v_cycle = 'annual' then
    v_cycle := 'yearly';
  end if;

  if v_cycle not in ('monthly', 'yearly', 'weekly', 'custom') then
    raise exception 'Ciclo de cobrança inválido.';
  end if;

  if v_due_mode not in ('fixed_day', 'month_only') then
    raise exception 'Modo de vencimento inválido.';
  end if;

  if v_due_mode = 'month_only' then
    v_billing_day := null;
  elsif v_billing_day is not null and (v_billing_day < 1 or v_billing_day > 31) then
    raise exception 'Informe um dia de cobrança entre 1 e 31.';
  end if;

  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'A data final não pode ser anterior à data inicial.';
  end if;

  if v_method not in ('card', 'account', 'cash', 'other') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if v_projection not in ('inside_card', 'direct_charge', 'reference_only') then
    raise exception 'Modo de projeção inválido.';
  end if;

  if v_method = 'card' then
    if v_card_id is null or not exists (
      select 1 from public.bank_cards where id = v_card_id and is_active = true
    ) then
      raise exception 'Escolha um cartão ativo para essa mensalidade.';
    end if;
    v_account_id := null;
  elsif v_method = 'account' then
    if v_account_id is null or not exists (
      select 1 from public.bank_accounts where id = v_account_id and is_active = true
    ) then
      raise exception 'Escolha uma conta ativa para essa mensalidade.';
    end if;
    v_card_id := null;
  else
    v_card_id := null;
    v_account_id := null;
  end if;

  update public.bank_subscriptions
  set
    name = v_name,
    provider = nullif(btrim(p_provider), ''),
    amount = p_amount,
    billing_cycle = v_cycle,
    billing_day = v_billing_day,
    due_mode = v_due_mode,
    starts_on = p_starts_on,
    ends_on = p_ends_on,
    category = nullif(btrim(p_category), ''),
    origin = nullif(btrim(p_origin), ''),
    payment_method_type = v_method,
    card_id = v_card_id,
    account_id = v_account_id,
    include_in_projection = coalesce(p_include_in_projection, true),
    projection_mode = v_projection,
    notes = nullif(btrim(p_notes), ''),
    updated_by = v_user,
    updated_at = now()
  where id = p_subscription_id
  returning * into v_subscription;

  if v_subscription.id is null then
    raise exception 'Mensalidade não encontrada.';
  end if;

  return v_subscription;
end;
$$;

revoke all on function public.bank_update_subscription(
  uuid,text,text,numeric,text,integer,date,date,text,text,text,uuid,uuid,boolean,text,text,text
) from public, anon;

grant execute on function public.bank_update_subscription(
  uuid,text,text,numeric,text,integer,date,date,text,text,text,uuid,uuid,boolean,text,text,text
) to authenticated, service_role;

-- A tela de edição precisa conhecer o modo de vencimento atual.
-- Mantemos todas as colunas existentes da view na mesma ordem e acrescentamos
-- due_mode somente ao final para que CREATE OR REPLACE seja compatível.
create or replace view public.bank_subscriptions_overview
with (security_invoker = true)
as
select
  s.id,s.name,s.provider,s.amount,s.billing_cycle,s.billing_day,s.starts_on,s.ends_on,s.category,s.origin,s.payment_method_type,s.card_id,s.account_id,s.include_in_projection,s.projection_mode,s.is_active,s.notes,s.created_by,s.updated_by,s.created_at,s.updated_at,
  c.name as card_name,
  a.name as account_name,
  case
    when s.payment_method_type='card' then c.name
    when s.payment_method_type='account' then a.name
    when s.payment_method_type='cash' then 'Dinheiro'
    else 'Outro'
  end as payment_source_name,
  case
    when not s.is_active then 'inactive'
    when s.ends_on is not null and s.ends_on < (now() at time zone 'America/Sao_Paulo')::date then 'ended'
    when s.starts_on is not null and s.starts_on > (now() at time zone 'America/Sao_Paulo')::date then 'scheduled'
    else 'active'
  end as effective_status,
  s.due_mode
from public.bank_subscriptions s
left join public.bank_cards c on c.id=s.card_id
left join public.bank_accounts a on a.id=s.account_id;

grant select on public.bank_subscriptions_overview to authenticated, service_role;
revoke all on public.bank_subscriptions_overview from anon;

commit;
