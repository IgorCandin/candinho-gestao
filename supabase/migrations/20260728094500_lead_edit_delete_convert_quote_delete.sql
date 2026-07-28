begin;

create or replace function public.update_lead_v1(
  p_lead_id uuid,
  p_customer_id uuid,
  p_product_id uuid,
  p_flavor_id uuid default null,
  p_lead_status text default 'Perguntou sobre',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead public.sales%rowtype;
  v_customer public.customers%rowtype;
  v_product public.products%rowtype;
  v_allowed constant text[] := array[
    'Perguntou sobre','Decidindo','Está quase comprando','Esperando receber',
    'Esperando pedido de fornecedor','Cotação','Aguardando'
  ];
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para editar leads'; end if;

  select * into v_lead from public.sales where id = p_lead_id for update;
  if not found or v_lead.record_type <> 'lead' then raise exception 'Lead não encontrado'; end if;
  if v_lead.general_status = 'finalized' or coalesce(v_lead.lead_status,'') = 'Convertido' then
    raise exception 'Lead convertido não pode ser editado. Abra a venda vinculada.';
  end if;
  if exists(select 1 from public.sales_quotes where lead_id = p_lead_id) then
    raise exception 'Este lead já possui orçamento. Edite ou exclua o orçamento antes de alterar produto ou sabor.';
  end if;
  if p_lead_status is null or not (p_lead_status = any(v_allowed)) then raise exception 'Status do lead inválido'; end if;

  select * into v_customer from public.customers where id = p_customer_id and active;
  if not found then raise exception 'Cliente não encontrado ou inativo'; end if;

  select * into v_product from public.products where id = p_product_id and active;
  if not found then raise exception 'Produto não encontrado ou inativo'; end if;

  if p_flavor_id is not null then
    if not v_product.flavor_tracking_enabled then raise exception 'Este produto não possui controle por sabor'; end if;
    if not exists(select 1 from public.product_flavors where id = p_flavor_id and product_id = p_product_id and active) then
      raise exception 'Sabor inválido para este produto';
    end if;
  end if;

  update public.sales
  set customer_id = v_customer.id,
      reference = v_customer.reference,
      city = v_customer.city,
      phone = v_customer.phone,
      lead_status = p_lead_status,
      notes = nullif(btrim(p_notes),''),
      general_status = 'pending',
      cancelled_at = null,
      cancellation_reason = null,
      updated_at = now()
  where id = p_lead_id;

  delete from public.sale_items where sale_id = p_lead_id;
  insert into public.sale_items(sale_id,product_id,flavor_id,quantity,unit_cost,unit_price)
  values(p_lead_id,v_product.id,p_flavor_id,1,0,0);

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('lead',p_lead_id,'updated_v1',jsonb_build_object(
    'customer_id',v_customer.id,'product_id',v_product.id,'flavor_id',p_flavor_id,'lead_status',p_lead_status
  ));

  return p_lead_id;
end;
$function$;

grant execute on function public.update_lead_v1(uuid,uuid,uuid,uuid,text,text) to authenticated, service_role;

create or replace function public.delete_lead_v1(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead public.sales%rowtype;
  v_quote_count integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para excluir leads'; end if;

  select * into v_lead from public.sales where id = p_lead_id for update;
  if not found or v_lead.record_type <> 'lead' then raise exception 'Lead não encontrado'; end if;
  if v_lead.general_status = 'finalized' or coalesce(v_lead.lead_status,'') = 'Convertido' then
    raise exception 'Lead convertido não pode ser excluído porque já faz parte do histórico da venda.';
  end if;
  if exists(select 1 from public.sales_quotes where lead_id = p_lead_id and (status = 'confirmed' or sale_id is not null)) then
    raise exception 'Este lead possui uma venda confirmada e precisa permanecer no histórico.';
  end if;

  select count(*)::integer into v_quote_count from public.sales_quotes where lead_id = p_lead_id;
  update public.sales_quotes set lead_id = null, updated_at = now()
  where lead_id = p_lead_id and status <> 'confirmed' and sale_id is null;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('lead',p_lead_id,'deleted_v1',jsonb_build_object(
    'customer_id',v_lead.customer_id,'lead_status',v_lead.lead_status,'unlinked_quotes',v_quote_count
  ));

  delete from public.sales where id = p_lead_id and record_type = 'lead';
  return p_lead_id;
end;
$function$;

grant execute on function public.delete_lead_v1(uuid) to authenticated, service_role;

create or replace function public.prepare_lead_conversion_v1(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead public.sales%rowtype;
  v_quote public.sales_quotes%rowtype;
  v_quote_id uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_gross numeric(12,2) := 0;
  v_item_count integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para converter leads'; end if;

  select * into v_lead from public.sales where id = p_lead_id for update;
  if not found or v_lead.record_type <> 'lead' then raise exception 'Lead não encontrado'; end if;
  if v_lead.general_status = 'finalized' or coalesce(v_lead.lead_status,'') = 'Convertido' then
    raise exception 'Este lead já foi convertido em venda';
  end if;

  select * into v_quote from public.sales_quotes where lead_id = p_lead_id order by created_at desc limit 1 for update;
  if found then
    if v_quote.status = 'confirmed' or v_quote.sale_id is not null then raise exception 'Este lead já possui uma venda confirmada'; end if;
    if v_quote.status <> 'quoted' then
      update public.sales_quotes set status = 'quoted', updated_at = now() where id = v_quote.id;
      update public.sales set lead_status = 'Cotação', general_status = 'pending', cancelled_at = null,
        cancellation_reason = null, updated_at = now() where id = p_lead_id;
    end if;
    return v_quote.id;
  end if;

  select count(*)::integer, coalesce(sum(si.quantity * p.sale_price),0)::numeric(12,2)
  into v_item_count, v_gross
  from public.sale_items si
  join public.products p on p.id = si.product_id and p.active
  where si.sale_id = p_lead_id;

  if v_item_count = 0 then raise exception 'Este lead não possui produto de interesse'; end if;

  insert into public.sales_quotes(
    customer_id,location_id,lead_id,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
    payment_mode,delivered,schedule_post_sale,notes
  ) values (
    v_lead.customer_id,v_lead.location_id,p_lead_id,'quoted',v_today,v_today + 7,v_gross,0,v_gross,
    'receivable',false,true,v_lead.notes
  ) returning id into v_quote_id;

  insert into public.sales_quote_items(quote_id,product_id,flavor_id,quantity,unit_cost,unit_price)
  select v_quote_id,si.product_id,si.flavor_id,si.quantity,p.cost_price,p.sale_price
  from public.sale_items si
  join public.products p on p.id = si.product_id and p.active
  where si.sale_id = p_lead_id
  order by si.created_at,si.id;

  update public.sales set lead_status = 'Cotação', general_status = 'pending', cancelled_at = null,
    cancellation_reason = null, updated_at = now() where id = p_lead_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('lead',p_lead_id,'conversion_started_v1',jsonb_build_object(
    'quote_id',v_quote_id,'gross_amount',v_gross,'item_count',v_item_count
  ));

  return v_quote_id;
end;
$function$;

grant execute on function public.prepare_lead_conversion_v1(uuid) to authenticated, service_role;

create or replace function public.delete_budget_quote_v1(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote public.sales_quotes%rowtype;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para excluir orçamentos'; end if;

  select * into v_quote from public.sales_quotes where id = p_quote_id for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;
  if v_quote.status = 'confirmed' or v_quote.sale_id is not null then
    raise exception 'Orçamento confirmado não pode ser excluído porque faz parte do histórico da venda.';
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('quote',p_quote_id,'deleted_v1',jsonb_build_object(
    'quote_number',v_quote.quote_number,'customer_id',v_quote.customer_id,'lead_id',v_quote.lead_id,
    'previous_status',v_quote.status,'total_amount',v_quote.total_amount
  ));

  delete from public.sales_quotes where id = p_quote_id;

  if v_quote.lead_id is not null then
    update public.sales
    set lead_status = case when lead_status in ('Cotação','Cotação cancelada','Contato perdido') then 'Decidindo' else lead_status end,
        general_status = 'pending', cancelled_at = null, cancellation_reason = null, updated_at = now()
    where id = v_quote.lead_id and record_type = 'lead' and general_status <> 'finalized';
  end if;

  return p_quote_id;
end;
$function$;

grant execute on function public.delete_budget_quote_v1(uuid) to authenticated, service_role;

commit;
