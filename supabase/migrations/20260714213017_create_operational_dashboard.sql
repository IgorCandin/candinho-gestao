create or replace view public.dashboard_operational_summary
with (security_invoker = true)
as
with
brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
),
pending as (
  select
    count(*)::integer as pending_orders_count,
    count(*) filter (where delivery_status = 'to_deliver')::integer as pending_delivery_count,
    count(*) filter (where payment_status = 'receivable')::integer as pending_payment_count,
    count(*) filter (
      where payment_status = 'receivable'
        and payment_due_at is not null
        and payment_due_at < (select today from brazil_today)
    )::integer as overdue_payment_count,
    coalesce(sum(total_amount) filter (
      where payment_status = 'receivable'
        and payment_due_at is not null
        and payment_due_at < (select today from brazil_today)
    ), 0)::numeric(12,2) as overdue_payment_total,
    count(*) filter (
      where payment_status = 'receivable'
        and payment_due_at = (select today from brazil_today)
    )::integer as payment_due_today_count,
    coalesce(sum(total_amount) filter (
      where payment_status = 'receivable'
        and payment_due_at = (select today from brazil_today)
    ), 0)::numeric(12,2) as payment_due_today_total
  from public.pending_orders
),
leads as (
  select
    count(*) filter (where general_status = 'pending')::integer as open_leads_count,
    count(*) filter (
      where general_status = 'pending'
        and lead_date <= (select today from brazil_today) - 7
    )::integer as stale_leads_count
  from public.leads_history
),
suppliers as (
  select
    count(*) filter (where status in ('pending', 'partial'))::integer as supplier_orders_open_count,
    coalesce(sum(pending_units) filter (where status in ('pending', 'partial')), 0)::integer as incoming_units
  from public.supplier_order_summary
),
inventory as (
  select
    count(*) filter (where stock_status <> 'healthy')::integer as stock_attention_products,
    count(*) filter (where stock_status = 'out_of_stock')::integer as out_of_stock_products,
    coalesce(sum(physical_quantity), 0)::integer as physical_units,
    coalesce(sum(reserved_quantity), 0)::integer as reserved_units,
    coalesce(sum(available_quantity), 0)::integer as available_units
  from public.inventory_control_overview
)
select
  bt.today,
  p.pending_orders_count,
  p.pending_delivery_count,
  p.pending_payment_count,
  p.overdue_payment_count,
  p.overdue_payment_total,
  p.payment_due_today_count,
  p.payment_due_today_total,
  l.open_leads_count,
  l.stale_leads_count,
  s.supplier_orders_open_count,
  s.incoming_units,
  i.stock_attention_products,
  i.out_of_stock_products,
  i.physical_units,
  i.reserved_units,
  i.available_units,
  cds.current_month_sales,
  cds.current_month_revenue,
  cds.current_month_profit,
  cds.previous_month_sales,
  cds.previous_month_revenue,
  cds.previous_month_profit,
  cds.receivable_total,
  cds.stock_cost_value,
  cds.stock_sale_value,
  cds.stock_potential_profit
from brazil_today bt
cross join pending p
cross join leads l
cross join suppliers s
cross join inventory i
cross join public.commercial_dashboard_summary cds;

create or replace view public.dashboard_priority_items
with (security_invoker = true)
as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
)
select
  'delivery'::text as item_type,
  1::integer as priority_rank,
  po.id as entity_id,
  po.customer_id,
  po.primary_product_id as product_id,
  po.customer_name as title,
  coalesce(po.product_summary, 'Pedido sem produto informado') as subtitle,
  po.business_date as reference_date,
  po.total_amount::numeric(12,2) as amount,
  po.total_items::integer as quantity,
  ('/vendas/' || po.id::text)::text as href
from public.pending_orders po
where po.delivery_status = 'to_deliver'

union all

select
  'payment'::text,
  case
    when po.payment_due_at is not null and po.payment_due_at < (select today from brazil_today) then 1
    when po.payment_due_at is not null and po.payment_due_at <= (select today from brazil_today) + 3 then 2
    else 3
  end,
  po.id,
  po.customer_id,
  po.primary_product_id,
  po.customer_name,
  coalesce(po.product_summary, po.payment_condition, 'Pagamento pendente'),
  coalesce(po.payment_due_at, po.business_date),
  po.total_amount::numeric(12,2),
  po.total_items::integer,
  ('/vendas/' || po.id::text)::text
from public.pending_orders po
where po.payment_status = 'receivable'

union all

select
  'lead'::text,
  case
    when lh.lead_date <= (select today from brazil_today) - 30 then 1
    when lh.lead_date <= (select today from brazil_today) - 14 then 2
    else 3
  end,
  lh.id,
  lh.customer_id,
  lh.primary_product_id,
  lh.customer_name,
  coalesce(lh.product_summary, lh.lead_status, 'Lead aguardando retorno'),
  lh.lead_date,
  null::numeric(12,2),
  lh.total_items::integer,
  ('/leads/' || lh.id::text)::text
from public.leads_history lh
where lh.general_status = 'pending'
  and lh.lead_date <= (select today from brazil_today) - 7

union all

select
  'supplier'::text,
  case when sos.waiting_sales_count > 0 then 1 else 2 end,
  sos.id,
  null::uuid,
  null::uuid,
  sos.supplier_name,
  coalesce(sos.product_summary, 'Pedido de fornecedor pendente'),
  sos.ordered_on,
  sos.order_total::numeric(12,2),
  sos.pending_units::integer,
  ('/pedidos-fornecedor/' || sos.id::text)::text
from public.supplier_order_summary sos
where sos.status in ('pending', 'partial')

union all

select
  'stock'::text,
  case
    when ico.stock_status in ('out_of_stock', 'fully_reserved') then 1
    when ico.stock_status in ('below_minimum', 'incoming_only') then 2
    else 3
  end,
  ico.product_id,
  null::uuid,
  ico.product_id,
  ico.product_name,
  case ico.stock_status
    when 'out_of_stock' then 'Sem estoque disponível'
    when 'fully_reserved' then 'Todo o estoque está reservado'
    when 'below_minimum' then 'Abaixo do estoque mínimo'
    when 'incoming_only' then 'Sem saldo físico, mas com pedido a caminho'
    else 'Estoque precisa de atenção'
  end,
  (select today from brazil_today),
  null::numeric(12,2),
  ico.available_quantity::integer,
  ('/estoque/' || ico.product_id::text)::text
from public.inventory_control_overview ico
where ico.stock_status in ('out_of_stock', 'fully_reserved', 'below_minimum', 'incoming_only');

grant select on public.dashboard_operational_summary to authenticated;
grant select on public.dashboard_priority_items to authenticated;
