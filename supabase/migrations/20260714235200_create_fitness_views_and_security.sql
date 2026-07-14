-- Views ---------------------------------------------------------------------
create or replace view public.fitness_stock_overview
with (security_invoker=true)
as
with reserved as (
  select variant_id,coalesce(sum(quantity_reserved),0)::integer reserved_quantity
  from public.fitness_stock_reservations where status in ('reserved','partial') group by variant_id
), incoming as (
  select i.variant_id,coalesce(sum(greatest(i.quantity_ordered-i.quantity_received,0)),0)::integer incoming_quantity
  from public.fitness_purchase_order_items i join public.fitness_purchase_orders o on o.id=i.purchase_order_id
  where o.status in ('pending','partial') group by i.variant_id
)
select
  v.id variant_id,p.id product_id,p.name product_name,p.category,p.image_url,p.active product_active,
  v.size,v.color,v.sku,v.cost_price,v.sale_price,v.active variant_active,
  coalesce(sb.quantity,0)::integer physical_quantity,
  coalesce(r.reserved_quantity,0)::integer reserved_quantity,
  greatest(coalesce(sb.quantity,0)-coalesce(r.reserved_quantity,0),0)::integer available_quantity,
  coalesce(i.incoming_quantity,0)::integer incoming_quantity,
  (coalesce(sb.quantity,0)*v.cost_price)::numeric(12,2) stock_cost_value,
  (coalesce(sb.quantity,0)*v.sale_price)::numeric(12,2) stock_sale_value,
  case when not p.active or not v.active then 'inactive' when coalesce(sb.quantity,0)=0 and coalesce(i.incoming_quantity,0)>0 then 'incoming' when coalesce(sb.quantity,0)=0 then 'out_of_stock' when greatest(coalesce(sb.quantity,0)-coalesce(r.reserved_quantity,0),0)=0 then 'reserved' else 'available' end stock_status
from public.fitness_variants v
join public.fitness_products p on p.id=v.product_id
left join public.fitness_stock_balances sb on sb.variant_id=v.id
left join reserved r on r.variant_id=v.id
left join incoming i on i.variant_id=v.id;

create or replace view public.fitness_product_catalog
with (security_invoker=true)
as
select p.id,p.name,p.category,p.description,p.image_url,p.active,
  count(v.id)::integer variant_count,
  coalesce(sum(s.physical_quantity),0)::integer physical_quantity,
  coalesce(sum(s.reserved_quantity),0)::integer reserved_quantity,
  coalesce(sum(s.available_quantity),0)::integer available_quantity,
  coalesce(sum(s.incoming_quantity),0)::integer incoming_quantity,
  min(v.sale_price)::numeric(12,2) min_sale_price,
  max(v.sale_price)::numeric(12,2) max_sale_price,
  p.updated_at
from public.fitness_products p
left join public.fitness_variants v on v.product_id=p.id
left join public.fitness_stock_overview s on s.variant_id=v.id
group by p.id;

create or replace view public.fitness_sales_overview
with (security_invoker=true)
as
select s.id,s.customer_name,s.customer_phone,s.city,s.quoted_on,s.general_status,s.payment_status,s.delivery_status,s.payment_method,s.payment_due_on,s.paid_on,s.delivered_on,s.total_cost,s.total_amount,s.total_profit,s.notes,s.created_at,
  coalesce(string_agg(p.name||' · '||v.size||' · '||v.color||case when i.quantity>1 then ' ×'||i.quantity else '' end,', ' order by p.name,v.size,v.color),'—') product_summary,
  coalesce(sum(i.quantity),0)::integer total_items,
  coalesce(string_agg(distinct r.status,', '),'none') reservation_status
from public.fitness_sales s
left join public.fitness_sale_items i on i.sale_id=s.id
left join public.fitness_variants v on v.id=i.variant_id
left join public.fitness_products p on p.id=v.product_id
left join public.fitness_stock_reservations r on r.sale_item_id=i.id
group by s.id;

create or replace view public.fitness_purchase_order_summary
with (security_invoker=true)
as
select o.id,o.supplier_id,s.name supplier_name,o.ordered_on,o.status,o.notes,o.created_at,o.updated_at,
  count(i.id)::integer item_count,
  coalesce(sum(i.quantity_ordered),0)::integer ordered_units,
  coalesce(sum(i.quantity_received),0)::integer received_units,
  coalesce(sum(i.quantity_ordered-i.quantity_received),0)::integer pending_units,
  coalesce(sum(i.quantity_ordered*i.unit_cost),0)::numeric(12,2) order_total,
  coalesce(string_agg(p.name||' · '||v.size||' · '||v.color||' ×'||i.quantity_ordered,', ' order by p.name),'—') product_summary
from public.fitness_purchase_orders o
join public.fitness_suppliers s on s.id=o.supplier_id
left join public.fitness_purchase_order_items i on i.purchase_order_id=o.id
left join public.fitness_variants v on v.id=i.variant_id
left join public.fitness_products p on p.id=v.product_id
group by o.id,s.name;

create or replace view public.fitness_purchase_order_items_overview
with (security_invoker=true)
as
select i.id,i.purchase_order_id,i.variant_id,p.id product_id,p.name product_name,p.image_url,v.size,v.color,v.sku,i.quantity_ordered,i.quantity_received,(i.quantity_ordered-i.quantity_received)::integer quantity_pending,i.unit_cost,(i.quantity_ordered*i.unit_cost)::numeric(12,2) total_cost,i.notes,
  case when i.quantity_received>=i.quantity_ordered then 'received' when i.quantity_received>0 then 'partial' else 'pending' end item_status
from public.fitness_purchase_order_items i join public.fitness_variants v on v.id=i.variant_id join public.fitness_products p on p.id=v.product_id;

create or replace view public.fitness_dashboard_summary
with (security_invoker=true)
as
with sales as (
  select
    count(*) filter(where general_status<>'cancelled' and delivered_on>=date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date)::integer month_sales,
    coalesce(sum(total_amount) filter(where general_status<>'cancelled' and delivered_on>=date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date),0)::numeric(12,2) month_revenue,
    coalesce(sum(total_profit) filter(where general_status<>'cancelled' and delivered_on>=date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date),0)::numeric(12,2) month_profit,
    count(*) filter(where general_status<>'cancelled' and delivery_status='to_deliver')::integer pending_delivery,
    count(*) filter(where general_status<>'cancelled' and payment_status='receivable')::integer pending_payment,
    coalesce(sum(total_amount) filter(where general_status<>'cancelled' and payment_status='receivable'),0)::numeric(12,2) receivable_total
  from public.fitness_sales
), stock as (
  select count(*) filter(where physical_quantity>0)::integer variants_with_stock,
    coalesce(sum(physical_quantity),0)::integer physical_units,
    coalesce(sum(reserved_quantity),0)::integer reserved_units,
    coalesce(sum(available_quantity),0)::integer available_units,
    coalesce(sum(incoming_quantity),0)::integer incoming_units,
    coalesce(sum(stock_cost_value),0)::numeric(12,2) stock_cost_value,
    coalesce(sum(stock_sale_value),0)::numeric(12,2) stock_sale_value,
    count(*) filter(where stock_status in ('out_of_stock','reserved'))::integer attention_variants
  from public.fitness_stock_overview where product_active and variant_active
), orders as (
  select count(*) filter(where status in ('pending','partial'))::integer open_orders from public.fitness_purchase_orders
)
select * from sales cross join stock cross join orders;

-- Produtos iniciais conhecidos da Candinho Fitness --------------------------
insert into public.fitness_products(name,category,description,active)
select x.name,x.category,x.description,true
from (values
  ('Top Run','Top','Peça avulsa da linha Run.'),
  ('Short Run','Short','Peça avulsa da linha Run.'),
  ('Calça Run','Calça','Peça avulsa da linha Run.'),
  ('Macacão Longo','Macacão','Macacão fitness longo.'),
  ('Macacão Duo 2 em 1','Macacão','Modelo Duo 2 em 1.'),
  ('Legging','Calça','Legging fitness.'),
  ('Blusa Dry Fit','Blusa','Blusa esportiva Dry Fit.')
) as x(name,category,description)
where not exists(select 1 from public.fitness_products p where lower(p.name)=lower(x.name));

with product_prices(name,price) as (
  values ('Top Run',39.90::numeric),('Short Run',39.90),('Calça Run',49.90),('Macacão Longo',89.90),('Macacão Duo 2 em 1',89.90),('Legging',49.90),('Blusa Dry Fit',39.90)
), sizes(size) as (values('P'),('M'),('G'),('GG')),
colors(color) as (values('Preto'),('Marrom'),('Vinho'),('Azul marinho'),('Branco'))
insert into public.fitness_variants(product_id,size,color,cost_price,sale_price,active)
select p.id,s.size,c.color,0,pp.price,true
from product_prices pp join public.fitness_products p on lower(p.name)=lower(pp.name) cross join sizes s cross join colors c
where not exists(select 1 from public.fitness_variants v where v.product_id=p.id and lower(v.size)=lower(s.size) and lower(v.color)=lower(c.color));

insert into public.fitness_stock_balances(variant_id,quantity)
select id,0 from public.fitness_variants on conflict(variant_id) do nothing;

-- Segurança -----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'fitness_products','fitness_variants','fitness_stock_balances','fitness_sales','fitness_sale_items','fitness_stock_reservations','fitness_inventory_movements','fitness_suppliers','fitness_purchase_orders','fitness_purchase_order_items','fitness_purchase_receipts'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_read',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_access_operation(''fitness''))',t||'_read',t);
    execute format('drop policy if exists %I on public.%I',t||'_write',t);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_write_fitness()) with check (public.can_write_fitness())',t||'_write',t);
  end loop;
end $$;

revoke all on function public.can_write_fitness() from public,anon;
revoke all on function public.get_my_access() from public,anon;
revoke all on function public.save_fitness_product(uuid,text,text,text,text,boolean,jsonb) from public,anon;
revoke all on function public.adjust_fitness_stock(uuid,integer,text) from public,anon;
revoke all on function public.create_fitness_sale(text,text,text,date,jsonb,text,date,text,date,boolean,date,text) from public,anon;
revoke all on function public.mark_fitness_sale_paid(uuid,date,text) from public,anon;
revoke all on function public.mark_fitness_sale_delivered(uuid,date) from public,anon;
revoke all on function public.create_fitness_purchase_order(text,date,jsonb,text) from public,anon;
revoke all on function public.receive_fitness_purchase_item(uuid,integer,date,text) from public,anon;
revoke all on function public.convert_fitness_stock(uuid,integer,jsonb,text) from public,anon;

grant execute on function public.can_write_fitness() to authenticated,service_role;
grant execute on function public.get_my_access() to authenticated,service_role;
grant execute on function public.save_fitness_product(uuid,text,text,text,text,boolean,jsonb) to authenticated,service_role;
grant execute on function public.adjust_fitness_stock(uuid,integer,text) to authenticated,service_role;
grant execute on function public.create_fitness_sale(text,text,text,date,jsonb,text,date,text,date,boolean,date,text) to authenticated,service_role;
grant execute on function public.mark_fitness_sale_paid(uuid,date,text) to authenticated,service_role;
grant execute on function public.mark_fitness_sale_delivered(uuid,date) to authenticated,service_role;
grant execute on function public.create_fitness_purchase_order(text,date,jsonb,text) to authenticated,service_role;
grant execute on function public.receive_fitness_purchase_item(uuid,integer,date,text) to authenticated,service_role;
grant execute on function public.convert_fitness_stock(uuid,integer,jsonb,text) to authenticated,service_role;

grant select on public.fitness_product_catalog,public.fitness_stock_overview,public.fitness_sales_overview,public.fitness_purchase_order_summary,public.fitness_purchase_order_items_overview,public.fitness_dashboard_summary to authenticated,service_role;
