begin;

-- As páginas foram criadas antes do deploy da interface. Mantemos preço,
-- estoque e objetivo automáticos, mas o texto público só passa a existir
-- depois de revisão explícita na aba Página pública.
update public.public_product_pages
set short_description=null,
    long_description=null
where created_at >= now() - interval '1 day';

create or replace function public.ensure_public_product_page_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_base text;
  v_slug text;
begin
  v_base := public.catalog_slugify_v1(new.name);
  v_slug := v_base;

  if exists(
    select 1 from public.public_product_pages
    where slug=v_slug and product_id<>new.id
  ) then
    v_slug := v_base||'-'||substr(new.id::text,1,6);
  end if;

  insert into public.public_product_pages(
    product_id,slug,public_title,short_description,long_description,published
  )
  values(
    new.id,
    v_slug,
    new.name,
    null,
    null,
    true
  )
  on conflict(product_id) do nothing;

  return new;
end;
$$;

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
      'description',nullif(pp.short_description,''),
      'long_description',nullif(pp.long_description,''),
      'objective',p.objective,
      'ideal_profile',null,
      'information',null,
      'quick_message',null,
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

create or replace function public.public_catalog_advisor_snapshot_v1(
  p_limit integer default 120
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with sales90 as (
    select
      r.product_id,
      coalesce(sum(r.quantity) filter(
        where r.general_status<>'cancelled'
          and r.sold_at>=now()-interval '90 days'
      ),0)::integer sold_90d
    from public.product_recent_sales_overview r
    group by r.product_id
  ),
  ranked as (
    select
      p.id,
      pp.slug,
      p.name,
      p.category,
      p.brand,
      coalesce(p.thumbnail_url,p.image_url) image_url,
      nullif(pp.short_description,'') description,
      p.objective,
      p.ideal_profile,
      pc.sale_price,
      pc.available_quantity,
      pc.incoming_quantity,
      promo.promotional_price,
      promo.promotion_name,
      row_number() over(
        order by
          (pc.available_quantity>0) desc,
          coalesce(s90.sold_90d,0) desc,
          pc.total_sold desc,
          pc.flagship_rank,
          p.name
      )::integer priority_index
    from public.products p
    join public.public_product_pages pp on pp.product_id=p.id
    join public.product_catalog_commercial_sort pc on pc.id=p.id
    left join sales90 s90 on s90.product_id=p.id
    left join lateral (
      select
        cp.name promotion_name,
        coalesce(
          i.promotional_price,
          case
            when coalesce(i.discount_pct,0)>0
              then round(i.current_price*(1-i.discount_pct/100.0),2)
            else i.current_price
          end
        ) promotional_price
      from public.central_promotion_items_overview i
      join public.central_promotions_overview cp on cp.id=i.promotion_id
      where i.operation_scope='supplements'
        and i.supplement_product_id=p.id
        and cp.effective_status='active'
      order by coalesce(i.promotional_price,i.current_price) asc
      limit 1
    ) promo on true
    where p.active
      and pp.published
      and not p.restricted
      and coalesce(upper(p.sales_category),'')<>'Z'
  ),
  rows as (
    select
      r.id,
      r.slug,
      r.name,
      r.category,
      r.brand,
      r.image_url,
      r.description,
      r.objective,
      r.ideal_profile,
      r.sale_price,
      r.available_quantity,
      r.incoming_quantity,
      r.promotional_price,
      r.promotion_name,
      r.priority_index
    from ranked r
    order by r.priority_index
    limit least(greatest(coalesce(p_limit,120),1),160)
  )
  select jsonb_build_object(
    'products',coalesce(jsonb_agg(to_jsonb(rows) order by rows.priority_index),'[]'::jsonb),
    'generated_at',now()
  )
  from rows;
$$;

commit;
