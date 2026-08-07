create or replace function public.public_product_banner_v1(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'product_id',p.id,
    'name',coalesce(nullif(pp.public_title,''),p.name),
    'banner_image_url',p.banner_image_url,
    'banner_mobile_image_url',p.banner_mobile_image_url
  )
  into v_result
  from public.public_product_pages pp
  join public.products p on p.id=pp.product_id
  where pp.slug=public.catalog_slugify_v1(p_slug)
    and pp.published
    and p.active
    and not p.restricted
    and coalesce(upper(p.sales_category),'')<>'Z'
  limit 1;

  return v_result;
end;
$function$;

revoke all on function
  public.public_product_banner_v1(text)
from public;

grant execute on function
  public.public_product_banner_v1(text)
to anon, authenticated;
