begin;

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
      p.ends_on
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.product_catalog_commercial_sort pc on pc.id = i.supplement_product_id
    join public.products prod on prod.id = pc.id
    where i.operation_scope = 'supplements'
      and p.effective_status in ('active','scheduled')
      and pc.active = true
      and prod.restricted = false
      and coalesce(upper(prod.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
  )
  select coalesce(jsonb_agg(to_jsonb(promo) order by promotion_status, starts_on nulls last, name), '[]'::jsonb)
  into v_promotions_supplements
  from promo;

  with promo as (
    select distinct on (i.id)
      i.id::text as id,
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
      p.ends_on
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.fitness_stock_overview fs on fs.variant_id = i.fitness_variant_id
    where i.operation_scope = 'fitness'
      and p.effective_status in ('active','scheduled')
      and fs.product_active = true
      and fs.variant_active = true
      and fs.available_quantity > 0
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

create index if not exists central_promotion_items_fitness_variant_id_idx
  on public.central_promotion_items(fitness_variant_id)
  where fitness_variant_id is not null;
create index if not exists central_promotion_items_supplement_product_id_idx
  on public.central_promotion_items(supplement_product_id)
  where supplement_product_id is not null;
create index if not exists central_strategic_agenda_items_template_id_idx
  on public.central_strategic_agenda_items(template_id)
  where template_id is not null;
create index if not exists fitness_consignments_sale_id_idx
  on public.fitness_consignments(sale_id)
  where sale_id is not null;
create index if not exists fitness_quotes_sale_id_idx
  on public.fitness_quotes(sale_id)
  where sale_id is not null;
create index if not exists inventory_lot_movements_inventory_movement_id_idx
  on public.inventory_lot_movements(inventory_movement_id)
  where inventory_movement_id is not null;
create index if not exists inventory_lot_movements_source_lot_movement_id_idx
  on public.inventory_lot_movements(source_lot_movement_id)
  where source_lot_movement_id is not null;
create index if not exists inventory_lot_movements_product_id_idx
  on public.inventory_lot_movements(product_id)
  where product_id is not null;
create index if not exists inventory_lot_movements_flavor_id_idx
  on public.inventory_lot_movements(flavor_id)
  where flavor_id is not null;
create index if not exists inventory_lot_movements_location_id_idx
  on public.inventory_lot_movements(location_id)
  where location_id is not null;
create index if not exists inventory_lots_flavor_id_idx
  on public.inventory_lots(flavor_id)
  where flavor_id is not null;
create index if not exists inventory_lots_location_id_idx
  on public.inventory_lots(location_id)
  where location_id is not null;
create index if not exists inventory_lots_supplier_id_idx
  on public.inventory_lots(supplier_id)
  where supplier_id is not null;
create index if not exists return_cases_bank_charge_id_idx
  on public.return_cases(bank_charge_id)
  where bank_charge_id is not null;
create index if not exists return_cases_customer_id_idx
  on public.return_cases(customer_id)
  where customer_id is not null;
create index if not exists return_case_items_sale_item_id_idx
  on public.return_case_items(sale_item_id)
  where sale_item_id is not null;
create index if not exists return_case_items_fitness_sale_item_id_idx
  on public.return_case_items(fitness_sale_item_id)
  where fitness_sale_item_id is not null;
create index if not exists return_case_items_product_id_idx
  on public.return_case_items(product_id)
  where product_id is not null;
create index if not exists return_case_items_flavor_id_idx
  on public.return_case_items(flavor_id)
  where flavor_id is not null;
create index if not exists return_case_items_variant_id_idx
  on public.return_case_items(variant_id)
  where variant_id is not null;
create index if not exists return_case_items_lot_id_idx
  on public.return_case_items(lot_id)
  where lot_id is not null;

commit;
