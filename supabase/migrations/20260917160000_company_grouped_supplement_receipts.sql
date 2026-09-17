begin;

create table if not exists public.company_grouped_receipts (
  id uuid primary key,
  customer_id uuid not null references public.customers(id),
  sale_ids uuid[] not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  difference_mode text not null check (difference_mode in ('exact','partial','discount','interest')),
  difference_amount numeric(12,2) not null default 0,
  allocations jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.company_grouped_receipts enable row level security;
create policy company_grouped_receipts_read on public.company_grouped_receipts
  for select to authenticated using (public.can_access_operation('supplements'));
grant select on public.company_grouped_receipts to authenticated;

create or replace function public.register_company_grouped_receipt_v1(
  p_batch_id uuid,
  p_sale_ids uuid[],
  p_amount numeric,
  p_received_on date,
  p_payment_method text,
  p_difference_mode text,
  p_notes text default null
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  v_sale public.sales%rowtype;
  v_customer uuid;
  v_count integer:=0;
  v_total numeric(12,2):=0;
  v_difference numeric(12,2);
  v_remaining numeric(12,2);
  v_apply numeric(12,2);
  v_capacity numeric(12,2);
  v_outstanding numeric(12,2);
  v_allocations jsonb:='[]'::jsonb;
begin
  if not public.can_write() or not public.can_access_operation('supplements') then
    raise exception 'Usuário sem permissão para registrar recebimentos';
  end if;
  if p_batch_id is null then raise exception 'Identificador do recebimento obrigatório'; end if;
  if exists(select 1 from public.company_grouped_receipts where id=p_batch_id) then
    raise exception 'Este recebimento conjunto já foi registrado';
  end if;
  if p_sale_ids is null or cardinality(p_sale_ids)<2
     or cardinality(p_sale_ids)<>(select count(distinct x) from unnest(p_sale_ids) x)
     or array_position(p_sale_ids,null) is not null then
    raise exception 'Selecione pelo menos duas vendas diferentes';
  end if;
  if p_received_on is null then raise exception 'Informe a data do recebimento'; end if;
  if p_payment_method is null or p_payment_method<>all(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado']) then
    raise exception 'Forma de pagamento inválida';
  end if;
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then
    raise exception 'Informe um valor recebido válido em centavos';
  end if;
  if p_difference_mode not in ('exact','partial','discount','interest') then
    raise exception 'Escolha como tratar a diferença';
  end if;

  -- A trava em ordem estável impede dois caixas de quitarem as mesmas vendas simultaneamente.
  for v_sale in select * from public.sales where id=any(p_sale_ids) order by id for update loop
    v_count:=v_count+1;
    if v_sale.record_type<>'sale' or v_sale.general_status='cancelled' or v_sale.payment_status='received' then
      raise exception 'Uma das vendas selecionadas não pode receber pagamento';
    end if;
    if v_sale.customer_id is null then raise exception 'Venda sem cliente vinculado'; end if;
    if v_customer is null then v_customer:=v_sale.customer_id;
    elsif v_customer<>v_sale.customer_id then raise exception 'As vendas devem pertencer ao mesmo cliente'; end if;
    select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=v_sale.id;
    if coalesce(v_outstanding,0)<=0.005 then raise exception 'Uma das vendas já está quitada'; end if;
    v_total:=v_total+v_outstanding;
  end loop;
  if v_count<>cardinality(p_sale_ids) then raise exception 'Venda não encontrada'; end if;
  v_difference:=round(abs(v_total-p_amount),2);
  if (p_amount<v_total and p_difference_mode not in ('partial','discount'))
     or (p_amount>v_total and p_difference_mode<>'interest')
     or (p_amount=v_total and p_difference_mode<>'exact') then
    raise exception 'Revise a escolha de pagamento parcial, desconto ou juros';
  end if;

  if p_difference_mode in ('discount','interest') then
    -- Ajustes de preço em venda já recebida, entregue ou parcelada exigem correção individual.
    if exists(
      select 1 from public.sales s where s.id=any(p_sale_ids) and
      (s.delivery_status='delivered' or exists(select 1 from public.sale_payment_entries e where e.sale_id=s.id)
       or exists(select 1 from public.sale_payment_installments i where i.sale_id=s.id))
    ) then raise exception 'Desconto ou juros conjuntos exigem vendas ainda não recebidas, não entregues e não parceladas'; end if;
  end if;

  if p_difference_mode='discount' then
    v_remaining:=v_difference;
    for v_sale in select * from public.sales where id=any(p_sale_ids) order by id loop
      exit when v_remaining<=0;
      v_capacity:=least(v_remaining,v_sale.total_amount,greatest(v_sale.gross_amount-v_sale.discount_amount,0));
      if v_capacity<=0 then continue; end if;
      update public.sales set discount_amount=discount_amount+v_capacity,total_amount=total_amount-v_capacity,
        total_profit=total_profit-v_capacity,price_condition='Desconto',updated_at=now() where id=v_sale.id;
      update public.sales_quotes set discount_amount=discount_amount+v_capacity,total_amount=total_amount-v_capacity,updated_at=now()
        where sale_id=v_sale.id and status='confirmed';
      insert into public.audit_events(entity_type,entity_id,action,details) values
        ('sale',v_sale.id,'grouped_receipt_discount',jsonb_build_object('batch_id',p_batch_id,'amount',v_capacity));
      v_remaining:=v_remaining-v_capacity;
    end loop;
    if v_remaining>0.005 then raise exception 'O desconto supera o valor ajustável das vendas'; end if;
  elsif p_difference_mode='interest' then
    select * into v_sale from public.sales where id=any(p_sale_ids) order by id limit 1;
    update public.sales set agreed_markup_amount=agreed_markup_amount+v_difference,total_amount=total_amount+v_difference,
      total_profit=total_profit+v_difference,price_condition='Juros da operação',updated_at=now() where id=v_sale.id;
    update public.sales_quotes set agreed_markup_amount=agreed_markup_amount+v_difference,total_amount=total_amount+v_difference,updated_at=now()
      where sale_id=v_sale.id and status='confirmed';
    insert into public.audit_events(entity_type,entity_id,action,details) values
      ('sale',v_sale.id,'grouped_receipt_interest',jsonb_build_object('batch_id',p_batch_id,'amount',v_difference));
  end if;

  insert into public.company_grouped_receipts(id,customer_id,sale_ids,amount,payment_method,difference_mode,difference_amount)
    values(p_batch_id,v_customer,p_sale_ids,p_amount,p_payment_method,p_difference_mode,v_difference);
  v_remaining:=p_amount;
  for v_sale in select * from public.sales where id=any(p_sale_ids) order by quoted_at,id loop
    exit when v_remaining<=0.005;
    select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=v_sale.id;
    v_apply:=least(v_remaining,v_outstanding);
    if v_apply<=0.005 then continue; end if;
    perform public.register_sale_payment(v_sale.id,v_apply,p_received_on,p_payment_method,null,
      concat_ws(' · ','Recebimento conjunto '||p_batch_id::text,nullif(btrim(p_notes),'')));
    v_allocations:=v_allocations||jsonb_build_array(jsonb_build_object('sale_id',v_sale.id,'amount',v_apply));
    v_remaining:=v_remaining-v_apply;
  end loop;
  if v_remaining>0.005 then raise exception 'Não foi possível distribuir o pagamento'; end if;
  update public.company_grouped_receipts set allocations=v_allocations where id=p_batch_id;
  return p_batch_id;
end;
$$;

revoke all on function public.register_company_grouped_receipt_v1(uuid,uuid[],numeric,date,text,text,text) from public,anon;
grant execute on function public.register_company_grouped_receipt_v1(uuid,uuid[],numeric,date,text,text,text) to authenticated;
commit;
