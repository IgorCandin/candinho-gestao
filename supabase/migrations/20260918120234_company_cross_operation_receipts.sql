begin;

alter table public.company_grouped_receipts
  add column if not exists fitness_sale_ids uuid[] not null default '{}'::uuid[],
  add column if not exists received_on date;

drop policy if exists company_grouped_receipts_read on public.company_grouped_receipts;
create policy company_grouped_receipts_read on public.company_grouped_receipts
  for select to authenticated using (
    public.can_access_operation('supplements') and
    (cardinality(fitness_sale_ids)=0 or public.can_access_operation('fitness'))
  );

create or replace function public.register_company_cross_operation_receipt_v1(
  p_batch_id uuid,
  p_supplement_sale_ids uuid[],
  p_fitness_sale_ids uuid[],
  p_amount numeric,
  p_received_on date,
  p_payment_method text,
  p_notes text default null
)
returns uuid
language plpgsql security definer set search_path=''
as $function$
declare
  v_supplement public.sales%rowtype;
  v_fitness public.fitness_sales%rowtype;
  v_customer uuid;
  v_core_customer uuid;
  v_supplement_count integer := 0;
  v_fitness_count integer := 0;
  v_total numeric(12,2) := 0;
  v_outstanding numeric(12,2);
  v_allocations jsonb := '[]'::jsonb;
begin
  if not public.can_write() or not public.can_access_operation('supplements') or not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para receber as duas operações';
  end if;
  if p_batch_id is null or exists(select 1 from public.company_grouped_receipts where id=p_batch_id) then
    raise exception 'Identificador de recebimento inválido ou já utilizado';
  end if;
  if p_supplement_sale_ids is null or cardinality(p_supplement_sale_ids)<1
    or p_fitness_sale_ids is null or cardinality(p_fitness_sale_ids)<1
    or array_position(p_supplement_sale_ids,null) is not null
    or array_position(p_fitness_sale_ids,null) is not null
    or cardinality(p_supplement_sale_ids)<>(select count(distinct x) from unnest(p_supplement_sale_ids) x)
    or cardinality(p_fitness_sale_ids)<>(select count(distinct x) from unnest(p_fitness_sale_ids) x) then
    raise exception 'Selecione vendas distintas das duas operações';
  end if;
  if p_received_on is null or p_payment_method is null
    or p_payment_method<>all(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado']) then
    raise exception 'Informe data e forma de pagamento válidas';
  end if;
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then
    raise exception 'Informe um valor recebido válido em centavos';
  end if;

  -- Travas em ordem estável impedem que outra cobrança quite uma venda no meio do lote.
  for v_supplement in select * from public.sales where id=any(p_supplement_sale_ids) order by id for update loop
    v_supplement_count := v_supplement_count+1;
    if v_supplement.record_type<>'sale' or v_supplement.general_status='cancelled'
      or v_supplement.payment_status='received' or v_supplement.customer_id is null then
      raise exception 'Uma venda de Suplementos não está disponível para recebimento';
    end if;
    if v_customer is null then v_customer := v_supplement.customer_id;
    elsif v_customer<>v_supplement.customer_id then
      raise exception 'As vendas devem pertencer ao mesmo cliente';
    end if;
    select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=v_supplement.id;
    if coalesce(v_outstanding,0)<=0.005 then raise exception 'Uma venda de Suplementos já está quitada'; end if;
    v_total := v_total+v_outstanding;
  end loop;
  if v_supplement_count<>cardinality(p_supplement_sale_ids) then raise exception 'Venda de Suplementos não encontrada'; end if;

  for v_fitness in select * from public.fitness_sales where id=any(p_fitness_sale_ids) order by id for update loop
    v_fitness_count := v_fitness_count+1;
    if v_fitness.general_status='cancelled' or v_fitness.payment_status='received' or v_fitness.customer_id is null then
      raise exception 'Uma venda Fitness não está disponível para recebimento';
    end if;
    select core_customer_id into v_core_customer from public.fitness_customers where id=v_fitness.customer_id;
    if v_core_customer is null or v_core_customer<>v_customer then
      raise exception 'As vendas Fitness e Suplementos não pertencem ao mesmo cliente vinculado';
    end if;
    v_total := v_total+v_fitness.total_amount;
  end loop;
  if v_fitness_count<>cardinality(p_fitness_sale_ids) then raise exception 'Venda Fitness não encontrada'; end if;
  if p_amount<>v_total then
    raise exception 'Para pagar as duas operações juntas, informe o total exato de %', to_char(v_total,'FM999999990D00');
  end if;

  insert into public.company_grouped_receipts
    (id,customer_id,sale_ids,fitness_sale_ids,amount,payment_method,difference_mode,difference_amount,received_on)
  values
    (p_batch_id,v_customer,p_supplement_sale_ids,p_fitness_sale_ids,p_amount,p_payment_method,'exact',0,p_received_on);

  for v_supplement in select * from public.sales where id=any(p_supplement_sale_ids) order by quoted_at,id loop
    select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=v_supplement.id;
    perform public.register_sale_payment(
      v_supplement.id,v_outstanding,p_received_on,p_payment_method,null,
      concat_ws(' · ','Recebimento conjunto '||p_batch_id::text,nullif(btrim(p_notes),''))
    );
    v_allocations := v_allocations||jsonb_build_array(jsonb_build_object(
      'operation','Suplementos','sale_id',v_supplement.id,'amount',v_outstanding
    ));
  end loop;
  for v_fitness in select * from public.fitness_sales where id=any(p_fitness_sale_ids) order by quoted_on,id loop
    perform public.mark_fitness_sale_paid(v_fitness.id,p_received_on,p_payment_method);
    insert into public.audit_events(entity_type,entity_id,action,details)
    values('fitness_sale',v_fitness.id,'cross_operation_receipt',jsonb_build_object(
      'batch_id',p_batch_id,'amount',v_fitness.total_amount,'received_on',p_received_on,
      'payment_method',p_payment_method,'notes',nullif(btrim(p_notes),'')
    ));
    v_allocations := v_allocations||jsonb_build_array(jsonb_build_object(
      'operation','Fitness','sale_id',v_fitness.id,'amount',v_fitness.total_amount
    ));
  end loop;
  update public.company_grouped_receipts set allocations=v_allocations where id=p_batch_id;
  return p_batch_id;
end;
$function$;

revoke all on function public.register_company_cross_operation_receipt_v1(uuid,uuid[],uuid[],numeric,date,text,text) from public,anon;
grant execute on function public.register_company_cross_operation_receipt_v1(uuid,uuid[],uuid[],numeric,date,text,text) to authenticated;

commit;
