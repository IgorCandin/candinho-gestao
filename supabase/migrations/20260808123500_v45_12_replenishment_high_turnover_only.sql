begin;

-- Ajuste final do modo caixa atual:
-- somente alto giro zerado entra como reposição automática.
create or replace view public.replenishment_overview as
with company_stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity), 0)::integer as company_quantity
  from public.stock_balances sb
  join public.locations l on l.id = sb.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sb.product_id
), classified as (
  select
    p.*,
    upper(coalesce(psi.suggested_category, p.sales_category, 'C')) as effective_sales_category
  from public.products p
  left join public.product_sales_category_intelligence psi
    on psi.product_id = p.id
  where p.active
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(cs.company_quantity, 0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  case
    when p.effective_sales_category = 'A'
      then coalesce(cs.company_quantity, 0) <= 0
    else false
  end as needs_replenishment,
  case
    when p.effective_sales_category = 'A'
      and coalesce(cs.company_quantity, 0) <= 0
      then greatest(1 - coalesce(cs.company_quantity, 0), 0)
    else 0
  end as suggested_order_quantity,
  case
    when p.effective_sales_category in ('C', 'Z') then 'healthy'::text
    when p.effective_sales_category = 'B' then
      case
        when coalesce(cs.company_quantity, 0) <= 0 then 'out_of_stock'::text
        else 'healthy'::text
      end
    when p.effective_sales_category = 'A' then
      case
        when coalesce(cs.company_quantity, 0) <= 0 then 'out_of_stock'::text
        when coalesce(cs.company_quantity, 0) <= 1 then 'below_minimum'::text
        else 'healthy'::text
      end
    else 'healthy'::text
  end as stock_status
from classified p
left join company_stock cs on cs.product_id = p.id;

commit;
