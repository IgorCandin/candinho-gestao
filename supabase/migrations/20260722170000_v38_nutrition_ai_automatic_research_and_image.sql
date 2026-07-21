alter table public.products
  add column if not exists nutrition_ai_payload jsonb,
  add column if not exists nutrition_ai_sources jsonb not null default '[]'::jsonb,
  add column if not exists nutrition_ai_model text,
  add column if not exists nutrition_ai_response_id text,
  add column if not exists nutrition_ai_researched_at timestamptz,
  add column if not exists nutrition_match_status text,
  add column if not exists nutrition_match_confidence integer,
  add column if not exists nutrition_variant_warning text,
  add column if not exists nutrition_image_generated_at timestamptz;

alter table public.products
  drop constraint if exists products_nutrition_match_status_check;

alter table public.products
  add constraint products_nutrition_match_status_check
  check (
    nutrition_match_status is null
    or nutrition_match_status in ('exact', 'probable', 'ambiguous', 'not_found')
  );

alter table public.products
  drop constraint if exists products_nutrition_match_confidence_check;

alter table public.products
  add constraint products_nutrition_match_confidence_check
  check (
    nutrition_match_confidence is null
    or nutrition_match_confidence between 0 and 100
  );

create or replace view public.product_nutrition_enrichment_queue
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.sku,
  p.brand,
  p.category,
  p.active,
  p.restricted,
  p.image_url,
  p.thumbnail_url,
  p.secondary_image_url,
  p.secondary_thumbnail_url,
  p.nutrition_status,
  p.nutrition_source_name,
  p.nutrition_source_url,
  p.nutrition_source_checked_at,
  p.nutrition_reviewed_at,
  p.nutrition_reviewed_by,
  p.nutrition_notes,
  case
    when p.nutrition_status = 'approved' then 5
    when p.nutrition_status = 'not_applicable' then 6
    when p.secondary_image_url is null then 1
    when nullif(btrim(p.nutrition_source_url), '') is null then 2
    when p.nutrition_status = 'review' then 3
    else 4
  end as priority_rank,
  concat_ws(' ', p.name, p.brand, p.sku) as research_query,
  p.created_at,
  p.updated_at,
  p.nutrition_ai_payload,
  p.nutrition_ai_sources,
  p.nutrition_ai_model,
  p.nutrition_ai_response_id,
  p.nutrition_ai_researched_at,
  p.nutrition_match_status,
  p.nutrition_match_confidence,
  p.nutrition_variant_warning,
  p.nutrition_image_generated_at
from public.products p
where coalesce(p.brand, '') <> 'Combo'
  and upper(p.name) not like 'COMBO %';

create or replace function public.save_product_nutrition_ai_research(
  p_product_id uuid,
  p_payload jsonb,
  p_sources jsonb,
  p_source_name text,
  p_source_url text,
  p_model text,
  p_response_id text,
  p_match_status text,
  p_confidence integer,
  p_variant_warning text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para pesquisar informação nutricional';
  end if;

  if p_match_status not in ('exact', 'probable', 'ambiguous', 'not_found') then
    raise exception 'Status de correspondência inválido';
  end if;

  if p_confidence is not null and (p_confidence < 0 or p_confidence > 100) then
    raise exception 'Confiança precisa estar entre 0 e 100';
  end if;

  if not exists(select 1 from public.products where id = p_product_id) then
    raise exception 'Produto não encontrado';
  end if;

  update public.products
  set
    nutrition_ai_payload = coalesce(p_payload, '{}'::jsonb),
    nutrition_ai_sources = coalesce(p_sources, '[]'::jsonb),
    nutrition_ai_model = nullif(btrim(p_model), ''),
    nutrition_ai_response_id = nullif(btrim(p_response_id), ''),
    nutrition_ai_researched_at = now(),
    nutrition_match_status = p_match_status,
    nutrition_match_confidence = p_confidence,
    nutrition_variant_warning = nullif(btrim(p_variant_warning), ''),
    nutrition_status = 'review',
    nutrition_source_name = coalesce(nullif(btrim(p_source_name), ''), nutrition_source_name),
    nutrition_source_url = coalesce(nullif(btrim(p_source_url), ''), nutrition_source_url),
    nutrition_source_checked_at = case
      when nullif(btrim(p_source_url), '') is not null then now()
      else nutrition_source_checked_at
    end,
    updated_at = now()
  where id = p_product_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'product',
    p_product_id,
    'nutrition_ai_researched',
    jsonb_build_object(
      'model', nullif(btrim(p_model), ''),
      'response_id', nullif(btrim(p_response_id), ''),
      'match_status', p_match_status,
      'confidence', p_confidence,
      'source_name', nullif(btrim(p_source_name), ''),
      'source_url', nullif(btrim(p_source_url), '')
    )
  );

  return p_product_id;
end;
$$;

create or replace function public.mark_product_nutrition_image_generated(
  p_product_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para gerar Imagem 2';
  end if;

  if not exists(
    select 1
    from public.products
    where id = p_product_id
      and secondary_image_url is not null
  ) then
    raise exception 'Imagem 2 ainda não foi salva no produto';
  end if;

  update public.products
  set
    nutrition_image_generated_at = now(),
    nutrition_status = 'review',
    updated_at = now()
  where id = p_product_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'product',
    p_product_id,
    'nutrition_image_generated',
    jsonb_build_object('generated_at', now())
  );

  return p_product_id;
end;
$$;

revoke all on function public.save_product_nutrition_ai_research(uuid,jsonb,jsonb,text,text,text,text,text,integer,text) from public, anon;
revoke all on function public.mark_product_nutrition_image_generated(uuid) from public, anon;

grant execute on function public.save_product_nutrition_ai_research(uuid,jsonb,jsonb,text,text,text,text,text,integer,text) to authenticated, service_role;
grant execute on function public.mark_product_nutrition_image_generated(uuid) to authenticated, service_role;
