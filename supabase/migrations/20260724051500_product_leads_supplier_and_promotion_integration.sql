begin;

create or replace view public.product_lead_history_overview as
select
  si.id as sale_item_id,
  si.product_id,
  si.sale_id as lead_id,
  s.customer_id,
  coalesce(c.name,'Cliente não informado') as customer_name,
  c.city as customer_city,
  c.reference as customer_reference,
  coalesce(s.quoted_at,s.created_at) as lead_at,
  si.quantity,
  si.unit_price,
  si.total_price,
  pf.name as flavor_name,
  coalesce(nullif(btrim(s.lead_status),''),'Sem etapa') as lead_status,
  s.general_status::text as general_status,
  s.notes
from public.sale_items si
join public.sales s on s.id=si.sale_id
left join public.customers c on c.id=s.customer_id
left join public.product_flavors pf on pf.id=si.flavor_id
where s.record_type::text='lead';

grant select on public.product_lead_history_overview
to authenticated,service_role;
revoke all on public.product_lead_history_overview from anon;

create or replace view public.product_supplier_order_history_overview as
select
  poi.id as purchase_order_item_id,
  poi.product_id,
  poi.purchase_order_id,
  po.supplier_id,
  coalesce(sp.name,'Fornecedor não informado') as supplier_name,
  po.ordered_on,
  po.expected_on,
  po.status as order_status,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  poi.quantity_ordered,
  poi.quantity_received,
  greatest(poi.quantity_ordered-coalesce(poi.quantity_received,0),0) as quantity_pending,
  poi.unit_cost,
  round(poi.quantity_ordered*poi.unit_cost,2) as total_cost,
  pf.name as flavor_name,
  poi.notes
from public.purchase_order_items poi
join public.purchase_orders po on po.id=poi.purchase_order_id
left join public.suppliers sp on sp.id=po.supplier_id
left join public.locations l on l.id=po.destination_location_id
left join public.product_flavors pf on pf.id=poi.flavor_id;

grant select on public.product_supplier_order_history_overview
to authenticated,service_role;
revoke all on public.product_supplier_order_history_overview from anon;

create or replace view public.central_promotion_items_overview
with (security_invoker=true)
as
select
  i.id,
  i.promotion_id,
  i.operation_scope,
  i.supplement_product_id,
  i.fitness_variant_id,
  i.item_role,
  i.discount_pct,
  i.promotional_price,
  i.quantity_limit,
  i.created_at,
  case
    when i.operation_scope='supplements' then p.name
    else concat_ws(' · ',fp.name,nullif(fv.size,''),nullif(fv.color,''))
  end as item_label,
  case
    when i.operation_scope='supplements' then p.category
    else fp.category
  end as category,
  case
    when i.operation_scope='supplements' then coalesce(p.thumbnail_url,p.image_url)
    else fp.image_url
  end as image_url,
  case
    when i.operation_scope='supplements' then p.sale_price
    else fv.sale_price
  end::numeric(14,2) as current_price,
  case
    when i.operation_scope='supplements' then p.cost_price
    else fv.cost_price
  end::numeric(14,2) as cost_price,
  fv.product_id as fitness_product_id,
  case
    when i.operation_scope='supplements' then coalesce(pc.physical_quantity,0)
    else coalesce(fs.physical_quantity,0)
  end::integer as physical_quantity,
  case
    when i.operation_scope='supplements' then coalesce(pc.reserved_quantity,0)
    else coalesce(fs.reserved_quantity,0)
  end::integer as reserved_quantity,
  case
    when i.operation_scope='supplements' then coalesce(pc.available_quantity,0)
    else coalesce(fs.available_quantity,0)
  end::integer as available_quantity,
  case
    when i.operation_scope='supplements' then coalesce(pc.incoming_quantity,0)
    else coalesce(fs.incoming_quantity,0)
  end::integer as incoming_quantity
from public.central_promotion_items i
left join public.products p on p.id=i.supplement_product_id
left join public.product_catalog_commercial_sort pc on pc.id=i.supplement_product_id
left join public.fitness_variants fv on fv.id=i.fitness_variant_id
left join public.fitness_products fp on fp.id=fv.product_id
left join public.fitness_stock_overview fs on fs.variant_id=i.fitness_variant_id;

grant select on public.central_promotion_items_overview to authenticated;
revoke all on public.central_promotion_items_overview from anon;

create or replace view public.active_operation_promotion_prices
with (security_invoker=true)
as
select
  i.id as promotion_item_id,
  i.promotion_id,
  p.name as promotion_name,
  p.starts_on,
  p.ends_on,
  i.operation_scope,
  i.supplement_product_id,
  i.fitness_variant_id,
  i.fitness_product_id,
  i.item_label,
  i.category,
  i.image_url,
  i.current_price,
  round(
    coalesce(
      i.promotional_price,
      case
        when coalesce(i.discount_pct,0)>0
          then i.current_price*(1-i.discount_pct/100.0)
        else i.current_price
      end
    ),
    2
  )::numeric(14,2) as effective_promotional_price,
  case
    when i.current_price>0 then round(
      100*(i.current_price-coalesce(
        i.promotional_price,
        case
          when coalesce(i.discount_pct,0)>0
            then i.current_price*(1-i.discount_pct/100.0)
          else i.current_price
        end
      ))/i.current_price,
      2
    )
    else 0
  end::numeric(5,2) as effective_discount_pct,
  i.available_quantity,
  i.incoming_quantity,
  i.quantity_limit
from public.central_promotion_items_overview i
join public.central_promotions_overview p on p.id=i.promotion_id
where p.effective_status='active';

grant select on public.active_operation_promotion_prices to authenticated;
revoke all on public.active_operation_promotion_prices from anon;

create or replace function public.active_operation_promotion_snapshot()
returns table(
  promotion_item_id uuid,
  promotion_id uuid,
  promotion_name text,
  starts_on date,
  ends_on date,
  operation_scope text,
  supplement_product_id uuid,
  fitness_variant_id uuid,
  fitness_product_id uuid,
  item_label text,
  category text,
  image_url text,
  current_price numeric,
  effective_promotional_price numeric,
  effective_discount_pct numeric,
  available_quantity integer,
  incoming_quantity integer,
  quantity_limit integer
)
language sql
stable
security definer
set search_path=public
as $function$
  select
    p.promotion_item_id,
    p.promotion_id,
    p.promotion_name,
    p.starts_on,
    p.ends_on,
    p.operation_scope,
    p.supplement_product_id,
    p.fitness_variant_id,
    p.fitness_product_id,
    p.item_label,
    p.category,
    p.image_url,
    p.current_price,
    p.effective_promotional_price,
    p.effective_discount_pct,
    p.available_quantity,
    p.incoming_quantity,
    p.quantity_limit
  from public.active_operation_promotion_prices p
  where auth.uid() is not null;
$function$;

revoke all on function public.active_operation_promotion_snapshot()
from public,anon;

grant execute on function public.active_operation_promotion_snapshot()
to authenticated,service_role;

create or replace function public.public_storefront_snapshot(p_limit integer default 300)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 300), 1), 500);
  v_supplements jsonb;
  v_fitness jsonb;
  v_promotions_supplements jsonb;
  v_promotions_fitness jsonb;
  v_supplement_categories jsonb;
  v_fitness_categories jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
  into v_supplements
  from (
    select
      pc.id::text as id,
      'supplements'::text as operation,
      pc.name,
      pc.category,
      coalesce(pc.thumbnail_url, pc.image_url) as image_url,
      pc.sale_price::numeric as price_from,
      pc.sale_price::numeric as price_to,
      true as available
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id = pc.id
    where pc.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
      and upper(pc.name) not like '%COMBO%'
    order by pc.flagship_rank, pc.availability_rank, pc.category_rank, pc.total_sold desc, pc.name
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
  into v_fitness
  from (
    select
      fp.id::text as id,
      'fitness'::text as operation,
      fp.name,
      fp.category,
      fp.image_url,
      fp.min_sale_price::numeric as price_from,
      fp.max_sale_price::numeric as price_to,
      true as available
    from public.fitness_product_catalog_v2 fp
    where fp.active = true
      and fp.available_quantity > 0
    order by fp.category, fp.name
    limit v_limit
  ) x;

  with promo as (
    select
      i.id::text as id,
      i.promotion_id::text as promotion_id,
      i.supplement_product_id::text as product_id,
      'supplements'::text as operation,
      i.item_label as name,
      i.category,
      i.image_url,
      i.current_price::numeric as current_price,
      coalesce(
        i.promotional_price,
        case when coalesce(i.discount_pct,0) > 0
          then i.current_price * (1 - i.discount_pct / 100.0)
          else i.current_price
        end
      )::numeric as promotional_price,
      coalesce(i.discount_pct,0)::numeric as discount_pct,
      p.name as promotion_name,
      p.effective_status as promotion_status,
      p.starts_on,
      p.ends_on,
      coalesce(i.available_quantity,0)::integer as available_quantity,
      case when coalesce(i.available_quantity,0)>0 then 'available' else 'sold_out' end::text as stock_status
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.product_catalog_commercial_sort pc on pc.id = i.supplement_product_id
    join public.products prod on prod.id = pc.id
    where i.operation_scope = 'supplements'
      and p.effective_status in ('active','scheduled')
      and pc.active = true
      and prod.restricted = false
      and coalesce(upper(prod.sales_category), '') <> 'Z'
  )
  select coalesce(jsonb_agg(to_jsonb(promo) order by promotion_status, starts_on nulls last, name), '[]'::jsonb)
  into v_promotions_supplements
  from promo;

  with promo as (
    select distinct on (i.id)
      i.id::text as id,
      i.promotion_id::text as promotion_id,
      fs.product_id::text as product_id,
      'fitness'::text as operation,
      i.item_label as name,
      i.category,
      i.image_url,
      i.current_price::numeric as current_price,
      coalesce(
        i.promotional_price,
        case when coalesce(i.discount_pct,0) > 0
          then i.current_price * (1 - i.discount_pct / 100.0)
          else i.current_price
        end
      )::numeric as promotional_price,
      coalesce(i.discount_pct,0)::numeric as discount_pct,
      p.name as promotion_name,
      p.effective_status as promotion_status,
      p.starts_on,
      p.ends_on,
      coalesce(fs.available_quantity,0)::integer as available_quantity,
      case when coalesce(fs.available_quantity,0)>0 then 'available' else 'sold_out' end::text as stock_status
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.fitness_stock_overview fs on fs.variant_id = i.fitness_variant_id
    where i.operation_scope = 'fitness'
      and p.effective_status in ('active','scheduled')
      and fs.product_active = true
      and fs.variant_active = true
    order by i.id, fs.product_name
  )
  select coalesce(jsonb_agg(to_jsonb(promo) order by promotion_status, starts_on nulls last, name), '[]'::jsonb)
  into v_promotions_fitness
  from promo;

  select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
  into v_supplement_categories
  from (
    select distinct pc.category
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id = pc.id
    where pc.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
      and pc.category is not null
      and btrim(pc.category) <> ''
  ) c;

  select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
  into v_fitness_categories
  from (
    select distinct fp.category
    from public.fitness_product_catalog_v2 fp
    where fp.active = true
      and fp.available_quantity > 0
      and fp.category is not null
      and btrim(fp.category) <> ''
  ) c;

  return jsonb_build_object(
    'products', jsonb_build_object(
      'supplements', v_supplements,
      'fitness', v_fitness
    ),
    'promotions', jsonb_build_object(
      'supplements', v_promotions_supplements,
      'fitness', v_promotions_fitness
    ),
    'categories', jsonb_build_object(
      'supplements', v_supplement_categories,
      'fitness', v_fitness_categories
    ),
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.public_storefront_snapshot(integer) from public;
grant execute on function public.public_storefront_snapshot(integer) to anon,authenticated,service_role;

commit;
