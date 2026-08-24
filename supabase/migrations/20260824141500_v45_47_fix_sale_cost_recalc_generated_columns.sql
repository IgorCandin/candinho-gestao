create or replace function public.recalculate_sale_acquisition_cost_v4545(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row record;
  v_total_cost numeric(14,4):=0;
  v_gift_cost numeric(14,4):=0;
  v_total_amount numeric(14,2):=0;
  v_operational_cost numeric(14,2):=0;
  v_unit_cost numeric(14,4);
begin
  if p_sale_id is null then return; end if;

  for v_row in
    select ilm.product_id, ilm.flavor_id,
      sum(abs(ilm.quantity_delta))::numeric(14,4) allocated_quantity,
      sum(abs(ilm.quantity_delta) * coalesce(il.unit_cost,p.cost_price,0))::numeric(14,4) allocated_cost
    from public.inventory_lot_movements ilm
    join public.products p on p.id=ilm.product_id
    left join public.inventory_lots il on il.id=ilm.lot_id
    where ilm.sale_id=p_sale_id and ilm.movement_type='sale' and ilm.quantity_delta<0
    group by ilm.product_id,ilm.flavor_id
  loop
    if coalesce(v_row.allocated_quantity,0)<=0 then continue; end if;
    v_unit_cost:=v_row.allocated_cost/v_row.allocated_quantity;
    update public.sale_items si
      set unit_cost=round(v_unit_cost,4)
    where si.sale_id=p_sale_id
      and si.product_id=v_row.product_id
      and si.flavor_id is not distinct from v_row.flavor_id;
  end loop;

  select coalesce(sum(si.total_cost),0)::numeric(14,4)
    into v_total_cost from public.sale_items si where si.sale_id=p_sale_id;

  select coalesce(s.gift_quantity,0)*coalesce(s.gift_unit_cost,0),
         coalesce(s.total_amount,0), coalesce(s.operational_cost_total,0)
    into v_gift_cost,v_total_amount,v_operational_cost
  from public.sales s where s.id=p_sale_id;

  v_total_cost:=v_total_cost+coalesce(v_gift_cost,0);

  update public.sales
  set total_cost=round(v_total_cost,2),
      total_profit=round(v_total_amount-v_total_cost,2),
      contribution_margin=round(v_total_amount-v_total_cost-v_operational_cost,2),
      updated_at=now()
  where id=p_sale_id;

  update public.sale_operational_cost_snapshots snap
  set merchandise_cost_total=round(v_total_cost,2),
      gross_profit=round(snap.revenue_total-v_total_cost,2),
      variable_cost_total=round(v_total_cost+snap.operational_cost_total,2),
      contribution_margin=round(snap.revenue_total-v_total_cost-snap.operational_cost_total,2)
  where snap.operation_scope='supplements' and snap.sale_id=p_sale_id and snap.status='finalized';
end;
$function$;
