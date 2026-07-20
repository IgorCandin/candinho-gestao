begin;

-- Candinho Company · V38 · Pacotão 7
-- Bank: faturas zeradas são placeholders e não podem ocultar
-- assinaturas estimadas na projeção anual.
-- Migration já aplicada no Supabase de produção.

update public.bank_card_invoices
set
  includes_recurring=false,
  updated_at=now()
where coalesce(amount,0)<=0
  and coalesce(includes_recurring,false)=true;

create or replace function public.bank_normalize_zero_invoice_recurring_flag()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if coalesce(new.amount,0)<=0 then
    new.includes_recurring:=false;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_bank_zero_invoice_recurring_flag
on public.bank_card_invoices;

create trigger trg_bank_zero_invoice_recurring_flag
before insert or update of amount,includes_recurring
on public.bank_card_invoices
for each row
execute function public.bank_normalize_zero_invoice_recurring_flag();

commit;
