create or replace function public.public_storefront_top_sellers(p_limit integer default 3)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.units_sold desc, x.name),
    '[]'::jsonb
  )
  from (
    select
      pc.id::text as product_id,
      pc.name,
      coalesce(pc.thumbnail_url, pc.image_url) as image_url,
      pc.sale_price::numeric as price_from,
      pc.total_sold::integer as units_sold,
      pc.available_quantity::integer as available_quantity,
      ppp.slug
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
    order by pc.total_sold desc, pc.name
    limit least(greatest(coalesce(p_limit, 3), 1), 12)
  ) x;
$$;

revoke all on function public.public_storefront_top_sellers(integer) from public;
grant execute on function public.public_storefront_top_sellers(integer) to anon, authenticated;
