begin;

-- A venda entregue e ainda não recebida pode ter desconto ou juros negociados
-- no acerto. Entradas já recebidas e planos de parcelas continuam protegidos.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.register_company_grouped_receipt_v1(uuid,uuid[],numeric,date,text,text,text)'::regprocedure)
    into v_definition;
  if v_definition is null or (length(v_definition)-length(replace(v_definition,'s.delivery_status=''delivered'' or ','')))<>length('s.delivery_status=''delivered'' or ') then
    raise exception 'Definição do recebimento conjunto diferente da esperada';
  end if;
  execute replace(v_definition,'s.delivery_status=''delivered'' or ','');
end;
$$;

create or replace function public.register_company_grouped_receipt_v2(
  p_batch_id uuid,
  p_sale_ids uuid[],
  p_amount numeric,
  p_received_on date,
  p_payment_method text,
  p_difference_mode text,
  p_remaining_due_on date,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_customer uuid; v_count integer;
begin
  if not public.can_write() or not public.can_access_operation('supplements') then
    raise exception 'Usuário sem permissão para registrar recebimentos';
  end if;
  if p_difference_mode='partial' then
    if p_remaining_due_on is null or p_remaining_due_on<p_received_on then
      raise exception 'Informe a data combinada para o saldo restante';
    end if;
    if p_sale_ids is null or cardinality(p_sale_ids)<2 or array_position(p_sale_ids,null) is not null then
      raise exception 'Selecione pelo menos duas vendas';
    end if;
    select count(*), (max(customer_id::text))::uuid into v_count,v_customer from public.sales
      where id=any(p_sale_ids) and record_type='sale' and general_status<>'cancelled' and payment_status='receivable';
    if v_count<>cardinality(p_sale_ids) or v_customer is null or exists(
      select 1 from public.sales where id=any(p_sale_ids) and customer_id is distinct from v_customer
    ) then raise exception 'Selecione apenas vendas em aberto do mesmo cliente'; end if;
    update public.sales set payment_due_at=p_remaining_due_on,updated_at=now()
      where id=any(p_sale_ids) and payment_status='receivable';
  end if;
  return public.register_company_grouped_receipt_v1(
    p_batch_id,p_sale_ids,p_amount,p_received_on,p_payment_method,p_difference_mode,p_notes
  );
end;
$$;

revoke execute on function public.register_company_grouped_receipt_v1(uuid,uuid[],numeric,date,text,text,text) from authenticated;
revoke all on function public.register_company_grouped_receipt_v2(uuid,uuid[],numeric,date,text,text,date,text) from public,anon;
grant execute on function public.register_company_grouped_receipt_v2(uuid,uuid[],numeric,date,text,text,date,text) to authenticated;
commit;
