alter table public.products
  add column if not exists banner_image_url text,
  add column if not exists banner_mobile_image_url text;

create or replace function public.set_product_banner_v1(
  p_product_id uuid,
  p_slot text,
  p_image_url text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar banners';
  end if;

  if not exists(
    select 1
    from public.products
    where id=p_product_id
  ) then
    raise exception 'Produto não encontrado';
  end if;

  if p_slot='desktop' then
    update public.products
      set banner_image_url=nullif(btrim(p_image_url),''),
          updated_at=now()
    where id=p_product_id;
  elsif p_slot='mobile' then
    update public.products
      set banner_mobile_image_url=nullif(btrim(p_image_url),''),
          updated_at=now()
    where id=p_product_id;
  else
    raise exception 'Tipo de banner inválido';
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'product',
    p_product_id,
    'banner_updated',
    jsonb_build_object(
      'slot',p_slot,
      'has_banner',nullif(btrim(p_image_url),'') is not null
    )
  );

  return p_product_id;
end;
$function$;

revoke all on function
  public.set_product_banner_v1(uuid,text,text)
from public;

grant execute on function
  public.set_product_banner_v1(uuid,text,text)
to authenticated;

-- Primeiro banner oficial do catálogo.
update public.products
set
  banner_image_url='/product-banners/creatina-candinho.webp',
  updated_at=now()
where lower(btrim(name))=
  'creatina 300g | candinho suplementos';
