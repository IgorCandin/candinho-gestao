begin;

-- =========================================================
-- NEXUS FITNESS + VITRINE INTELIGENTE V2
-- - páginas públicas individuais de suplementos
-- - Nexus público com catálogo seguro
-- - interesses vindos do catálogo
-- - inteligência Fitness baseada em estoque + giro
-- - busca interna de produtos por nome/marca/categoria
-- =========================================================

create or replace function public.catalog_slugify_v1(p_value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from lower(
        regexp_replace(
          translate(
            coalesce(p_value,''),
            'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          ),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        )
      )),
      ''
    ),
    'produto'
  );
$$;

create table if not exists public.public_product_pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  slug text not null unique,
  public_title text,
  short_description text,
  long_description text,
  highlights jsonb not null default '[]'::jsonb,
  usage_text text,
  warnings_text text,
  faq jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  whatsapp_message_template text,
  published boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_product_pages_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint public_product_pages_highlights_array check (jsonb_typeof(highlights)='array'),
  constraint public_product_pages_faq_array check (jsonb_typeof(faq)='array')
);

create index if not exists public_product_pages_published_idx
  on public.public_product_pages(published,slug);

with source as (
  select
    p.id,
    p.name,
    public.catalog_slugify_v1(p.name) base_slug,
    row_number() over(
      partition by public.catalog_slugify_v1(p.name)
      order by p.created_at,p.id
    ) rn
  from public.products p
)
insert into public.public_product_pages(
  product_id,slug,public_title,short_description,long_description,published
)
select
  p.id,
  case
    when s.rn=1
      then s.base_slug
    else s.base_slug||'-'||substr(p.id::text,1,6)
  end,
  p.name,
  null,
  null,
  true
from public.products p
join source s on s.id=p.id
on conflict(product_id) do nothing;

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

drop trigger if exists trg_products_public_page_v1 on public.products;
create trigger trg_products_public_page_v1
after insert on public.products
for each row execute function public.ensure_public_product_page_v1();

create or replace function public.catalog_touch_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at:=now();
  return new;
end;
$$;

drop trigger if exists trg_public_product_pages_updated_at on public.public_product_pages;
create trigger trg_public_product_pages_updated_at
before update on public.public_product_pages
for each row execute function public.catalog_touch_updated_at_v1();

create table if not exists public.catalog_public_events (
  id bigint generated always as identity primary key,
  session_id text,
  product_id uuid references public.products(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint catalog_public_events_type_check
    check(event_type in (
      'product_view',
      'buy_intent',
      'whatsapp_click',
      'nexus_open',
      'nexus_question',
      'human_handoff'
    ))
);

create index if not exists catalog_public_events_product_idx
  on public.catalog_public_events(product_id,created_at desc);

create index if not exists catalog_public_events_type_idx
  on public.catalog_public_events(event_type,created_at desc);

create table if not exists public.catalog_public_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  product_id uuid references public.products(id) on delete set null,
  source text not null default 'catalog',
  context_summary text,
  status text not null default 'open'
    check(status in ('open','contacted','converted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_public_leads_status_idx
  on public.catalog_public_leads(status,created_at desc);

drop trigger if exists trg_catalog_public_leads_updated_at on public.catalog_public_leads;
create trigger trg_catalog_public_leads_updated_at
before update on public.catalog_public_leads
for each row execute function public.catalog_touch_updated_at_v1();

-- ---------------------------------------------------------
-- Mapa público de slugs sem substituir o RPC atual do catálogo.
-- ---------------------------------------------------------

create or replace function public.public_storefront_slug_map_v1()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id',p.id,
        'slug',pp.slug,
        'name',p.name
      )
      order by p.name
    ),
    '[]'::jsonb
  )
  from public.products p
  join public.public_product_pages pp on pp.product_id=p.id
  where p.active
    and pp.published
    and not p.restricted
    and coalesce(upper(p.sales_category),'')<>'Z';
$$;

-- ---------------------------------------------------------
-- Página pública individual do suplemento.
-- Mesmo zerado, o produto pode continuar com página publicada.
-- ---------------------------------------------------------

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

-- ---------------------------------------------------------
-- Contexto público do Nexus.
-- O cliente não recebe custo/lucro/dados de outros clientes.
-- Giro entra só para ordenar as opções do modelo.
-- ---------------------------------------------------------

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

-- ---------------------------------------------------------
-- Telemetria pública leve: não guarda texto da conversa.
-- ---------------------------------------------------------

create or replace function public.public_catalog_track_event_v1(
  p_session_id text,
  p_event_type text,
  p_product_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id bigint;
  v_type text := lower(coalesce(p_event_type,''));
  v_source text;
  v_placement text;
  v_metadata jsonb;
begin
  if v_type not in (
    'product_view',
    'buy_intent',
    'whatsapp_click',
    'nexus_open',
    'nexus_question',
    'human_handoff'
  ) then
    raise exception 'Evento de catálogo inválido';
  end if;

  v_source := left(nullif(btrim(coalesce(p_metadata->>'source','')),''),60);
  v_placement := left(nullif(btrim(coalesce(p_metadata->>'placement','')),''),60);

  v_metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'source',v_source,
      'placement',v_placement
    )
  );

  insert into public.catalog_public_events(
    session_id,product_id,event_type,metadata
  )
  values(
    left(nullif(btrim(p_session_id),''),120),
    p_product_id,
    v_type,
    v_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------
-- Solicitação de atendimento vinda da vitrine.
-- Também sobe um sinal no Nexus interno.
-- ---------------------------------------------------------

create or replace function public.public_create_catalog_lead_v1(
  p_name text,
  p_phone text,
  p_product_id uuid default null,
  p_context_summary text default null,
  p_source text default 'catalog'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_name text := left(btrim(coalesce(p_name,'')),120);
  v_phone text := left(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g'),40);
  v_product_name text;
  v_existing uuid;
begin
  if char_length(v_name)<2 then
    raise exception 'Informe seu nome';
  end if;

  if char_length(regexp_replace(v_phone,'\D','','g'))<8 then
    raise exception 'Informe um telefone válido';
  end if;

  select l.id
  into v_existing
  from public.catalog_public_leads l
  where regexp_replace(l.phone,'\D','','g')=regexp_replace(v_phone,'\D','','g')
    and l.product_id is not distinct from p_product_id
    and l.created_at>=now()-interval '24 hours'
    and l.status='open'
  order by l.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.catalog_public_leads(
    name,phone,product_id,source,context_summary
  )
  values(
    v_name,
    v_phone,
    p_product_id,
    left(coalesce(nullif(btrim(p_source),''),'catalog'),60),
    left(nullif(btrim(p_context_summary),''),2000)
  )
  returning id into v_id;

  select p.name into v_product_name
  from public.products p
  where p.id=p_product_id;

  insert into public.nexus_signals(
    fingerprint,
    signal_type,
    severity,
    operation_scope,
    entity_type,
    entity_id,
    product_id,
    title,
    summary,
    rationale,
    recommended_action,
    action_label,
    action_href,
    score,
    status,
    generated_by,
    metadata
  )
  values(
    'catalog-lead:'||v_id::text,
    'catalog_lead',
    'opportunity',
    'supplements',
    'catalog_public_lead',
    v_id,
    p_product_id,
    'Novo interesse do catálogo · '||v_name,
    concat_ws(' · ',v_product_name,left(nullif(btrim(p_context_summary),''),220)),
    'A pessoa pediu atendimento pela vitrine pública.',
    'Revisar o contexto do catálogo e entrar em contato.',
    'Abrir Nexus',
    '/suplementos/nexus',
    92,
    'open',
    'public_catalog',
    jsonb_build_object(
      'catalog_lead_id',v_id,
      'phone',v_phone,
      'product_name',v_product_name,
      'source',coalesce(nullif(btrim(p_source),''),'catalog')
    )
  )
  on conflict(fingerprint) do update set
    last_seen_at=now(),
    status='open',
    summary=excluded.summary,
    metadata=excluded.metadata;

  return v_id;
end;
$$;

-- ---------------------------------------------------------
-- Busca do menu lateral: ferramentas continuam no front,
-- produtos reais vêm daqui.
-- ---------------------------------------------------------

create or replace function public.search_internal_products_v1(
  p_query text,
  p_include_supplements boolean default true,
  p_include_fitness boolean default true,
  p_limit integer default 12
)
returns table(
  operation text,
  id uuid,
  name text,
  category text,
  brand text,
  available_quantity integer,
  href text,
  subtitle text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_query text := public.catalog_slugify_v1(left(coalesce(p_query,''),100));
  v_limit integer := least(greatest(coalesce(p_limit,12),1),24);
  v_access_supplements boolean := false;
  v_access_fitness boolean := false;
begin
  select
    p.active and (p.can_access_supplements or p.role::text='admin'),
    p.active and (p.can_access_fitness or p.role::text='admin')
  into v_access_supplements,v_access_fitness
  from public.profiles p
  where p.id=auth.uid();

  if auth.uid() is null then
    return;
  end if;

  return query
  with all_rows as (
    select
      'supplements'::text operation,
      pc.id,
      pc.name,
      pc.category,
      pc.brand,
      pc.available_quantity,
      '/produtos/'||pc.id::text href,
      concat_ws(' · ','Suplementos',pc.category,pc.brand) subtitle,
      case when pc.available_quantity>0 then 1 else 0 end available_rank
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id=pc.id
    where p_include_supplements
      and v_access_supplements
      and pc.active
      and public.catalog_slugify_v1(
        concat_ws(' ',pc.name,pc.category,pc.brand,p.sku,p.keywords)
      ) like '%'||v_query||'%'

    union all

    select
      'fitness'::text operation,
      fp.id,
      fp.name,
      fp.category,
      null::text brand,
      fp.available_quantity,
      '/fitness/produtos/'||fp.id::text href,
      concat_ws(' · ','Fitness',fp.category) subtitle,
      case when fp.available_quantity>0 then 1 else 0 end available_rank
    from public.fitness_product_catalog_v2 fp
    where p_include_fitness
      and v_access_fitness
      and fp.active
      and public.catalog_slugify_v1(
        concat_ws(' ',fp.name,fp.category,fp.description)
      ) like '%'||v_query||'%'
  )
  select
    a.operation,
    a.id,
    a.name,
    a.category,
    a.brand,
    a.available_quantity,
    a.href,
    a.subtitle
  from all_rows a
  order by a.available_rank desc,a.name
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------
-- Nexus Fitness: snapshot determinístico.
-- ---------------------------------------------------------

create or replace function public.fitness_nexus_snapshot_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_allowed boolean := false;
  v_products jsonb;
  v_summary jsonb;
begin
  select p.active and (p.can_access_fitness or p.role::text='admin')
  into v_allowed
  from public.profiles p
  where p.id=auth.uid();

  if not coalesce(v_allowed,false) then
    raise exception 'Sem acesso à operação Fitness';
  end if;

  with sales as (
    select
      v.product_id,
      coalesce(sum(i.quantity) filter(
        where s.general_status<>'cancelled'
          and s.quoted_on>=((now() at time zone 'America/Sao_Paulo')::date-30)
      ),0)::integer sold_30d,
      coalesce(sum(i.quantity) filter(
        where s.general_status<>'cancelled'
          and s.quoted_on>=((now() at time zone 'America/Sao_Paulo')::date-90)
      ),0)::integer sold_90d,
      max(s.quoted_on) filter(where s.general_status<>'cancelled') last_sale_on
    from public.fitness_variants v
    left join public.fitness_sale_items i on i.variant_id=v.id
    left join public.fitness_sales s on s.id=i.sale_id
    group by v.product_id
  ),
  costs as (
    select
      v.product_id,
      max(v.cost_price)::numeric max_cost,
      min(v.sale_price)::numeric min_sale_price
    from public.fitness_variants v
    where v.active
    group by v.product_id
  ),
  base as (
    select
      fp.id product_id,
      fp.name,
      fp.category,
      fp.image_url,
      fp.available_quantity,
      fp.incoming_quantity,
      fp.attention_variants,
      fp.variant_count,
      fp.min_sale_price,
      fp.max_sale_price,
      coalesce(c.max_cost,0) max_cost,
      coalesce(s.sold_30d,0) sold_30d,
      coalesce(s.sold_90d,0) sold_90d,
      s.last_sale_on,
      case
        when fp.available_quantity=0 and fp.incoming_quantity=0 and coalesce(s.sold_90d,0)>0
          then 'reorder'
        when fp.available_quantity>=6 and coalesce(s.sold_30d,0)=0
          then 'promote'
        when coalesce(s.sold_30d,0)>=2 and fp.available_quantity<=2
          then 'protect_stock'
        when coalesce(s.sold_30d,0)>=2 and fp.available_quantity>=3
          then 'momentum'
        when fp.available_quantity>=4 and coalesce(s.sold_90d,0)=0
          then 'stagnant'
        else 'watch'
      end signal_type
    from public.fitness_product_catalog_v2 fp
    left join sales s on s.product_id=fp.id
    left join costs c on c.product_id=fp.id
    where fp.active
  ),
  scored as (
    select
      b.*,
      case b.signal_type
        when 'reorder' then 94
        when 'protect_stock' then 88
        when 'promote' then 82
        when 'stagnant' then 78
        when 'momentum' then 72
        else 30
      end
      + least(coalesce(b.available_quantity,0),12)
      + least(coalesce(b.sold_90d,0),12) score,
      case
        when b.signal_type='stagnant' then 15
        when b.signal_type='promote' then 10
        when b.signal_type='momentum' then 5
        else 0
      end base_discount
    from base b
  ),
  priced as (
    select
      s.*,
      case
        when s.base_discount<=0 then 0
        when coalesce(s.max_cost,0)<=0 or coalesce(s.min_sale_price,0)<=0
          then s.base_discount
        else greatest(
          0,
          least(
            s.base_discount,
            floor(
              (
                1 -
                ((s.max_cost/0.70)/nullif(s.min_sale_price,0))
              )*100
            )::integer
          )
        )
      end suggested_discount_pct
    from scored s
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id',p.product_id,
        'name',p.name,
        'category',p.category,
        'image_url',p.image_url,
        'available_quantity',p.available_quantity,
        'incoming_quantity',p.incoming_quantity,
        'attention_variants',p.attention_variants,
        'variant_count',p.variant_count,
        'min_sale_price',p.min_sale_price,
        'max_sale_price',p.max_sale_price,
        'max_cost',p.max_cost,
        'sold_30d',p.sold_30d,
        'sold_90d',p.sold_90d,
        'last_sale_on',p.last_sale_on,
        'signal_type',p.signal_type,
        'score',p.score,
        'suggested_discount_pct',p.suggested_discount_pct,
        'suggested_price',
          case
            when p.suggested_discount_pct>0
              then round(p.min_sale_price*(1-p.suggested_discount_pct/100.0),2)
            else null
          end,
        'cost_complete',p.max_cost>0
      )
      order by p.score desc,p.name
    ),
    '[]'::jsonb
  )
  into v_products
  from priced p;

  select jsonb_build_object(
    'month_sales',coalesce(d.month_sales,0),
    'month_revenue',coalesce(d.month_revenue,0),
    'month_profit',coalesce(d.month_profit,0),
    'available_units',coalesce(d.available_units,0),
    'incoming_units',coalesce(d.incoming_units,0),
    'pending_delivery',coalesce(d.pending_delivery,0),
    'pending_payment',coalesce(d.pending_payment,0),
    'receivable_total',coalesce(d.receivable_total,0),
    'open_orders',coalesce(d.open_orders,0)
  )
  into v_summary
  from public.fitness_dashboard_summary d;

  return jsonb_build_object(
    'summary',coalesce(v_summary,'{}'::jsonb),
    'products',coalesce(v_products,'[]'::jsonb),
    'generated_at',now()
  );
end;
$$;

-- ---------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------

alter table public.public_product_pages enable row level security;
alter table public.catalog_public_events enable row level security;
alter table public.catalog_public_leads enable row level security;

drop policy if exists public_product_pages_read_internal_v1 on public.public_product_pages;
create policy public_product_pages_read_internal_v1
on public.public_product_pages
for select to authenticated
using(public.can_access_operation('supplements'));

drop policy if exists public_product_pages_write_internal_v1 on public.public_product_pages;
create policy public_product_pages_write_internal_v1
on public.public_product_pages
for all to authenticated
using(public.can_write())
with check(public.can_write());

drop policy if exists catalog_public_events_read_internal_v1 on public.catalog_public_events;
create policy catalog_public_events_read_internal_v1
on public.catalog_public_events
for select to authenticated
using(public.can_access_operation('supplements'));

drop policy if exists catalog_public_leads_manage_internal_v1 on public.catalog_public_leads;
create policy catalog_public_leads_manage_internal_v1
on public.catalog_public_leads
for all to authenticated
using(public.can_write())
with check(public.can_write());

revoke all on public.public_product_pages,public.catalog_public_events,public.catalog_public_leads from anon,public;
grant select,insert,update,delete on public.public_product_pages to authenticated;
grant select on public.catalog_public_events to authenticated;
grant select,update,delete on public.catalog_public_leads to authenticated;


create or replace function public.public_catalog_question_count_v1(
  p_session_id text,
  p_minutes integer default 60
)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::integer
  from public.catalog_public_events e
  where e.event_type='nexus_question'
    and e.session_id=left(nullif(btrim(p_session_id),''),120)
    and e.created_at>=now()-make_interval(mins=>least(greatest(coalesce(p_minutes,60),1),1440));
$$;

revoke all on function public.public_storefront_slug_map_v1() from public;
revoke all on function public.public_storefront_product_page_v1(text) from public;
revoke all on function public.public_catalog_advisor_snapshot_v1(integer) from public;
revoke all on function public.public_catalog_track_event_v1(text,text,uuid,jsonb) from public;
revoke all on function public.public_create_catalog_lead_v1(text,text,uuid,text,text) from public;
revoke all on function public.public_catalog_question_count_v1(text,integer) from public;
revoke all on function public.search_internal_products_v1(text,boolean,boolean,integer) from public;
revoke all on function public.fitness_nexus_snapshot_v1() from public;

grant execute on function public.public_storefront_slug_map_v1()
to anon,authenticated,service_role;
grant execute on function public.public_storefront_product_page_v1(text)
to anon,authenticated,service_role;
grant execute on function public.public_catalog_advisor_snapshot_v1(integer)
to anon,authenticated,service_role;
grant execute on function public.public_catalog_track_event_v1(text,text,uuid,jsonb)
to anon,authenticated,service_role;
grant execute on function public.public_create_catalog_lead_v1(text,text,uuid,text,text)
to anon,authenticated,service_role;
grant execute on function public.public_catalog_question_count_v1(text,integer)
to anon,authenticated,service_role;

grant execute on function public.search_internal_products_v1(text,boolean,boolean,integer)
to authenticated,service_role;
grant execute on function public.fitness_nexus_snapshot_v1()
to authenticated,service_role;

commit;
