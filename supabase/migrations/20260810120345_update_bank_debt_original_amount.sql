create or replace function public.bank_update_debt_original_amount(
  p_debt_id uuid,
  p_original_amount numeric,
  p_reason text
)
returns public.bank_debts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debt public.bank_debts;
  v_previous_amount numeric(14,2);
  v_new_amount numeric(14,2) := round(p_original_amount, 2);
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.'
      using errcode = '42501';
  end if;

  select * into v_debt
  from public.bank_debts
  where id = p_debt_id
  for update;

  if v_debt.id is null then
    raise exception 'Dívida não encontrada.';
  end if;

  if v_new_amount is null or v_new_amount <= 0 then
    raise exception 'Informe um valor total válido maior que zero.';
  end if;

  if v_new_amount < coalesce(v_debt.total_paid, 0) then
    raise exception 'O valor total não pode ser menor que o valor já pago.';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'Informe o motivo da alteração.';
  end if;

  v_previous_amount := v_debt.original_amount;

  update public.bank_debts
  set original_amount = v_new_amount,
      status = case
        when status = 'cancelled' then 'cancelled'
        when coalesce(total_paid, 0) >= v_new_amount then 'paid'
        else 'active'
      end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id, due_date, action_type, amount, paid_on,
    previous_due_date, new_due_date, payment_account_id, notes, created_by
  ) values (
    p_debt_id, v_debt.next_due_date, 'adjustment', 0, null,
    v_debt.next_due_date, v_debt.next_due_date, null,
    'Alteração do valor total: '
      || v_previous_amount::text || ' → ' || v_new_amount::text
      || ' | Motivo: ' || v_reason,
    auth.uid()
  );

  return v_debt;
end;
$$;

revoke all on function public.bank_update_debt_original_amount(uuid,numeric,text)
from public, anon;

grant execute on function public.bank_update_debt_original_amount(uuid,numeric,text)
to authenticated, service_role;

do $$
declare
  v_debt public.bank_debts;
begin
  select * into v_debt
  from public.bank_debts
  where lower(name) = lower('Notinha na loja da Graça')
    and original_amount = 900
    and coalesce(total_paid, 0) <= 862.20
  order by created_at desc
  limit 1
  for update;

  if v_debt.id is not null then
    update public.bank_debts
    set original_amount = 862.20,
        status = case
          when status = 'cancelled' then 'cancelled'
          when coalesce(total_paid, 0) >= 862.20 then 'paid'
          else 'active'
        end,
        updated_at = now()
    where id = v_debt.id;

    insert into public.bank_debt_payments(
      debt_id, due_date, action_type, amount, paid_on,
      previous_due_date, new_due_date, payment_account_id, notes, created_by
    ) values (
      v_debt.id, v_debt.next_due_date, 'adjustment', 0, null,
      v_debt.next_due_date, v_debt.next_due_date, null,
      'Correção do valor total solicitada: 900.00 → 862.20',
      coalesce(v_debt.updated_by, v_debt.created_by)
    );
  end if;
end;
$$;
