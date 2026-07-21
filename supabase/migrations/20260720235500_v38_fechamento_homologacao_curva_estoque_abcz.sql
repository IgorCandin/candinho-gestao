begin;

-- Candinho Company · V38 · Fechamento de homologação
-- Regra comercial oficial:
-- A = top de vendas, monitorar mínimo e ruptura
-- B = manter estoque, alertar somente quando zerar
-- C = sob encomenda, não alertar por estoque zero
-- Z = alternativo/descontinuado/restrito, não alertar por estoque zero
-- Migration já aplicada no Supabase de produção.

update public.products
set sales_category='Z', updated_at=now()
where lower(name)=lower('Foguete Não Tem Ré')
  and coalesce(sales_category,'') <> 'Z';

create or replace view public.inventory_control_overview
with (security_invoker = true)
as
with physical as (
  select sb.product_id, coalesce(sum(sb.quantity),0)::integer as physical_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory
  group by sb.product_id
), reserved as (
  select sr.product_id, coalesce(sum(sr.quantity_reserved),0)::integer as reserved_quantity
  from public.stock_reservations sr
  where sr.status = any(array['reserved'::text,'partial'::text])
  group by sr.product_id
), incoming as (
  select poi.product_id,
    coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),0)::integer as incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id=poi.purchase_order_id
  where po.status = any(array['pending'::text,'partial'::text])
    and poi.quantity_received < poi.quantity_ordered
  group by poi.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.brand,
  p.image_url,
  p.min_stock,
  coalesce(nullif(p.ideal_stock,0),p.min_stock) as ideal_stock,
  p.cost_price,
  p.sale_price,
  coalesce(ph.physical_quantity,0) as physical_quantity,
  coalesce(r.reserved_quantity,0) as reserved_quantity,
  greatest(coalesce(ph.physical_quantity,0)-coalesce(r.reserved_quantity,0),0) as available_quantity,
  coalesce(i.incoming_quantity,0) as incoming_quantity,
  (coalesce(ph.physical_quantity,0)::numeric*p.cost_price)::numeric(12,2) as stock_cost_value,
  (coalesce(ph.physical_quantity,0)::numeric*p.sale_price)::numeric(12,2) as stock_sale_value,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z') then 'healthy'::text
    when upper(coalesce(p.sales_category,''))='B' then
      case
        when coalesce(ph.physical_quantity,0)=0 and coalesce(i.incoming_quantity,0)>0 then 'incoming_only'::text
        when coalesce(ph.physical_quantity,0)=0 then 'out_of_stock'::text
        when greatest(coalesce(ph.physical_quantity,0)-coalesce(r.reserved_quantity,0),0)=0 and coalesce(r.reserved_quantity,0)>0 then 'fully_reserved'::text
        else 'healthy'::text
      end
    else
      case
        when coalesce(ph.physical_quantity,0)=0 and coalesce(i.incoming_quantity,0)>0 then 'incoming_only'::text
        when coalesce(ph.physical_quantity,0)=0 then 'out_of_stock'::text
        when greatest(coalesce(ph.physical_quantity,0)-coalesce(r.reserved_quantity,0),0)=0 and coalesce(r.reserved_quantity,0)>0 then 'fully_reserved'::text
        when p.min_stock>0 and greatest(coalesce(ph.physical_quantity,0)-coalesce(r.reserved_quantity,0),0)<=p.min_stock then 'below_minimum'::text
        else 'healthy'::text
      end
  end as stock_status
from public.products p
left join physical ph on ph.product_id=p.id
left join reserved r on r.product_id=p.id
left join incoming i on i.product_id=p.id
where p.active;

create or replace view public.replenishment_overview
with (security_invoker = true)
as
with company_stock as (
  select sb.product_id, coalesce(sum(sb.quantity),0)::integer as company_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(cs.company_quantity,0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z') then false
    when upper(coalesce(p.sales_category,''))='B' then coalesce(cs.company_quantity,0)<=0
    when upper(coalesce(p.sales_category,''))='A' then coalesce(cs.company_quantity,0)<=greatest(coalesce(p.min_stock,0),0)
    else p.min_stock>0 and coalesce(cs.company_quantity,0)<=p.min_stock
  end as needs_replenishment,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z') then 0
    when upper(coalesce(p.sales_category,''))='B' and coalesce(cs.company_quantity,0)<=0
      then greatest(greatest(coalesce(nullif(p.ideal_stock,0),1),1)-coalesce(cs.company_quantity,0),0)
    when upper(coalesce(p.sales_category,''))='A' and coalesce(cs.company_quantity,0)<=greatest(coalesce(p.min_stock,0),0)
      then greatest(greatest(coalesce(nullif(p.ideal_stock,0),nullif(p.min_stock,0),1),1)-coalesce(cs.company_quantity,0),0)
    when p.min_stock>0 and coalesce(cs.company_quantity,0)<=p.min_stock
      then greatest(coalesce(nullif(p.ideal_stock,0),p.min_stock)-coalesce(cs.company_quantity,0),0)
    else 0
  end as suggested_order_quantity,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z') then 'healthy'::text
    when upper(coalesce(p.sales_category,''))='B' then
      case when coalesce(cs.company_quantity,0)<=0 then 'out_of_stock'::text else 'healthy'::text end
    when upper(coalesce(p.sales_category,''))='A' then
      case
        when coalesce(cs.company_quantity,0)<=0 then 'out_of_stock'::text
        when coalesce(cs.company_quantity,0)<=greatest(coalesce(p.min_stock,0),0) then 'below_minimum'::text
        else 'healthy'::text
      end
    else
      case
        when coalesce(cs.company_quantity,0)=0 and p.min_stock>0 then 'out_of_stock'::text
        when coalesce(cs.company_quantity,0)<=p.min_stock and p.min_stock>0 then 'below_minimum'::text
        else 'healthy'::text
      end
  end as stock_status
from public.products p
left join company_stock cs on cs.product_id=p.id
where p.active;

commit;
