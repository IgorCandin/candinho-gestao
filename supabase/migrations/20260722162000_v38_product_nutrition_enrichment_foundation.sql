alter table public.products
  add column if not exists nutrition_status text not null default 'pending',
  add column if not exists nutrition_source_name text,
  add column if not exists nutrition_source_url text,
  add column if not exists nutrition_source_checked_at timestamptz,
  add column if not exists nutrition_reviewed_at timestamptz,
  add column if not exists nutrition_reviewed_by uuid,
  add column if not exists nutrition_notes text;

alter table public.products
  drop constraint if exists products_nutrition_status_check;

alter table public.products
  add constraint products_nutrition_status_check
  check (
    nutrition_status in (
      'pending',
      'researching',
      'review',
      'approved',
      'not_applicable'
    )
  );

create index if not exists products_nutrition_status_idx
  on public.products(
    nutrition_status,
    active,
    created_at
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
    when p.nutrition_status = 'approved'
      then 5
    when p.nutrition_status = 'not_applicable'
      then 6
    when p.secondary_image_url is null
      then 1
    when nullif(
      btrim(p.nutrition_source_url),
      ''
    ) is null
      then 2
    when p.nutrition_status = 'review'
      then 3
    else 4
  end as priority_rank,
  concat_ws(
    ' ',
    p.name,
    p.brand,
    p.sku
  ) as research_query,
  p.created_at,
  p.updated_at
from public.products p
where coalesce(p.brand, '') <> 'Combo'
  and upper(p.name) not like 'COMBO %';

create or replace function public.set_product_nutrition_metadata(
  p_product_id uuid,
  p_status text,
  p_source_name text default null,
  p_source_url text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para revisar informação nutricional';
  end if;

  if p_status not in (
    'pending',
    'researching',
    'review',
    'approved',
    'not_applicable'
  ) then
    raise exception
      'Status nutricional inválido';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if v_product.id is null then
    raise exception 'Produto não encontrado';
  end if;

  if p_status = 'approved' then
    if v_product.secondary_image_url is null then
      raise exception
        'Adicione a Imagem 2 nutricional antes de aprovar';
    end if;

    if nullif(
      btrim(p_source_url),
      ''
    ) is null then
      raise exception
        'Informe a fonte oficial antes de aprovar';
    end if;
  end if;

  update public.products
  set
    nutrition_status = p_status,
    nutrition_source_name =
      nullif(btrim(p_source_name), ''),
    nutrition_source_url =
      nullif(btrim(p_source_url), ''),
    nutrition_source_checked_at =
      case
        when nullif(
          btrim(p_source_url),
          ''
        ) is not null
          then now()
        else nutrition_source_checked_at
      end,
    nutrition_reviewed_at =
      case
        when p_status in (
          'approved',
          'not_applicable'
        )
          then now()
        else null
      end,
    nutrition_reviewed_by =
      case
        when p_status in (
          'approved',
          'not_applicable'
        )
          then auth.uid()
        else null
      end,
    nutrition_notes =
      nullif(btrim(p_notes), ''),
    updated_at = now()
  where id = p_product_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values (
    'product',
    p_product_id,
    'nutrition_metadata_updated',
    jsonb_build_object(
      'status',
      p_status,
      'source_name',
      nullif(
        btrim(p_source_name),
        ''
      ),
      'has_source_url',
      nullif(
        btrim(p_source_url),
        ''
      ) is not null,
      'has_secondary_image',
      v_product.secondary_image_url
        is not null
    )
  );

  return p_product_id;
end;
$$;

revoke all on function
  public.set_product_nutrition_metadata(
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon;

grant execute on function
  public.set_product_nutrition_metadata(
    uuid,
    text,
    text,
    text,
    text
  )
to authenticated, service_role;
