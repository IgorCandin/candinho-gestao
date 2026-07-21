begin;

create or replace view public.fitness_stock_overview as
with reserved as (
  select
    fitness_stock_reservations.variant_id,
    coalesce(sum(fitness_stock_reservations.quantity_reserved),0)::integer as reserved_quantity
  from public.fitness_stock_reservations
  where fitness_stock_reservations.status = any(array['reserved'::text,'partial'::text])
  group by fitness_stock_reservations.variant_id
), incoming as (
  select
    i.variant_id,
    coalesce(sum(i.quantity_ordered-i.quantity_received),0)::integer as incoming_quantity
  from public.fitness_purchase_order_items i
  join public.fitness_purchase_orders o on o.id=i.purchase_order_id
  where o.status = any(array['pending'::text,'partial'::text])
  group by i.variant_id
), consigned as (
  select
    i.variant_id,
    coalesce(sum(i.quantity_sent-i.quantity_returned-i.quantity_sold),0)::integer as consigned_quantity
  from public.fitness_consignment_items i
  join public.fitness_consignments c on c.id=i.consignment_id
  where c.status = any(array['open'::text,'partial'::text])
  group by i.variant_id
)
select
  v.id as variant_id,
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(nullif(btrim(v.image_url),''),p.image_url) as image_url,
  p.active as product_active,
  v.size,
  v.color,
  v.sku,
  v.cost_price,
  v.sale_price,
  v.active as variant_active,
  coalesce(b.quantity,0) as physical_quantity,
  coalesce(r.reserved_quantity,0) as reserved_quantity,
  greatest(
    coalesce(b.quantity,0)
    - coalesce(r.reserved_quantity,0)
    - coalesce(c.consigned_quantity,0),
    0
  ) as available_quantity,
  coalesce(inc.incoming_quantity,0) as incoming_quantity,
  (coalesce(b.quantity,0)::numeric*v.cost_price)::numeric(12,2) as stock_cost_value,
  (coalesce(b.quantity,0)::numeric*v.sale_price)::numeric(12,2) as stock_sale_value,
  case
    when coalesce(b.quantity,0)=0 and coalesce(inc.incoming_quantity,0)>0 then 'incoming'::text
    when coalesce(b.quantity,0)=0 then 'out_of_stock'::text
    when greatest(
      coalesce(b.quantity,0)
      - coalesce(r.reserved_quantity,0)
      - coalesce(c.consigned_quantity,0),
      0
    )=0 and coalesce(c.consigned_quantity,0)>0 then 'consigned'::text
    when greatest(
      coalesce(b.quantity,0)
      - coalesce(r.reserved_quantity,0)
      - coalesce(c.consigned_quantity,0),
      0
    )=0 then 'reserved'::text
    else 'available'::text
  end as stock_status,
  coalesce(c.consigned_quantity,0) as consigned_quantity
from public.fitness_variants v
join public.fitness_products p on p.id=v.product_id
left join public.fitness_stock_balances b on b.variant_id=v.id
left join reserved r on r.variant_id=v.id
left join incoming inc on inc.variant_id=v.id
left join consigned c on c.variant_id=v.id
order by
  case
    when greatest(
      coalesce(b.quantity,0)
      - coalesce(r.reserved_quantity,0)
      - coalesce(c.consigned_quantity,0),
      0
    )>0 then 0
    when coalesce(inc.incoming_quantity,0)>0 then 1
    else 2
  end,
  p.category nulls last,
  p.name,
  v.size nulls last,
  v.color nulls last;

create or replace view public.fitness_stock_operational as
select
  s.variant_id,
  s.product_id,
  s.product_name,
  s.category,
  s.image_url,
  s.product_active,
  s.size,
  s.color,
  s.sku,
  s.cost_price,
  s.sale_price,
  s.variant_active,
  s.physical_quantity,
  s.reserved_quantity,
  s.available_quantity,
  s.incoming_quantity,
  s.stock_cost_value,
  s.stock_sale_value,
  s.stock_status,
  v.minimum_stock,
  v.reorder_target,
  v.default_supplier_id,
  fs.name as default_supplier_name,
  greatest(v.minimum_stock-s.available_quantity,0) as quantity_below_minimum,
  greatest(
    greatest(v.reorder_target,v.minimum_stock)
    - s.available_quantity
    - s.incoming_quantity,
    0
  ) as suggested_reorder_quantity,
  case
    when not s.product_active or not s.variant_active then 'inactive'::text
    when s.available_quantity<=0 and s.incoming_quantity>0 then 'incoming'::text
    when s.available_quantity<=0 then 'out_of_stock'::text
    when s.available_quantity<=v.minimum_stock then 'low_stock'::text
    else 'available'::text
  end as operational_status,
  s.consigned_quantity
from public.fitness_stock_overview s
join public.fitness_variants v on v.id=s.variant_id
left join public.fitness_suppliers fs on fs.id=v.default_supplier_id
order by
  case
    when s.available_quantity>0 then 0
    when s.incoming_quantity>0 then 1
    else 2
  end,
  s.category nulls last,
  s.product_name,
  s.size nulls last,
  s.color nulls last;

create or replace view public.fitness_product_catalog as
select
  p.id,
  p.name,
  p.category,
  p.description,
  p.image_url,
  p.active,
  count(v.id)::integer as variant_count,
  coalesce(sum(s.physical_quantity),0)::integer as physical_quantity,
  coalesce(sum(s.reserved_quantity),0)::integer as reserved_quantity,
  coalesce(sum(s.available_quantity),0)::integer as available_quantity,
  coalesce(sum(s.incoming_quantity),0)::integer as incoming_quantity,
  min(v.sale_price)::numeric(12,2) as min_sale_price,
  max(v.sale_price)::numeric(12,2) as max_sale_price,
  p.updated_at
from public.fitness_products p
left join public.fitness_variants v on v.product_id=p.id
left join public.fitness_stock_overview s on s.variant_id=v.id
group by p.id
order by
  case
    when coalesce(sum(s.available_quantity),0)>0 then 0
    when coalesce(sum(s.incoming_quantity),0)>0 then 1
    else 2
  end,
  p.category nulls last,
  p.name;

create or replace view public.fitness_product_catalog_v2 as
select
  p.id,
  p.name,
  p.category,
  p.description,
  p.image_url,
  p.active,
  count(v.id)::integer as variant_count,
  coalesce(sum(s.physical_quantity),0)::integer as physical_quantity,
  coalesce(sum(s.reserved_quantity),0)::integer as reserved_quantity,
  coalesce(sum(s.available_quantity),0)::integer as available_quantity,
  coalesce(sum(s.incoming_quantity),0)::integer as incoming_quantity,
  min(v.sale_price)::numeric(12,2) as min_sale_price,
  max(v.sale_price)::numeric(12,2) as max_sale_price,
  count(*) filter(
    where s.operational_status = any(array['out_of_stock'::text,'low_stock'::text])
  )::integer as attention_variants,
  p.updated_at,
  coalesce(sum(s.consigned_quantity),0)::integer as consigned_quantity
from public.fitness_products p
left join public.fitness_variants v on v.product_id=p.id
left join public.fitness_stock_operational s on s.variant_id=v.id
group by p.id
order by
  case
    when coalesce(sum(s.available_quantity),0)>0 then 0
    when coalesce(sum(s.incoming_quantity),0)>0 then 1
    else 2
  end,
  p.category nulls last,
  p.name;

commit;
