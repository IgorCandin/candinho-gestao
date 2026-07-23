create or replace view public.fitness_sales_overview as
select
  s.id,
  s.customer_name,
  s.customer_phone,
  s.city,
  s.quoted_on,
  s.general_status,
  s.payment_status,
  s.delivery_status,
  s.payment_method,
  s.payment_due_on,
  s.paid_on,
  s.delivered_on,
  s.total_cost,
  s.total_amount,
  s.total_profit,
  s.notes,
  s.created_at,
  coalesce(string_agg(((((p.name || ' · ') || v.size) || ' · ') || v.color) ||
    case when i.quantity > 1 then ' ×' || i.quantity else '' end,
    ', ' order by p.name, v.size, v.color), '—') as product_summary,
  coalesce(sum(i.quantity), 0)::integer as total_items,
  coalesce(string_agg(distinct r.status, ', '), 'none') as reservation_status,
  s.customer_id,
  case when count(distinct p.id) = 1 then max(p.id::text)::uuid else null end as primary_product_id
from public.fitness_sales s
left join public.fitness_sale_items i on i.sale_id = s.id
left join public.fitness_variants v on v.id = i.variant_id
left join public.fitness_products p on p.id = v.product_id
left join public.fitness_stock_reservations r on r.sale_item_id = i.id
group by s.id;

create or replace view public.fitness_quotes_overview as
select
  q.id,
  q.quote_number,
  q.customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  c.city,
  q.status,
  q.quoted_on,
  q.valid_until,
  q.gross_amount,
  q.discount_amount,
  q.total_amount,
  q.responsible,
  q.notes,
  q.sale_id,
  q.created_at,
  q.updated_at,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity), 0)::integer as total_units,
  string_agg(distinct (((p.name || ' · ') || v.size) || ' · ') || v.color,
    ', ' order by (((p.name || ' · ') || v.size) || ' · ') || v.color) as product_summary,
  case when count(distinct p.id) = 1 then max(p.id::text)::uuid else null end as primary_product_id
from public.fitness_quotes q
join public.fitness_customers c on c.id = q.customer_id
left join public.fitness_quote_items i on i.quote_id = q.id
left join public.fitness_variants v on v.id = i.variant_id
left join public.fitness_products p on p.id = v.product_id
group by q.id, c.id;
