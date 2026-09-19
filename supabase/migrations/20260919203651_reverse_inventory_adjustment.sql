create or replace function public.reverse_inventory_adjustment_v1(
  p_movement_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_original public.inventory_movements%rowtype;
  v_current integer;
  v_reserved integer;
  v_new integer;
  v_reversal_id uuid;
  v_reversal_delta integer;
  v_allocated integer:=0;
begin
  if auth.uid() is null or not public.can_write() then
    raise exception 'Usuário sem permissão para estornar acertos';
  end if;

  if nullif(btrim(coalesce(p_reason,'')),'') is null then
    raise exception 'Informe o motivo do estorno';
  end if;

  select * into v_original
  from public.inventory_movements
  where id=p_movement_id
  for update;

  if not found or v_original.movement_type<>'adjustment' then
    raise exception 'Acerto de estoque não encontrado';
  end if;

  if v_original.idempotency_key like 'app:inventory-adjustment-reversal:%' then
    raise exception 'Um estorno não pode ser estornado por esta ação';
  end if;

  if exists(
    select 1
    from public.inventory_movements
    where idempotency_key='app:inventory-adjustment-reversal:'||v_original.id::text
  ) then
    raise exception 'Este acerto já foi estornado';
  end if;

  if v_original.flavor_id is not null then
    select quantity into v_current
    from public.product_flavor_stock_balances
    where flavor_id=v_original.flavor_id
      and location_id=v_original.location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer into v_reserved
    from public.stock_reservations
    where product_id=v_original.product_id
      and location_id=v_original.location_id
      and flavor_id=v_original.flavor_id
      and status in ('reserved','partial');
  else
    select quantity into v_current
    from public.stock_balances
    where product_id=v_original.product_id
      and location_id=v_original.location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer into v_reserved
    from public.stock_reservations
    where product_id=v_original.product_id
      and location_id=v_original.location_id
      and flavor_id is null
      and status in ('reserved','partial');
  end if;

  v_reversal_delta:=-v_original.quantity_delta;
  v_new:=coalesce(v_current,0)+v_reversal_delta;

  if v_new<0 then
    raise exception 'Não é possível estornar: o estoque atual já utilizou essas unidades';
  end if;

  if v_new<coalesce(v_reserved,0) then
    raise exception 'Não é possível estornar: existem % unidade(s) reservadas',v_reserved;
  end if;

  insert into public.inventory_movements(
    product_id,location_id,flavor_id,movement_type,quantity_delta,
    notes,idempotency_key,created_by,created_at
  ) values(
    v_original.product_id,
    v_original.location_id,
    v_original.flavor_id,
    'adjustment',
    v_reversal_delta,
    'Estorno do acerto '||v_original.id::text||': '||left(btrim(p_reason),500),
    'app:inventory-adjustment-reversal:'||v_original.id::text,
    auth.uid(),
    now()
  ) returning id into v_reversal_id;

  if v_reversal_delta>0 then
    v_allocated:=public.allocate_available_stock_v2(
      v_original.product_id,
      v_original.location_id,
      v_original.flavor_id,
      'Estorno de acerto de estoque'
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'inventory_movement',
    v_reversal_id,
    'inventory_adjustment_reversed',
    jsonb_build_object(
      'original_movement_id',v_original.id,
      'product_id',v_original.product_id,
      'location_id',v_original.location_id,
      'flavor_id',v_original.flavor_id,
      'original_delta',v_original.quantity_delta,
      'reversal_delta',v_reversal_delta,
      'reason',left(btrim(p_reason),500),
      'previous_quantity',v_current,
      'new_quantity',v_new,
      'reservations_allocated',v_allocated
    )
  );

  return jsonb_build_object(
    'movement_id',v_reversal_id,
    'original_movement_id',v_original.id,
    'quantity_delta',v_reversal_delta,
    'new_quantity',v_new
  );
end;
$$;

revoke all
on function public.reverse_inventory_adjustment_v1(uuid,text)
from public,anon;

grant execute
on function public.reverse_inventory_adjustment_v1(uuid,text)
to authenticated,service_role;
