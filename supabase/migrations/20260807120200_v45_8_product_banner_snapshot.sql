create or replace function public.product_banner_snapshot_v1(
  p_product_id uuid
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
  if not exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
      and (
        p.role::text='admin'
        or p.can_access_supplements
      )
  ) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'id',p.id,
    'name',p.name,
    'banner_image_url',p.banner_image_url,
    'banner_mobile_image_url',p.banner_mobile_image_url
  )
  into v_result
  from public.products p
  where p.id=p_product_id;

  return v_result;
end;
$function$;

revoke all on function
  public.product_banner_snapshot_v1(uuid)
from public;

grant execute on function
  public.product_banner_snapshot_v1(uuid)
to authenticated;
