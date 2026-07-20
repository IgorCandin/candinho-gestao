-- Candinho Company V29
-- Recebimento de fornecedor com lote e validade.
-- Já aplicado diretamente no Supabase de produção.

create or replace function
public.receive_purchase_order_item_v2(
  p_item_id uuid,
  p_quantity integer,
  p_received_on date,
  p_unit_cost numeric,
  p_lot_number text default null,
  p_expires_on date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.purchase_order_items%rowtype;
  v_order public.purchase_orders%rowtype;
  v_product public.products%rowtype;
  v_remaining integer;
  v_received_at timestamptz;
  v_movement_id uuid;
  v_receipt_id uuid:=gen_random_uuid();
  v_allocated_total integer:=0;
  v_new_status text;
  v_lot_id uuid;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para receber pedidos';
  end if;

  if p_quantity is null
     or p_quantity<=0
  then
    raise exception
      'Informe uma quantidade maior que zero';
  end if;

  if p_received_on is null then
    raise exception
      'Informe a data do recebimento';
  end if;

  if p_unit_cost is null
     or p_unit_cost<0
  then
    raise exception
      'Informe um custo válido';
  end if;

  select *
  into v_item
  from public.purchase_order_items
  where id=p_item_id
  for update;

  if not found then
    raise exception
      'Item do pedido não encontrado';
  end if;

  select *
  into v_order
  from public.purchase_orders
  where id=v_item.purchase_order_id
  for update;

  if v_order.status='cancelled' then
    raise exception
      'Pedido cancelado não pode ser recebido';
  end if;

  v_remaining:=
    v_item.quantity_ordered
    -v_item.quantity_received;

  if v_remaining<=0 then
    raise exception
      'Este item já foi totalmente recebido';
  end if;

  if p_quantity>v_remaining then
    raise exception
      'Quantidade maior que o saldo pendente (%)',
      v_remaining;
  end if;

  select *
  into v_product
  from public.products
  where id=v_item.product_id
  for update;

  if v_product.flavor_tracking_enabled then
    if v_item.flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=v_item.flavor_id
           and product_id=v_item.product_id
           and active
       )
    then
      raise exception
        'O item do pedido precisa ter um sabor válido antes do recebimento';
    end if;
  elsif v_item.flavor_id is not null then
    raise exception
      'Este produto não utiliza sabores';
  end if;

  if v_product.lot_tracking_enabled then
    if nullif(
      btrim(p_lot_number),
      ''
    ) is null
    then
      raise exception
        'Informe o lote recebido';
    end if;

    if p_expires_on is null then
      raise exception
        'Informe a validade do lote';
    end if;
  end if;

  if p_expires_on is not null
     and p_expires_on<p_received_on
  then
    raise exception
      'A validade não pode ser anterior à data de recebimento';
  end if;

  v_received_at:=
    (
      p_received_on::timestamp
      +interval '12 hours'
    )
    at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(
    product_id,
    location_id,
    flavor_id,
    movement_type,
    quantity_delta,
    lot_number,
    expires_on,
    notes,
    idempotency_key,
    created_at
  )
  values(
    v_item.product_id,
    v_order.destination_location_id,
    v_item.flavor_id,
    'purchase',
    p_quantity,
    nullif(
      btrim(p_lot_number),
      ''
    ),
    p_expires_on,
    'Recebimento do pedido de fornecedor '
      ||v_order.id::text,
    'app:purchase-receipt-v2:'
      ||v_receipt_id::text,
    v_received_at
  )
  returning id
  into v_movement_id;

  insert into public.purchase_receipts(
    id,
    purchase_order_item_id,
    flavor_id,
    quantity_received,
    unit_cost,
    received_on,
    inventory_movement_id,
    lot_number,
    expires_on,
    notes,
    created_at
  )
  values(
    v_receipt_id,
    v_item.id,
    v_item.flavor_id,
    p_quantity,
    p_unit_cost,
    p_received_on,
    v_movement_id,
    nullif(
      btrim(p_lot_number),
      ''
    ),
    p_expires_on,
    nullif(
      btrim(p_notes),
      ''
    ),
    v_received_at
  );

  if nullif(
    btrim(p_lot_number),
    ''
  ) is not null
  then
    select id
    into v_lot_id
    from public.inventory_lots
    where product_id=v_item.product_id
      and location_id=
        v_order.destination_location_id
      and flavor_id
        is not distinct from v_item.flavor_id
      and lower(lot_number)=
        lower(btrim(p_lot_number))
      and expires_on
        is not distinct from p_expires_on
    limit 1;

    if v_lot_id is not null then
      update public.inventory_lots
      set received_on=
            coalesce(
              received_on,
              p_received_on
            ),
          unit_cost=p_unit_cost,
          supplier_id=
            coalesce(
              supplier_id,
              v_order.supplier_id
            ),
          notes=
            coalesce(
              nullif(
                btrim(p_notes),
                ''
              ),
              notes
            ),
          updated_at=now()
      where id=v_lot_id;
    end if;
  end if;

  update public.purchase_order_items
  set quantity_received=
        quantity_received+p_quantity,
      unit_cost=p_unit_cost,
      updated_at=now()
  where id=v_item.id;

  update public.products
  set cost_price=p_unit_cost,
      updated_at=now()
  where id=v_item.product_id;

  v_allocated_total:=
    public.allocate_available_stock_v2(
      v_item.product_id,
      v_order.destination_location_id,
      v_item.flavor_id,
      'Recebimento do fornecedor'
    );

  select case
    when bool_and(
      quantity_received>=quantity_ordered
    )
      then 'received'
    when bool_or(
      quantity_received>0
    )
      then 'partial'
    else 'pending'
  end
  into v_new_status
  from public.purchase_order_items
  where purchase_order_id=v_order.id;

  update public.purchase_orders
  set status=v_new_status,
      updated_at=now()
  where id=v_order.id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'purchase_order_item',
    v_item.id,
    'received_v2',
    jsonb_build_object(
      'purchase_order_id',
        v_order.id,
      'flavor_id',
        v_item.flavor_id,
      'quantity',
        p_quantity,
      'received_on',
        p_received_on,
      'unit_cost',
        p_unit_cost,
      'inventory_movement_id',
        v_movement_id,
      'lot_number',
        nullif(
          btrim(p_lot_number),
          ''
        ),
      'expires_on',
        p_expires_on,
      'reservations_allocated',
        v_allocated_total,
      'order_status',
        v_new_status
    )
  );

  return jsonb_build_object(
    'purchase_order_id',
      v_order.id,
    'item_id',
      v_item.id,
    'flavor_id',
      v_item.flavor_id,
    'quantity_received',
      p_quantity,
    'quantity_remaining',
      v_remaining-p_quantity,
    'lot_id',
      v_lot_id,
    'lot_number',
      nullif(
        btrim(p_lot_number),
        ''
      ),
    'expires_on',
      p_expires_on,
    'reservations_allocated',
      v_allocated_total,
    'order_status',
      v_new_status
  );
end;
$$;

revoke all
on function public.receive_purchase_order_item_v2(
  uuid,
  integer,
  date,
  numeric,
  text,
  date,
  text
)
from public,anon;

grant execute
on function public.receive_purchase_order_item_v2(
  uuid,
  integer,
  date,
  numeric,
  text,
  date,
  text
)
to authenticated,service_role;
