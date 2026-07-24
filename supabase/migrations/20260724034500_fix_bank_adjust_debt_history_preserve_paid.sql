create or replace function public.bank_adjust_debt_history(
  p_debt_id uuid,
  p_total_paid numeric,
  p_next_reference_date date,
  p_due_mode text default 'fixed_day',
  p_notes text default null
)
returns public.bank_debts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_debt public.bank_debts;
  v_mode text:=lower(
    coalesce(
      nullif(btrim(p_due_mode),''),
      'fixed_day'
    )
  );
  v_previous_paid numeric(14,2);
  v_effective_paid numeric(14,2);
  v_audit_note text;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  select *
  into v_debt
  from public.bank_debts
  where id=p_debt_id
  for update;

  if v_debt.id is null then
    raise exception 'Dívida não encontrada';
  end if;

  if v_mode not in ('fixed_day','month_only') then
    raise exception 'Modo de vencimento inválido';
  end if;

  if p_total_paid is null
     or p_total_paid<0
     or p_total_paid>v_debt.original_amount
  then
    raise exception 'Total já pago inválido';
  end if;

  v_previous_paid:=coalesce(v_debt.total_paid,0);
  v_effective_paid:=greatest(p_total_paid,v_previous_paid);

  if v_effective_paid<v_debt.original_amount
     and p_next_reference_date is null
  then
    raise exception
      'Informe o próximo mês/data de referência enquanto houver saldo restante';
  end if;

  if v_mode='month_only'
     and p_next_reference_date is not null
     and p_next_reference_date<>date_trunc('month',p_next_reference_date)::date
  then
    raise exception
      'Para pendência mensal sem dia fixo, informe o primeiro dia do mês como referência interna';
  end if;

  v_audit_note:=nullif(
    concat_ws(
      ' | ',
      case
        when p_total_paid<v_previous_paid then
          'Acerto histórico: tentativa de reduzir o total pago de '
          ||v_previous_paid::text||' para '||p_total_paid::text
          ||' foi ignorada; o valor já confirmado foi preservado.'
        else
          'Acerto histórico: total pago alterado de '
          ||v_previous_paid::text||' para '||v_effective_paid::text
      end,
      nullif(btrim(p_notes),'')
    ),
    ''
  );

  update public.bank_debts
  set total_paid=v_effective_paid,
      next_due_date=case
        when v_effective_paid>=original_amount then null
        else p_next_reference_date
      end,
      due_day=case
        when v_effective_paid>=original_amount then null
        when v_mode='month_only' then null
        when p_next_reference_date is null then due_day
        else extract(day from p_next_reference_date)::integer
      end,
      due_mode=v_mode,
      status=case
        when v_effective_paid>=original_amount then 'paid'
        else 'active'
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id,
    due_date,
    action_type,
    amount,
    paid_on,
    previous_due_date,
    new_due_date,
    payment_account_id,
    notes,
    created_by
  )
  values(
    p_debt_id,
    p_next_reference_date,
    'adjustment',
    0,
    null,
    null,
    v_debt.next_due_date,
    null,
    v_audit_note,
    auth.uid()
  );

  return v_debt;
end;
$$;

revoke all
on function public.bank_adjust_debt_history(
  uuid,numeric,date,text,text
)
from public,anon;

grant execute
on function public.bank_adjust_debt_history(
  uuid,numeric,date,text,text
)
to authenticated,service_role;
