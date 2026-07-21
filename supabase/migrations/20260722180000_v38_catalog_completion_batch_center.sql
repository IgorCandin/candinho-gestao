create table if not exists public.catalog_completion_drafts (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('supplements','fitness')),
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  generated_fields text[] not null default '{}'::text[],
  model text,
  status text not null default 'draft' check (status in ('draft','applied','discarded')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module, entity_id)
);

alter table public.catalog_completion_drafts enable row level security;

create or replace function public.get_catalog_completion_queue()
returns table (
  module text,
  entity_id uuid,
  name text,
  category text,
  brand text,
  image_url text,
  missing_fields text[],
  ai_fields text[],
  missing_count integer,
  completion_pct integer,
  edit_href text,
  secondary_image_url text,
  nutrition_status text,
  draft_payload jsonb,
  draft_status text,
  draft_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with supplement_rows as (
    select
      'supplements'::text as module,
      p.id as entity_id,
      p.name,
      p.category,
      p.brand,
      p.image_url,
      array_remove(array[
        case when nullif(btrim(p.name),'') is null then 'Nome' end,
        case when nullif(btrim(p.category),'') is null then 'Categoria' end,
        case when nullif(btrim(p.brand),'') is null then 'Marca' end,
        case when nullif(btrim(p.sku),'') is null then 'SKU' end,
        case when nullif(btrim(p.description),'') is null then 'Descrição' end,
        case when p.image_url is null then 'Imagem 1' end,
        case when p.default_supplier_id is null then 'Fornecedor' end,
        case when nullif(btrim(p.objective),'') is null then 'Objetivo' end,
        case when nullif(btrim(p.ideal_profile),'') is null then 'Perfil ideal' end,
        case when nullif(btrim(p.information),'') is null then 'Informativo' end,
        case when nullif(btrim(p.quick_message),'') is null then 'Mensagem rápida' end,
        case when nullif(btrim(p.keywords),'') is null then 'Palavras-chave' end,
        case when p.secondary_image_url is null and p.category not ilike '%acess%' then 'Imagem 2' end
      ], null) as missing_fields,
      array_remove(array[
        case when nullif(btrim(p.category),'') is null then 'Categoria' end,
        case when nullif(btrim(p.brand),'') is null then 'Marca' end,
        case when nullif(btrim(p.description),'') is null then 'Descrição' end,
        case when nullif(btrim(p.objective),'') is null then 'Objetivo' end,
        case when nullif(btrim(p.ideal_profile),'') is null then 'Perfil ideal' end,
        case when nullif(btrim(p.information),'') is null then 'Informativo' end,
        case when nullif(btrim(p.quick_message),'') is null then 'Mensagem rápida' end,
        case when nullif(btrim(p.keywords),'') is null then 'Palavras-chave' end
      ], null) as ai_fields,
      ('/produtos/' || p.id::text || '/editar')::text as edit_href,
      p.secondary_image_url,
      p.nutrition_status
    from public.products p
    where public.can_write()
      and p.active
      and coalesce(p.brand,'') <> 'Combo'
      and upper(p.name) not like 'COMBO %'
  ),
  fitness_rows as (
    select
      'fitness'::text as module,
      p.id as entity_id,
      p.name,
      p.category,
      null::text as brand,
      p.image_url,
      array_remove(array[
        case when nullif(btrim(p.name),'') is null then 'Nome' end,
        case when nullif(btrim(p.category),'') is null then 'Categoria' end,
        case when nullif(btrim(p.description),'') is null then 'Descrição' end,
        case when p.image_url is null then 'Imagem' end,
        case when not exists(select 1 from public.fitness_variants v where v.product_id=p.id and v.active) then 'Variações' end,
        case when exists(select 1 from public.fitness_variants v where v.product_id=p.id and v.active and nullif(btrim(v.sku),'') is null) then 'SKU de variação' end,
        case when exists(select 1 from public.fitness_variants v where v.product_id=p.id and v.active and v.default_supplier_id is null) then 'Fornecedor de variação' end
      ], null) as missing_fields,
      array_remove(array[
        case when nullif(btrim(p.category),'') is null then 'Categoria' end,
        case when nullif(btrim(p.description),'') is null then 'Descrição' end
      ], null) as ai_fields,
      ('/fitness/produtos/' || p.id::text || '/editar')::text as edit_href,
      null::text as secondary_image_url,
      null::text as nutrition_status
    from public.fitness_products p
    where public.can_write_fitness() and p.active
  ),
  all_rows as (
    select * from supplement_rows
    union all
    select * from fitness_rows
  )
  select
    r.module,
    r.entity_id,
    r.name,
    r.category,
    r.brand,
    r.image_url,
    r.missing_fields,
    r.ai_fields,
    cardinality(r.missing_fields)::integer as missing_count,
    case
      when r.module='supplements'
        then greatest(0, round(((13-cardinality(r.missing_fields))::numeric/13)*100)::integer)
      else greatest(0, round(((7-cardinality(r.missing_fields))::numeric/7)*100)::integer)
    end as completion_pct,
    r.edit_href,
    r.secondary_image_url,
    r.nutrition_status,
    d.payload as draft_payload,
    d.status as draft_status,
    d.updated_at as draft_updated_at
  from all_rows r
  left join public.catalog_completion_drafts d
    on d.module=r.module and d.entity_id=r.entity_id
  where cardinality(r.missing_fields)>0
  order by r.module, cardinality(r.missing_fields) desc, r.name;
$$;

create or replace function public.save_catalog_completion_draft(
  p_module text,
  p_entity_id uuid,
  p_payload jsonb,
  p_generated_fields text[],
  p_model text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_module='supplements' and not public.can_write() then
    raise exception 'Usuário sem permissão para completar produtos de Suplementos';
  end if;
  if p_module='fitness' and not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para completar produtos Fitness';
  end if;
  if p_module not in ('supplements','fitness') then
    raise exception 'Módulo inválido';
  end if;

  insert into public.catalog_completion_drafts(
    module, entity_id, payload, generated_fields, model, status, created_by, updated_at
  )
  values (
    p_module, p_entity_id, coalesce(p_payload,'{}'::jsonb),
    coalesce(p_generated_fields,'{}'::text[]), nullif(btrim(p_model),''),
    'draft', auth.uid(), now()
  )
  on conflict(module,entity_id) do update set
    payload=excluded.payload,
    generated_fields=excluded.generated_fields,
    model=excluded.model,
    status='draft',
    updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.apply_catalog_completion_draft(
  p_module text,
  p_entity_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_draft_id uuid;
begin
  if p_module='supplements' and not public.can_write() then
    raise exception 'Usuário sem permissão para completar produtos de Suplementos';
  end if;
  if p_module='fitness' and not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para completar produtos Fitness';
  end if;

  select id,payload
  into v_draft_id,v_payload
  from public.catalog_completion_drafts
  where module=p_module and entity_id=p_entity_id and status='draft'
  for update;

  if v_draft_id is null then
    raise exception 'Nenhuma sugestão pendente encontrada';
  end if;

  if p_module='supplements' then
    update public.products
    set
      category = case when nullif(btrim(category),'') is null then coalesce(nullif(btrim(v_payload->>'suggested_category'),''),category) else category end,
      brand = case when nullif(btrim(brand),'') is null then coalesce(nullif(btrim(v_payload->>'suggested_brand'),''),brand) else brand end,
      description = case when nullif(btrim(description),'') is null then coalesce(nullif(btrim(v_payload->>'description'),''),description) else description end,
      objective = case when nullif(btrim(objective),'') is null then coalesce(nullif(btrim(v_payload->>'objective'),''),objective) else objective end,
      ideal_profile = case when nullif(btrim(ideal_profile),'') is null then coalesce(nullif(btrim(v_payload->>'ideal_profile'),''),ideal_profile) else ideal_profile end,
      information = case when nullif(btrim(information),'') is null then coalesce(nullif(btrim(v_payload->>'information'),''),information) else information end,
      quick_message = case when nullif(btrim(quick_message),'') is null then coalesce(nullif(btrim(v_payload->>'quick_message'),''),quick_message) else quick_message end,
      keywords = case when nullif(btrim(keywords),'') is null then coalesce(nullif(btrim(v_payload->>'keywords'),''),keywords) else keywords end,
      updated_at=now()
    where id=p_entity_id;
  elsif p_module='fitness' then
    update public.fitness_products
    set
      category = case when nullif(btrim(category),'') is null then coalesce(nullif(btrim(v_payload->>'suggested_category'),''),category) else category end,
      description = case when nullif(btrim(description),'') is null then coalesce(nullif(btrim(v_payload->>'description'),''),description) else description end,
      updated_at=now()
    where id=p_entity_id;
  else
    raise exception 'Módulo inválido';
  end if;

  update public.catalog_completion_drafts
  set status='applied',updated_at=now()
  where id=v_draft_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values (
    'catalog_completion',
    p_entity_id,
    'draft_applied',
    jsonb_build_object('module',p_module,'draft_id',v_draft_id)
  );

  return p_entity_id;
end;
$$;

create or replace function public.discard_catalog_completion_draft(
  p_module text,
  p_entity_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_module='supplements' and not public.can_write() then
    raise exception 'Usuário sem permissão';
  end if;
  if p_module='fitness' and not public.can_write_fitness() then
    raise exception 'Usuário sem permissão';
  end if;

  update public.catalog_completion_drafts
  set status='discarded',updated_at=now()
  where module=p_module and entity_id=p_entity_id;

  return p_entity_id;
end;
$$;

revoke all on function public.get_catalog_completion_queue() from public, anon;
revoke all on function public.save_catalog_completion_draft(text,uuid,jsonb,text[],text) from public, anon;
revoke all on function public.apply_catalog_completion_draft(text,uuid) from public, anon;
revoke all on function public.discard_catalog_completion_draft(text,uuid) from public, anon;

grant execute on function public.get_catalog_completion_queue() to authenticated, service_role;
grant execute on function public.save_catalog_completion_draft(text,uuid,jsonb,text[],text) to authenticated, service_role;
grant execute on function public.apply_catalog_completion_draft(text,uuid) to authenticated, service_role;
grant execute on function public.discard_catalog_completion_draft(text,uuid) to authenticated, service_role;
