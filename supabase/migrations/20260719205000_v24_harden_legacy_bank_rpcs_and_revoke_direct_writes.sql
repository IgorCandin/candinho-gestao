-- Candinho Company V24
-- Já aplicada diretamente no Supabase de produção.
--
-- 1) Corrige quatro RPCs Bank antigas que ainda operavam como invoker.
-- 2) Corrige bank_mark_charge_paid para exigir can_write_bank(), e não apenas acesso de leitura.
-- 3) Revoga INSERT / UPDATE / DELETE direto nas tabelas Bank.
-- 4) Mantém SELECT direto sujeito a RLS.
-- 5) Escritas passam pelas RPCs SECURITY DEFINER.

create or replace function public.bank_mark_charge_paid(
  p_charge_id uuid,
  p_paid_on date default current_date,
  p_payment_account_id uuid default null
)
returns public.bank_charges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge public.bank_charges;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode = '42501';
  end if;

  update public.bank_charges
  set
    paid_amount = amount,
    status = 'paid',
    paid_on = coalesce(p_paid_on, current_date),
    payment_account_id = coalesce(p_payment_account_id, payment_account_id),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_charge_id
    and status <> 'cancelled'
  returning * into v_charge;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada ou cancelada';
  end if;

  return v_charge;
end;
$$;

alter function public.bank_pay_debt_installment(uuid,numeric,date,uuid,text)
  security definer;

alter function public.bank_postpone_debt_payment(uuid,text)
  security definer;

alter function public.bank_receive_receivable(uuid,numeric,date,uuid)
  security definer;

revoke all on function public.bank_mark_charge_paid(uuid,date,uuid)
from public, anon;

revoke all on function public.bank_pay_debt_installment(uuid,numeric,date,uuid,text)
from public, anon;

revoke all on function public.bank_postpone_debt_payment(uuid,text)
from public, anon;

revoke all on function public.bank_receive_receivable(uuid,numeric,date,uuid)
from public, anon;

grant execute on function public.bank_mark_charge_paid(uuid,date,uuid)
to authenticated, service_role;

grant execute on function public.bank_pay_debt_installment(uuid,numeric,date,uuid,text)
to authenticated, service_role;

grant execute on function public.bank_postpone_debt_payment(uuid,text)
to authenticated, service_role;

grant execute on function public.bank_receive_receivable(uuid,numeric,date,uuid)
to authenticated, service_role;

revoke insert, update, delete on
  public.bank_accounts,
  public.bank_balance_snapshots,
  public.bank_card_invoices,
  public.bank_cards,
  public.bank_charges,
  public.bank_debt_payments,
  public.bank_debts,
  public.bank_income_sources,
  public.bank_month_closures,
  public.bank_month_commitment_resolutions,
  public.bank_receivables,
  public.bank_subscriptions
from authenticated;
