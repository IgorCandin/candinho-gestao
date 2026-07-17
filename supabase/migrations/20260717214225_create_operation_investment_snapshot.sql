create or replace function public.bank_operation_investment_snapshot(p_reference_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_month date := date_trunc('month', coalesce(p_reference_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  v_next_month date := (v_month + interval '1 month')::date;
  v_can_bank boolean := public.can_access_bank();
  v_can_supp boolean := public.can_access_operation('supplements');
  v_can_fit boolean := public.can_access_operation('fitness');
  v_supp_stock numeric := 0;
  v_supp_open numeric := 0;
  v_supp_open_units integer := 0;
  v_supp_received numeric := 0;
  v_supp_received_units integer := 0;
  v_supp_month_pending numeric := 0;
  v_supp_month_ordered numeric := 0;
  v_fit_stock numeric := 0;
  v_fit_open numeric := 0;
  v_fit_open_units integer := 0;
  v_fit_received numeric := 0;
  v_fit_received_units integer := 0;
  v_fit_month_pending numeric := 0;
  v_fit_month_ordered numeric := 0;
begin
  if not (v_can_bank or v_can_supp or v_can_fit or public.current_user_role()='admin') then
    raise exception 'Acesso negado';
  end if;

  if v_can_bank or v_can_supp or public.current_user_role()='admin' then
    select coalesce(sum(greatest(sb.quantity,0) * coalesce(p.cost_price,0)),0)
      into v_supp_stock
    from public.stock_balances sb
    join public.products p on p.id=sb.product_id;

    select
      coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0) * coalesce(poi.unit_cost,0)),0),
      coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),0)::integer
      into v_supp_open,v_supp_open_units
    from public.purchase_order_items poi
    join public.purchase_orders po on po.id=poi.purchase_order_id
    where po.status <> 'cancelled';

    select
      coalesce(sum(pr.quantity_received * coalesce(pr.unit_cost,0)),0),
      coalesce(sum(pr.quantity_received),0)::integer
      into v_supp_received,v_supp_received_units
    from public.purchase_receipts pr
    where pr.received_on >= v_month and pr.received_on < v_next_month;

    select
      coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0) * coalesce(poi.unit_cost,0)),0),
      coalesce(sum(poi.quantity_ordered * coalesce(poi.unit_cost,0)),0)
      into v_supp_month_pending,v_supp_month_ordered
    from public.purchase_order_items poi
    join public.purchase_orders po on po.id=poi.purchase_order_id
    where po.status <> 'cancelled'
      and po.ordered_on >= v_month and po.ordered_on < v_next_month;
  end if;

  if v_can_bank or v_can_fit or public.current_user_role()='admin' then
    select coalesce(sum(greatest(fsb.quantity,0) * coalesce(fv.cost_price,0)),0)
      into v_fit_stock
    from public.fitness_stock_balances fsb
    join public.fitness_variants fv on fv.id=fsb.variant_id;

    select
      coalesce(sum(greatest(fpoi.quantity_ordered-fpoi.quantity_received,0) * coalesce(fpoi.unit_cost,0)),0),
      coalesce(sum(greatest(fpoi.quantity_ordered-fpoi.quantity_received,0)),0)::integer
      into v_fit_open,v_fit_open_units
    from public.fitness_purchase_order_items fpoi
    join public.fitness_purchase_orders fpo on fpo.id=fpoi.purchase_order_id
    where fpo.status <> 'cancelled';

    select
      coalesce(sum(fpr.quantity * coalesce(fpoi.unit_cost,0)),0),
      coalesce(sum(fpr.quantity),0)::integer
      into v_fit_received,v_fit_received_units
    from public.fitness_purchase_receipts fpr
    join public.fitness_purchase_order_items fpoi on fpoi.id=fpr.purchase_order_item_id
    where fpr.received_on >= v_month and fpr.received_on < v_next_month;

    select
      coalesce(sum(greatest(fpoi.quantity_ordered-fpoi.quantity_received,0) * coalesce(fpoi.unit_cost,0)),0),
      coalesce(sum(fpoi.quantity_ordered * coalesce(fpoi.unit_cost,0)),0)
      into v_fit_month_pending,v_fit_month_ordered
    from public.fitness_purchase_order_items fpoi
    join public.fitness_purchase_orders fpo on fpo.id=fpoi.purchase_order_id
    where fpo.status <> 'cancelled'
      and fpo.ordered_on >= v_month and fpo.ordered_on < v_next_month;
  end if;

  return jsonb_build_object(
    'reference_month',v_month,
    'supplements',jsonb_build_object(
      'monthly_received_cost',v_supp_received,
      'monthly_received_units',v_supp_received_units,
      'monthly_pending_order_cost',v_supp_month_pending,
      'monthly_ordered_cost',v_supp_month_ordered,
      'monthly_invested',v_supp_received+v_supp_month_pending,
      'stock_cost',v_supp_stock,
      'open_orders_cost',v_supp_open,
      'open_orders_units',v_supp_open_units,
      'capital_allocated',v_supp_stock+v_supp_open
    ),
    'fitness',jsonb_build_object(
      'monthly_received_cost',v_fit_received,
      'monthly_received_units',v_fit_received_units,
      'monthly_pending_order_cost',v_fit_month_pending,
      'monthly_ordered_cost',v_fit_month_ordered,
      'monthly_invested',v_fit_received+v_fit_month_pending,
      'stock_cost',v_fit_stock,
      'open_orders_cost',v_fit_open,
      'open_orders_units',v_fit_open_units,
      'capital_allocated',v_fit_stock+v_fit_open
    ),
    'company',jsonb_build_object(
      'monthly_invested',v_supp_received+v_supp_month_pending+v_fit_received+v_fit_month_pending,
      'stock_cost',v_supp_stock+v_fit_stock,
      'open_orders_cost',v_supp_open+v_fit_open,
      'capital_allocated',v_supp_stock+v_supp_open+v_fit_stock+v_fit_open
    )
  );
end;
$function$;

revoke all on function public.bank_operation_investment_snapshot(date) from public,anon;
grant execute on function public.bank_operation_investment_snapshot(date) to authenticated,service_role;
