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

  with priced as (
    select si.quantity,
      coalesce((
        select min(a.effective_promotional_price)
        from public.active_operation_promotion_snapshot() a
        where a.operation_scope = 'supplements'
          and a.supplement_product_id = p.id
          and a.available_quantity > 0
          and a.effective_promotional_price >= 0
          and a.effective_promotional_price < a.current_price
      ), p.sale_price)::numeric(12,2) as effective_price
    from public.sale_items si
    join public.products p on p.id = si.product_id and p.active
    where si.sale_id = p_lead_id
  )
  select count(*)::integer, coalesce(sum(quantity * effective_price),0)::numeric(12,2)
  into v_item_count, v_gross
  from priced;

  if v_item_count = 0 then raise exception 'Este lead não possui produto de interesse'; end if;

  insert into public.sales_quotes(
    customer_id,location_id,lead_id,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
    payment_mode,delivered,schedule_post_sale,notes
  ) values (
    v_lead.customer_id,v_lead.location_id,p_lead_id,'quoted',v_today,v_today + 7,v_gross,0,v_gross,
    'receivable',false,true,v_lead.notes
  ) returning id into v_quote_id;

  insert into public.sales_quote_items(quote_id,product_id,flavor_id,quantity,unit_cost,unit_price)
  select v_quote_id,si.product_id,si.flavor_id,si.quantity,p.cost_price,
    coalesce((
      select min(a.effective_promotional_price)
      from public.active_operation_promotion_snapshot() a
      where a.operation_scope = 'supplements'
        and a.supplement_product_id = p.id
        and a.available_quantity > 0
        and a.effective_promotional_price >= 0
        and a.effective_promotional_price < a.current_price
    ), p.sale_price)::numeric(12,2)
  from public.sale_items si
  join public.products p on p.id = si.product_id and p.active
  where si.sale_id = p_lead_id
  order by si.created_at,si.id;

  update public.sales set lead_status = 'Cotação', general_status = 'pending', cancelled_at = null,
    cancellation_reason = null, updated_at = now() where id = p_lead_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('lead',p_lead_id,'conversion_started_v1',jsonb_build_object(
    'quote_id',v_quote_id,'gross_amount',v_gross,'item_count',v_item_count,'promotion_aware',true
  ));

  return v_quote_id;
end;
$function$;

grant execute on function public.prepare_lead_conversion_v1(uuid) to authenticated, service_role;
