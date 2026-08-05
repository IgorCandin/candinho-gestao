begin;

-- =========================================================
-- V43 · Promoções automáticas + Sob encomenda -> Rupturas
-- Migration já aplicada em produção com esta mesma versão.
-- =========================================================

alter table public.central_demand_gaps
  add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.central_demand_gaps
  add column if not exists source text not null default 'manual';

create index if not exists central_demand_gaps_product_id_idx
  on public.central_demand_gaps(product_id);

create index if not exists central_demand_gaps_source_idx
  on public.central_demand_gaps(source, created_at desc);

create or replace function public.central_finalize_expired_promotions()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count integer := 0;
begin
  update public.central_promotions
  set
    status = 'ended',
    updated_at = now()
  where status in ('active', 'scheduled')
    and ends_on is not null
    and ends_on < (now() at time zone 'America/Sao_Paulo')::date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.central_finalize_expired_promotions() from public, anon;
grant execute on function public.central_finalize_expired_promotions() to authenticated, service_role;

select public.central_finalize_expired_promotions();

select cron.schedule(
  'central_finalize_expired_promotions_v43',
  '*/10 * * * *',
  'select public.central_finalize_expired_promotions();'
);

create or replace function public.public_catalog_backorders_v1(
  p_limit integer default 60
)
returns table(
  product_id uuid,
  name text,
  category text,
  brand text,
  image_url text,
  sale_price numeric,
  available_quantity integer,
  incoming_quantity integer
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    pc.id as product_id,
    pc.name,
    pc.category,
    p.brand,
    coalesce(pc.thumbnail_url, pc.image_url) as image_url,
    pc.sale_price::numeric,
    coalesce(pc.available_quantity, 0)::integer,
    coalesce(pc.incoming_quantity, 0)::integer
  from public.product_catalog_commercial_sort pc
  join public.products p on p.id = pc.id
  where pc.active = true
    and p.restricted = false
    and coalesce(upper(p.sales_category), '') <> 'Z'
    and coalesce(pc.available_quantity, 0) <= 0
    and upper(pc.name) not like '%COMBO%'
    and coalesce(pc.sale_price, 0) > 0
  order by
    case when coalesce(pc.incoming_quantity, 0) > 0 then 0 else 1 end,
    pc.total_sold desc,
    pc.name
  limit least(greatest(coalesce(p_limit, 60), 1), 120);
$function$;

revoke all on function public.public_catalog_backorders_v1(integer) from public;
grant execute on function public.public_catalog_backorders_v1(integer) to anon, authenticated, service_role;

create or replace function public.public_catalog_match_candidates_v1(
  p_limit integer default 120
)
returns table(
  product_id uuid,
  name text,
  category text,
  brand text,
  available_quantity integer,
  incoming_quantity integer
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    pc.id as product_id,
    pc.name,
    pc.category,
    p.brand,
    coalesce(pc.available_quantity, 0)::integer,
    coalesce(pc.incoming_quantity, 0)::integer
  from public.product_catalog_commercial_sort pc
  join public.products p on p.id = pc.id
  where pc.active = true
    and p.restricted = false
    and coalesce(upper(p.sales_category), '') <> 'Z'
    and upper(pc.name) not like '%COMBO%'
  order by pc.total_sold desc, pc.name
  limit least(greatest(coalesce(p_limit, 120), 1), 160);
$function$;

revoke all on function public.public_catalog_match_candidates_v1(integer) from public;
grant execute on function public.public_catalog_match_candidates_v1(integer) to anon, authenticated, service_role;

create or replace function public.public_register_catalog_demand_gap_v1(
  p_product_id uuid default null,
  p_product_name text default null,
  p_name text default null,
  p_phone text default null,
  p_category text default null,
  p_brand text default null,
  p_notes text default null,
  p_source text default 'catalog_backorder'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_existing uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_product_name text := nullif(btrim(coalesce(p_product_name, '')), '');
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
  v_brand text := nullif(btrim(coalesce(p_brand, '')), '');
  v_image_url text;
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'catalog_backorder'), 60);
  v_recent_count integer := 0;
begin
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Informe seu nome para continuar.';
  end if;

  if char_length(v_phone) < 8 then
    raise exception 'Informe um telefone válido para contato.';
  end if;

  select count(*)::integer
  into v_recent_count
  from public.central_demand_gaps d
  where regexp_replace(coalesce(d.customer_phone, ''), '\D', '', 'g') = v_phone
    and d.created_at >= now() - interval '24 hours';

  if v_recent_count >= 10 then
    raise exception 'Muitas solicitações foram enviadas por este telefone hoje. Tente novamente mais tarde.';
  end if;

  if p_product_id is not null then
    select
      p.name,
      p.category,
      p.brand,
      coalesce(pc.thumbnail_url, pc.image_url)
    into
      v_product_name,
      v_category,
      v_brand,
      v_image_url
    from public.products p
    join public.product_catalog_commercial_sort pc on pc.id = p.id
    where p.id = p_product_id
      and p.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
    limit 1;

    if v_product_name is null then
      raise exception 'Produto não disponível para solicitação.';
    end if;
  end if;

  if v_product_name is null or char_length(v_product_name) < 2 then
    raise exception 'Informe o produto que você procura.';
  end if;

  select d.id
  into v_existing
  from public.central_demand_gaps d
  where regexp_replace(coalesce(d.customer_phone, ''), '\D', '', 'g') = v_phone
    and lower(btrim(d.product_name)) = lower(btrim(v_product_name))
    and d.status in ('open', 'evaluating', 'planned_purchase', 'ordered')
    and d.created_at >= now() - interval '24 hours'
  order by d.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.central_demand_gaps(
    product_id,
    product_name,
    operation_scope,
    category,
    brand,
    customer_name,
    customer_phone,
    requested_on,
    priority,
    status,
    image_url,
    notes,
    source,
    created_by,
    updated_by
  )
  values(
    p_product_id,
    left(v_product_name, 180),
    'supplements',
    left(v_category, 120),
    left(v_brand, 120),
    left(v_name, 120),
    left(coalesce(p_phone, ''), 40),
    (now() at time zone 'America/Sao_Paulo')::date,
    'medium',
    'open',
    v_image_url,
    left(nullif(btrim(coalesce(p_notes, '')), ''), 2000),
    v_source,
    null,
    null
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.public_register_catalog_demand_gap_v1(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.public_register_catalog_demand_gap_v1(uuid,text,text,text,text,text,text,text) to anon, authenticated, service_role;

commit;
