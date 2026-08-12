create or replace function public.public_storefront_top_sellers(p_limit integer default 3)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with supplement_rank as (
    select
      'supplements'::text as operation,
      pc.id::text as product_id,
      pc.name,
      coalesce(pc.thumbnail_url, pc.image_url) as image_url,
      pc.sale_price::numeric as price_from,
      pc.total_sold::integer as units_sold,
      pc.available_quantity::integer as available_quantity,
      ('/catalogo/' || ppp.slug)::text as href
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id = pc.id
    join public.public_product_pages ppp
      on ppp.product_id = pc.id
      and ppp.published = true
    where pc.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
      and pc.total_sold > 0
      and upper(pc.name) not like '%COMBO%'
  ),
  fitness_sold as (
    select
      fv.product_id,
      sum(fsi.quantity)::integer as units_sold
    from public.fitness_sale_items fsi
    join public.fitness_sales fs on fs.id = fsi.sale_id
    join public.fitness_variants fv on fv.id = fsi.variant_id
    where coalesce(lower(fs.general_status), '') <> 'cancelled'
    group by fv.product_id
  ),
  fitness_rank as (
    select
      'fitness'::text as operation,
      fp.id::text as product_id,
      fp.name,
      fp.image_url,
      fp.min_sale_price::numeric as price_from,
      fs.units_sold,
      fp.available_quantity::integer as available_quantity,
      '/catalogo/fitness'::text as href
    from public.fitness_product_catalog_v2 fp
    join fitness_sold fs on fs.product_id = fp.id
    where fp.active = true
      and fp.available_quantity > 0
      and fs.units_sold > 0
  ),
  ranked as (
    select * from supplement_rank
    union all
    select * from fitness_rank
  )
  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.units_sold desc, x.name),
    '[]'::jsonb
  )
  from (
    select *
    from ranked
    order by units_sold desc, name
    limit least(greatest(coalesce(p_limit, 3), 1), 12)
  ) x;
$$;

revoke all on function public.public_storefront_top_sellers(integer) from public;
grant execute on function public.public_storefront_top_sellers(integer) to anon, authenticated;
