-- Mantém o total comercial do orçamento ao entrar em Concluir venda.
-- A saída idempotente antiga retornava a venda já criada sem reparar o total.

create or replace function public.confirm_budget_quote_v4(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_q public.sales_quotes%rowtype;
  v_sale_id uuid;
  v_plan_count integer;
  v_plan_total numeric(12,2);
  v_min_due date;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para confirmar orçamentos';
  end if;

  select * into v_q from public.sales_quotes where id=p_quote_id for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;

  if v_q.status='confirmed' and v_q.sale_id is not null then
    update public.sales
    set agreed_markup_amount=coalesce(v_q.agreed_markup_amount,0),
        total_amount=v_q.total_amount,
        total_profit=(v_q.total_amount-coalesce(total_cost,0))::numeric(12,2),
        updated_at=now()
    where id=v_q.sale_id and record_type='sale';
    perform public.sync_sale_payment_state(v_q.sale_id);
    return v_q.sale_id;
  end if;

  if v_q.payment_mode<>'split' then
    v_sale_id:=public.confirm_budget_quote_v2_core(p_quote_id);
    update public.sales
    set agreed_markup_amount=coalesce(v_q.agreed_markup_amount,0),
        total_amount=v_q.total_amount,
        total_profit=(v_q.total_amount-coalesce(total_cost,0))::numeric(12,2),
        updated_at=now()
    where id=v_sale_id;
    if v_q.payment_mode='paid' then
      update public.sale_payment_entries
      set amount=v_q.total_amount,
          notes=case when coalesce(v_q.agreed_markup_amount,0)>0
            then 'Pagamento integral registrado na confirmação, incluindo adicional a prazo'
            else notes end
      where sale_id=v_sale_id;
    end if;
    perform public.sync_sale_payment_state(v_sale_id);
    return v_sale_id;
  end if;

  select count(*)::integer,coalesce(sum(amount),0)::numeric(12,2),min(due_on)
  into v_plan_count,v_plan_total,v_min_due
  from public.sales_quote_payment_installments where quote_id=p_quote_id;
  if v_plan_count<2 then raise exception 'O pagamento dividido não possui pelo menos duas parcelas'; end if;
  if abs(v_plan_total-v_q.total_amount)>0.005 then raise exception 'A soma das parcelas não corresponde ao total do orçamento'; end if;

  update public.sales_quotes set payment_mode='combined',payment_method='Pagamento fracionado',payment_due_on=v_min_due,paid_on=null,updated_at=now() where id=p_quote_id;
  v_sale_id:=public.confirm_budget_quote_v2_core(p_quote_id);
  update public.sales
  set agreed_markup_amount=coalesce(v_q.agreed_markup_amount,0),
      total_amount=v_q.total_amount,
      total_profit=(v_q.total_amount-coalesce(total_cost,0))::numeric(12,2),
      updated_at=now()
  where id=v_sale_id;
  update public.sales_quotes set payment_mode='split',payment_method='Pagamento fracionado',payment_due_on=v_min_due,updated_at=now() where id=p_quote_id;
  insert into public.sale_payment_installments(sale_id,source_quote_installment_id,installment_no,amount,due_on,planned_payment_method,notes)
  select v_sale_id,id,installment_no,amount,due_on,planned_payment_method,notes
  from public.sales_quote_payment_installments where quote_id=p_quote_id order by installment_no;
  perform public.sync_sale_payment_state(v_sale_id);
  return v_sale_id;
end;
$$;

revoke all on function public.confirm_budget_quote_v4(uuid) from public,anon;
grant execute on function public.confirm_budget_quote_v4(uuid) to authenticated;

-- Repara vendas já confirmadas cujo total ficou preso no subtotal dos itens.
update public.sales s
set agreed_markup_amount=coalesce(q.agreed_markup_amount,0),
    total_amount=q.total_amount,
    total_profit=(q.total_amount-coalesce(s.total_cost,0))::numeric(12,2),
    updated_at=now()
from public.sales_quotes q
where q.sale_id=s.id
  and q.status='confirmed'
  and abs(coalesce(s.total_amount,0)-coalesce(q.total_amount,0))>0.005;

