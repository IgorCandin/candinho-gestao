create or replace function public.update_budget_status(
  p_quote_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_quote public.sales_quotes%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar orçamentos';
  end if;

  if p_status not in ('quoted','lost','cancelled') then
    raise exception 'Situação de orçamento inválida';
  end if;

  select * into v_quote
  from public.sales_quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  if v_quote.status = 'confirmed' then
    raise exception 'Orçamento confirmado não pode ser reaberto ou encerrado';
  end if;

  update public.sales_quotes
  set status = p_status,
      updated_at = now()
  where id = p_quote_id;

  if v_quote.lead_id is not null then
    update public.sales
    set lead_status = case p_status
        when 'quoted' then 'Cotação'
        when 'lost' then 'Contato perdido'
        else 'Cotação cancelada'
      end,
      general_status = case
        when p_status = 'quoted' then 'pending'::public.sale_general_status
        else 'cancelled'::public.sale_general_status
      end,
      cancelled_at = case
        when p_status = 'quoted' then null
        else coalesce(cancelled_at, now())
      end,
      cancellation_reason = case
        when p_status = 'quoted' then null
        when p_status = 'lost' then 'Orçamento marcado como perdido'
        else 'Orçamento cancelado'
      end,
      updated_at = now()
    where id = v_quote.lead_id
      and record_type = 'lead';
  end if;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'quote', p_quote_id,
    case when p_status = 'quoted' then 'reopened' else p_status end,
    jsonb_build_object(
      'previous_status', v_quote.status,
      'new_status', p_status,
      'lead_id', v_quote.lead_id
    )
  );

  return p_quote_id;
end;
$function$;
