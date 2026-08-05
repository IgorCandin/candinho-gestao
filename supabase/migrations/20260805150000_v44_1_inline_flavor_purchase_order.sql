create or replace function public.create_product_flavor_from_purchase_order(
  p_product_id uuid,
  p_name text
)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_flavor_id uuid;
  v_existing_active boolean;
  v_next_order integer;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cadastrar sabores';
  end if;

  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Informe o nome do sabor';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.active = true
      and p.flavor_tracking_enabled = true
  ) then
    raise exception 'Este produto ainda não possui controle por sabor ativo. Configure os sabores no cadastro do produto antes de continuar.';
  end if;

  select f.id, f.active
  into v_flavor_id, v_existing_active
  from public.product_flavors f
  where f.product_id = p_product_id
    and lower(btrim(f.name)) = lower(v_name)
  limit 1;

  if v_flavor_id is not null then
    if not coalesce(v_existing_active, false) then
      update public.product_flavors
      set active = true,
          name = v_name,
          updated_at = now()
      where product_flavors.id = v_flavor_id;
    end if;
  else
    select coalesce(max(f.display_order), 0) + 10
    into v_next_order
    from public.product_flavors f
    where f.product_id = p_product_id;

    insert into public.product_flavors(
      product_id,
      name,
      active,
      display_order,
      created_by
    )
    values(
      p_product_id,
      v_name,
      true,
      v_next_order,
      auth.uid()
    )
    returning product_flavors.id into v_flavor_id;
  end if;

  insert into public.product_flavor_stock_balances(
    flavor_id,
    location_id,
    quantity
  )
  select
    v_flavor_id,
    l.id,
    0
  from public.locations l
  where l.active
    and l.tracks_inventory
  on conflict (flavor_id, location_id) do nothing;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'product_flavor',
    v_flavor_id,
    'flavor_created_from_purchase_order',
    jsonb_build_object(
      'product_id', p_product_id,
      'name', v_name
    )
  );

  return query
  select f.id, f.name
  from public.product_flavors f
  where f.id = v_flavor_id;
end;
$$;

revoke all on function public.create_product_flavor_from_purchase_order(uuid, text)
from public, anon, authenticated;

grant execute on function public.create_product_flavor_from_purchase_order(uuid, text)
to authenticated, service_role;
