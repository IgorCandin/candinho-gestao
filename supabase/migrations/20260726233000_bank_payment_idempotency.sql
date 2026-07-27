-- Candinho Company · Hotfix 2026-07-26
-- Evita erro/duplicidade quando um pagamento de dívida/notinha é reenviado
-- por internet lenta, duplo toque ou retry do navegador.
--
-- Se a primeira requisição já quitou a dívida, as próximas retornam o estado
-- atual sem criar novo pagamento e sem lançar erro 500.

create or replace function public.bank_pay_debt_installment(
  p_debt_id uuid,
  p_amount numeric default null,
  p_paid_on date default null,
  p_payment_account_id uuid default null,
  p_notes text default null
)
returns public.bank_debts
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_debt public.bank_debts;
  v_amount numeric(14,2);
  v_old_due date;
  v_new_due date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write_bank() then
    raise exception 'Sem permissão para alterar dados da Candinho Bank';
  end if;

  select * into v_debt
  from public.bank_debts
  where id=p_debt_id
  for update;

  if v_debt.id is null then
    raise exception 'Dívida não encontrada para pagamento';
  end if;

  if v_debt.status='cancelled' then
    raise exception 'Dívida cancelada e indisponível para pagamento';
  end if;

  -- Retry idempotente: o primeiro clique pode ter sido concluído mesmo que
  -- a resposta tenha demorado a chegar ao telefone.
  if v_debt.status='paid' or v_debt.total_paid>=v_debt.original_amount then
    return v_debt;
  end if;

  v_amount:=coalesce(
    p_amount,
    v_debt.monthly_amount,
    v_debt.original_amount-v_debt.total_paid
  );

  if v_amount is null or v_amount<=0 then
    raise exception 'Informe um valor válido para o pagamento';
  end if;

  v_amount:=least(
    v_amount,
    v_debt.original_amount-v_debt.total_paid
  );

  v_old_due:=v_debt.next_due_date;
  v_new_due:=case
    when v_old_due is null then null
    else (v_old_due+interval '1 month')::date
  end;

  update public.bank_debts
  set
    total_paid=total_paid+v_amount,
    next_due_date=case
      when total_paid+v_amount>=original_amount then null
      else v_new_due
    end,
    status=case
      when total_paid+v_amount>=original_amount then 'paid'
      else 'active'
    end,
    updated_by=auth.uid()
  where id=p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id,due_date,action_type,amount,paid_on,
    previous_due_date,new_due_date,payment_account_id,
    notes,created_by
  )
  values(
    p_debt_id,v_old_due,'paid',v_amount,
    coalesce(p_paid_on,v_today),
    v_old_due,v_debt.next_due_date,
    p_payment_account_id,p_notes,auth.uid()
  );

  return v_debt;
end;
$function$;

revoke all on function public.bank_pay_debt_installment(uuid,numeric,date,uuid,text)
from public, anon;

grant execute on function public.bank_pay_debt_installment(uuid,numeric,date,uuid,text)
to authenticated, service_role;
