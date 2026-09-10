alter table public.sale_items
  add column if not exists delivered_quantity integer not null default 0,
  add column if not exists last_delivered_at timestamptz;

alter table public.sale_items drop constraint if exists sale_items_delivered_quantity_check;
alter table public.sale_items add constraint sale_items_delivered_quantity_check
  check (delivered_quantity >= 0 and delivered_quantity <= quantity);

update public.sale_items si
set delivered_quantity=si.quantity,
    last_delivered_at=s.delivered_at
from public.sales s
where s.id=si.sale_id and s.delivery_status='delivered' and si.delivered_quantity=0;

create or replace function public.mark_sale_items_delivered_v1(
  p_sale_id uuid,
  p_delivered_on date,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_request record;
  v_delivered_at timestamptz;
  v_qty integer;
  v_physical integer;
  v_other_reserved integer;
  v_all_delivered boolean;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para alterar entregas'; end if;
  if p_delivered_on is null then raise exception 'Informe a data da entrega'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Escolha ao menos um produto para entregar';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or v_sale.record_type <> 'sale' then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status = 'cancelled' then raise exception 'Venda cancelada não pode ser entregue'; end if;
  v_delivered_at := (p_delivered_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  for v_request in
    select (value->>'item_id')::uuid item_id, (value->>'quantity')::integer quantity
    from jsonb_array_elements(p_items)
  loop
    v_qty := v_request.quantity;
    if coalesce(v_qty, 0) <= 0 then continue; end if;

    select si.id sale_item_id, si.product_id, si.flavor_id, si.quantity,
           si.delivered_quantity, p.name product_name, p.flavor_tracking_enabled
      into v_item
    from public.sale_items si join public.products p on p.id = si.product_id
    where si.id = v_request.item_id and si.sale_id = p_sale_id
    for update of si;
    if not found then raise exception 'Item de venda inválido'; end if;
    if v_item.delivered_quantity + v_qty > v_item.quantity then
      raise exception 'Quantidade de entrega maior que a pendência de %', v_item.product_name;
    end if;

    if v_item.flavor_tracking_enabled then
      if v_item.flavor_id is null then raise exception 'A venda de % precisa ter o sabor classificado antes da entrega', v_item.product_name; end if;
      insert into public.product_flavor_stock_balances(flavor_id,location_id,quantity)
      values(v_item.flavor_id,v_sale.location_id,0) on conflict(flavor_id,location_id) do nothing;
      select quantity into v_physical from public.product_flavor_stock_balances where flavor_id=v_item.flavor_id and location_id=v_sale.location_id for update;
      select coalesce(sum(quantity_reserved),0)::integer into v_other_reserved from public.stock_reservations
      where flavor_id=v_item.flavor_id and location_id=v_sale.location_id and sale_id<>p_sale_id and status in ('reserved','partial');
    else
      insert into public.stock_balances(product_id,location_id,quantity)
      values(v_item.product_id,v_sale.location_id,0) on conflict(product_id,location_id) do nothing;
      select quantity into v_physical from public.stock_balances where product_id=v_item.product_id and location_id=v_sale.location_id for update;
      select coalesce(sum(quantity_reserved),0)::integer into v_other_reserved from public.stock_reservations
      where product_id=v_item.product_id and location_id=v_sale.location_id and sale_id<>p_sale_id and status in ('reserved','partial');
    end if;
    if coalesce(v_physical,0)-coalesce(v_other_reserved,0) < v_qty then
      raise exception 'Estoque insuficiente para entregar %. Disponível: %',v_item.product_name,greatest(coalesce(v_physical,0)-coalesce(v_other_reserved,0),0);
    end if;

    insert into public.inventory_movements(product_id,location_id,flavor_id,movement_type,quantity_delta,sale_id,notes,idempotency_key)
    values(v_item.product_id,v_sale.location_id,v_item.flavor_id,'sale',-v_qty,p_sale_id,
      'Baixa por entrega parcial do item',
      'app:deliver-item:'||p_sale_id::text||':'||v_item.sale_item_id::text||':'||(v_item.delivered_quantity+v_qty)::text);

    update public.sale_items set delivered_quantity=delivered_quantity+v_qty,last_delivered_at=v_delivered_at where id=v_item.sale_item_id;
    update public.stock_reservations
      set quantity_reserved=greatest(quantity_requested-(v_item.delivered_quantity+v_qty),0),
          status=case when v_item.delivered_quantity+v_qty>=quantity_requested then 'fulfilled' else 'partial' end,
          fulfilled_at=case when v_item.delivered_quantity+v_qty>=quantity_requested then v_delivered_at else null end,
          updated_at=now(),notes='Reserva atualizada por entrega por item'
      where sale_item_id=v_item.sale_item_id;
  end loop;

  select bool_and(delivered_quantity >= quantity) into v_all_delivered from public.sale_items where sale_id=p_sale_id;
  update public.sales set
    delivery_status=case when v_all_delivered then 'delivered'::public.delivery_status else 'to_deliver'::public.delivery_status end,
    delivered_at=case when v_all_delivered then v_delivered_at else delivered_at end,
    stock_deducted=v_all_delivered,
    general_status=case when v_all_delivered and payment_status='received' then 'finalized'::public.sale_general_status else 'active'::public.sale_general_status end,
    updated_at=now()
  where id=p_sale_id;
  update public.deliveries set status=case when v_all_delivered then 'Entregue' else 'Parcial' end,
    delivered_at=case when v_all_delivered then v_delivered_at else delivered_at end where sale_id=p_sale_id;
  insert into public.audit_events(entity_type,entity_id,action,details) values
    ('sale',p_sale_id,case when v_all_delivered then 'delivered' else 'partially_delivered' end,
     jsonb_build_object('delivered_on',p_delivered_on,'items',p_items,'all_delivered',v_all_delivered));
  return p_sale_id;
end;
$$;

create or replace function public.mark_sale_delivered(p_sale_id uuid,p_delivered_on date)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_items jsonb;
begin
  select jsonb_agg(jsonb_build_object('item_id',id,'quantity',quantity-delivered_quantity))
    into v_items from public.sale_items where sale_id=p_sale_id and delivered_quantity<quantity;
  if v_items is null then return p_sale_id; end if;
  return public.mark_sale_items_delivered_v1(p_sale_id,p_delivered_on,v_items);
end;
$$;

revoke execute on function public.mark_sale_items_delivered_v1(uuid,date,jsonb) from public,anon;
grant execute on function public.mark_sale_items_delivered_v1(uuid,date,jsonb) to authenticated,service_role;
