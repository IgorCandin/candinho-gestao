begin;

create or replace function public.public_storefront_product_page_v1(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_product jsonb;
  v_promotion jsonb;
  v_flavors jsonb;
  v_recommendations jsonb;
  v_product_id uuid;
  v_category text;
begin
  select
    p.id,
    p.category,
    jsonb_build_object(
      'id',p.id,
      'slug',pp.slug,
      'name',coalesce(nullif(pp.public_title,''),p.name),
      'catalog_name',p.name,
      'category',p.category,
      'brand',p.brand,
      'image_url',coalesce(p.thumbnail_url,p.image_url),
      'image_full_url',p.image_url,
      'secondary_image_url',p.secondary_image_url,
      'sale_price',pc.sale_price,
      'installment_price',p.installment_price,
      'available_quantity',coalesce(pc.available_quantity,0),
      'incoming_quantity',coalesce(pc.incoming_quantity,0),
      'available',coalesce(pc.available_quantity,0)>0,
      'description',coalesce(nullif(pp.short_description,''),nullif(p.description,''),nullif(p.quick_message,'')),
      'long_description',coalesce(nullif(pp.long_description,''),nullif(p.information,''),nullif(p.description,'')),
      'objective',p.objective,
      'ideal_profile',p.ideal_profile,
      'information',p.information,
      'quick_message',p.quick_message,
      'highlights',coalesce(pp.highlights,'[]'::jsonb),
      'usage_text',pp.usage_text,
      'warnings_text',pp.warnings_text,
      'faq',coalesce(pp.faq,'[]'::jsonb),
      'meta_title',pp.meta_title,
      'meta_description',pp.meta_description,
      'whatsapp_message_template',pp.whatsapp_message_template
    )
  into v_product_id,v_category,v_product
  from public.public_product_pages pp
  join public.products p on p.id=pp.product_id
  left join public.product_catalog_commercial_sort pc on pc.id=p.id
  where pp.slug=public.catalog_slugify_v1(p_slug)
    and pp.published
    and p.active
    and not p.restricted
    and coalesce(upper(p.sales_category),'')<>'Z'
  limit 1;

  if v_product_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'promotion_name',cp.name,
    'current_price',i.current_price,
    'promotional_price',
      coalesce(
        i.promotional_price,
        case
          when coalesce(i.discount_pct,0)>0
            then round(i.current_price*(1-i.discount_pct/100.0),2)
          else i.current_price
        end
      ),
    'discount_pct',coalesce(i.discount_pct,0),
    'ends_on',cp.ends_on
  )
  into v_promotion
  from public.central_promotion_items_overview i
  join public.central_promotions_overview cp on cp.id=i.promotion_id
  where i.operation_scope='supplements'
    and i.supplement_product_id=v_product_id
    and cp.effective_status='active'
  order by
    coalesce(
      i.promotional_price,
      case
        when coalesce(i.discount_pct,0)>0
          then i.current_price*(1-i.discount_pct/100.0)
        else i.current_price
      end
    ) asc
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',f.flavor_id,
        'name',f.flavor_name,
        'available_quantity',coalesce(f.available_quantity,0),
        'incoming_quantity',coalesce(f.incoming_quantity,0),
        'available',coalesce(f.available_quantity,0)>0
      )
      order by f.display_order,f.flavor_name
    ),
    '[]'::jsonb
  )
  into v_flavors
  from public.product_flavor_inventory_overview f
  where f.product_id=v_product_id
    and f.active
    and (
      coalesce(f.available_quantity,0)>0
      or coalesce(f.incoming_quantity,0)>0
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',x.id,
        'slug',x.slug,
        'name',x.name,
        'category',x.category,
        'brand',x.brand,
        'image_url',x.image_url,
        'sale_price',x.sale_price,
        'available_quantity',x.available_quantity,
        'same_category',x.same_category
      )
      order by x.same_category desc,x.total_sold desc,x.name
    ),
    '[]'::jsonb
  )
  into v_recommendations
  from (
    select
      p2.id,
      pp2.slug,
      p2.name,
      p2.category,
      p2.brand,
      coalesce(p2.thumbnail_url,p2.image_url) image_url,
      pc2.sale_price,
      pc2.available_quantity,
      pc2.total_sold,
      (p2.category is not distinct from v_category) same_category
    from public.products p2
    join public.public_product_pages pp2 on pp2.product_id=p2.id
    join public.product_catalog_commercial_sort pc2 on pc2.id=p2.id
    where p2.id<>v_product_id
      and p2.active
      and pp2.published
      and not p2.restricted
      and coalesce(upper(p2.sales_category),'')<>'Z'
      and pc2.available_quantity>0
    order by
      (p2.category is not distinct from v_category) desc,
      pc2.total_sold desc,
      pc2.flagship_rank,
      p2.name
    limit 4
  ) x;

  return jsonb_build_object(
    'product',v_product,
    'promotion',v_promotion,
    'flavors',coalesce(v_flavors,'[]'::jsonb),
    'recommendations',coalesce(v_recommendations,'[]'::jsonb),
    'generated_at',now()
  );
end;
$$;

commit;
