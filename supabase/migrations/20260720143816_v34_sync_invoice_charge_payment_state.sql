begin;

create or replace function public.bank_mark_charge_paid(
  p_charge_id uuid,
  p_paid_on date default current_date,
  p_payment_account_id uuid default null
)
returns public.bank_charges
language plpgsql
security definer
set search_path=public
as $$
declare
  v_charge public.bank_charges;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  update public.bank_charges
  set paid_amount=amount,
      status='paid',
      paid_on=coalesce(p_paid_on,current_date),
      payment_account_id=coalesce(
        p_payment_account_id,
        payment_account_id
      ),
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_charge_id
    and status<>'cancelled'
  returning * into v_charge;

  if v_charge.id is null then
    raise exception
      'Cobrança não encontrada ou cancelada';
  end if;

  if v_charge.card_invoice_id is not null then
    update public.bank_card_invoices
    set status='paid',
        paid_on=coalesce(p_paid_on,current_date),
        updated_by=auth.uid(),
        updated_at=now()
    where id=v_charge.card_invoice_id
      and status<>'cancelled';
  end if;

  return v_charge;
end;
$$;

revoke all
on function public.bank_mark_charge_paid(uuid,date,uuid)
from public,anon;

grant execute
on function public.bank_mark_charge_paid(uuid,date,uuid)
to authenticated,service_role;

create or replace function public.bank_mark_invoice_paid(
  p_invoice_id uuid,
  p_paid_on date default current_date
)
returns public.bank_card_invoices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_invoice public.bank_card_invoices;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  update public.bank_card_invoices
  set status='paid',
      paid_on=coalesce(p_paid_on,current_date),
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_invoice_id
    and status<>'cancelled'
  returning * into v_invoice;

  if v_invoice.id is null then
    raise exception
      'Fatura não encontrada ou cancelada';
  end if;

  update public.bank_charges
  set paid_amount=amount,
      status='paid',
      paid_on=coalesce(p_paid_on,current_date),
      updated_by=auth.uid(),
      updated_at=now()
  where card_invoice_id=p_invoice_id
    and status<>'cancelled';

  return v_invoice;
end;
$$;

revoke all
on function public.bank_mark_invoice_paid(uuid,date)
from public,anon;

grant execute
on function public.bank_mark_invoice_paid(uuid,date)
to authenticated,service_role;

commit;
