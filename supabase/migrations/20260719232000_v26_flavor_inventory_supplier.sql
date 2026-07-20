-- Candinho Company V26
-- Estoque, transferências e pedidos de fornecedor conscientes de sabor.
-- Já aplicado diretamente no Supabase de produção.

create or replace function public.allocate_available_stock_v2(
  p_product_id uuid,
  p_location_id uuid,
  p_flavor_id uuid default null,
  p_reason text default 'Reposição de estoque'
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enabled boolean;
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_res record;
  v_missing integer;
  v_allocate integer;
  v_total integer:=0;
begin
  select flavor_tracking_enabled
  into v_enabled
  from public.products
  where id=p_product_id;

  if not found then
    raise exception 'Produto não encontrado';
  end if;

  if v_enabled then
    if p_flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=p_flavor_id
           and product_id=p_product_id
           and active
       )
    then
      raise exception 'Informe um sabor válido para este produto';
    end if;

    insert into public.product_flavor_stock_balances(
      flavor_id,location_id,quantity
    )
    values(p_flavor_id,p_location_id,0)
    on conflict(flavor_id,location_id) do nothing;

    select quantity into v_physical
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where product_id=p_product_id
      and location_id=p_location_id
      and flavor_id=p_flavor_id
      and status in ('reserved','partial');
  else
    if p_flavor_id is not null then
      raise exception 'Este produto não usa controle por sabor';
    end if;

    insert into public.stock_balances(
      product_id,location_id,quantity
    )
    values(p_product_id,p_location_id,0)
    on conflict(product_id,location_id) do nothing;

    select quantity into v_physical
    from public.stock_balances
    where product_id=p_product_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where product_id=p_product_id
      and location_id=p_location_id
      and flavor_id is null
      and status in ('reserved','partial');
  end if;

  v_available:=greatest(
    coalesce(v_physical,0)-coalesce(v_reserved,0),
    0
  );

  for v_res in
    select sr.*
    from public.stock_reservations sr
    join public.sales s on s.id=sr.sale_id
    where sr.product_id=p_product_id
      and sr.location_id=p_location_id
      and sr.flavor_id is not distinct from p_flavor_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved<sr.quantity_requested
    order by s.quoted_at,sr.created_at,sr.id
    for update of sr
  loop
    exit when v_available<=0;

    v_missing:=v_res.quantity_requested-v_res.quantity_reserved;
    v_allocate:=least(v_missing,v_available);

    update public.stock_reservations
    set quantity_reserved=quantity_reserved+v_allocate,
        status=case
          when quantity_reserved+v_allocate>=quantity_requested
          then 'reserved'
          else 'partial'
        end,
        reserved_at=coalesce(reserved_at,now()),
        notes=case
          when quantity_reserved+v_allocate>=quantity_requested
          then p_reason||' · reserva completada'
          else p_reason||' · reserva parcial'
        end,
        updated_at=now()
    where id=v_res.id;

    v_available:=v_available-v_allocate;
    v_total:=v_total+v_allocate;
  end loop;

  return v_total;
end;
$$;

create or replace function public.register_inventory_adjustment_v2(
  p_product_id uuid,
  p_location_id uuid,
  p_flavor_id uuid default null,
  p_quantity_delta integer default 0,
  p_occurred_on date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_location public.locations%rowtype;
  v_current integer;
  v_reserved integer;
  v_new integer;
  v_occurred_at timestamptz;
  v_movement_id uuid;
  v_allocated integer:=0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para ajustar estoque';
  end if;

  if p_quantity_delta is null or p_quantity_delta=0 then
    raise exception 'Informe uma quantidade diferente de zero';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id
    and active;

  if not found then
    raise exception 'Produto não encontrado ou inativo';
  end if;

  select * into v_location
  from public.locations
  where id=p_location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Local de estoque inválido ou inativo';
  end if;

  if v_product.flavor_tracking_enabled then
    if p_flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=p_flavor_id
           and product_id=p_product_id
           and active
       )
    then
      raise exception 'Selecione o sabor';
    end if;

    insert into public.product_flavor_stock_balances(
      flavor_id,location_id,quantity
    )
    values(p_flavor_id,p_location_id,0)
    on conflict(flavor_id,location_id) do nothing;

    select quantity into v_current
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where flavor_id=p_flavor_id
      and location_id=p_location_id
      and status in ('reserved','partial');
  else
    if p_flavor_id is not null then
      raise exception 'Este produto não possui sabores';
    end if;

    insert into public.stock_balances(
      product_id,location_id,quantity
    )
    values(p_product_id,p_location_id,0)
    on conflict(product_id,location_id) do nothing;

    select quantity into v_current
    from public.stock_balances
    where product_id=p_product_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where product_id=p_product_id
      and location_id=p_location_id
      and flavor_id is null
      and status in ('reserved','partial');
  end if;

  v_new:=coalesce(v_current,0)+p_quantity_delta;

  if v_new<0 then
    raise exception 'O saldo do sabor/produto não pode ficar negativo';
  end if;

  if v_new<coalesce(v_reserved,0) then
    raise exception
      'O saldo não pode ficar abaixo das % unidade(s) reservadas',
      v_reserved;
  end if;

  v_occurred_at:=(
    (
      coalesce(
        p_occurred_on,
        (now() at time zone 'America/Sao_Paulo')::date
      )
    )::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(
    product_id,
    location_id,
    flavor_id,
    movement_type,
    quantity_delta,
    notes,
    idempotency_key,
    created_at
  )
  values(
    p_product_id,
    p_location_id,
    p_flavor_id,
    'adjustment',
    p_quantity_delta,
    nullif(btrim(p_notes),''),
    'app:inventory-adjustment-v2:'||gen_random_uuid()::text,
    v_occurred_at
  )
  returning id into v_movement_id;

  if p_quantity_delta>0 then
    v_allocated:=public.allocate_available_stock_v2(
      p_product_id,
      p_location_id,
      p_flavor_id,
      'Entrada manual de estoque'
    );
  end if;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'inventory_movement',
    v_movement_id,
    'manual_adjustment_v2',
    jsonb_build_object(
      'product_id',p_product_id,
      'location_id',p_location_id,
      'flavor_id',p_flavor_id,
      'previous_quantity',v_current,
      'quantity_delta',p_quantity_delta,
      'new_quantity',v_new,
      'reservations_allocated',v_allocated
    )
  );

  return jsonb_build_object(
    'movement_id',v_movement_id,
    'previous_quantity',v_current,
    'new_quantity',v_new,
    'reservations_allocated',v_allocated
  );
end;
$$;

create or replace function public.register_inventory_count_v2(
  p_product_id uuid,
  p_location_id uuid,
  p_flavor_id uuid default null,
  p_counted_quantity integer default 0,
  p_counted_on date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_current integer;
  v_reserved integer;
  v_delta integer;
  v_occurred_at timestamptz;
  v_movement_id uuid;
  v_allocated integer:=0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para contar estoque';
  end if;

  if p_counted_quantity is null or p_counted_quantity<0 then
    raise exception 'Informe uma contagem válida';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id
    and active;

  if not found then
    raise exception 'Produto não encontrado ou inativo';
  end if;

  if not exists(
    select 1
    from public.locations
    where id=p_location_id
      and active
      and tracks_inventory
  ) then
    raise exception 'Local de estoque inválido ou inativo';
  end if;

  if v_product.flavor_tracking_enabled then
    if p_flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=p_flavor_id
           and product_id=p_product_id
           and active
       )
    then
      raise exception 'Selecione o sabor';
    end if;

    insert into public.product_flavor_stock_balances(
      flavor_id,location_id,quantity
    )
    values(p_flavor_id,p_location_id,0)
    on conflict(flavor_id,location_id) do nothing;

    select quantity into v_current
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where flavor_id=p_flavor_id
      and location_id=p_location_id
      and status in ('reserved','partial');
  else
    if p_flavor_id is not null then
      raise exception 'Este produto não possui sabores';
    end if;

    insert into public.stock_balances(
      product_id,location_id,quantity
    )
    values(p_product_id,p_location_id,0)
    on conflict(product_id,location_id) do nothing;

    select quantity into v_current
    from public.stock_balances
    where product_id=p_product_id
      and location_id=p_location_id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where product_id=p_product_id
      and location_id=p_location_id
      and flavor_id is null
      and status in ('reserved','partial');
  end if;

  if p_counted_quantity<coalesce(v_reserved,0) then
    raise exception
      'A contagem não pode ficar abaixo das % unidade(s) reservadas',
      v_reserved;
  end if;

  v_delta:=p_counted_quantity-coalesce(v_current,0);

  v_occurred_at:=(
    (
      coalesce(
        p_counted_on,
        (now() at time zone 'America/Sao_Paulo')::date
      )
    )::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  if v_delta<>0 then
    insert into public.inventory_movements(
      product_id,
      location_id,
      flavor_id,
      movement_type,
      quantity_delta,
      notes,
      idempotency_key,
      created_at
    )
    values(
      p_product_id,
      p_location_id,
      p_flavor_id,
      'adjustment',
      v_delta,
      coalesce(
        nullif(btrim(p_notes),''),
        'Contagem física de estoque'
      ),
      'app:inventory-count-v2:'||gen_random_uuid()::text,
      v_occurred_at
    )
    returning id into v_movement_id;

    if v_delta>0 then
      v_allocated:=public.allocate_available_stock_v2(
        p_product_id,
        p_location_id,
        p_flavor_id,
        'Contagem física de estoque'
      );
    end if;
  end if;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'product',
    p_product_id,
    'inventory_counted_v2',
    jsonb_build_object(
      'location_id',p_location_id,
      'flavor_id',p_flavor_id,
      'previous_quantity',v_current,
      'counted_quantity',p_counted_quantity,
      'quantity_delta',v_delta,
      'movement_id',v_movement_id,
      'reservations_allocated',v_allocated
    )
  );

  return jsonb_build_object(
    'movement_id',v_movement_id,
    'previous_quantity',v_current,
    'counted_quantity',p_counted_quantity,
    'quantity_delta',v_delta,
    'reservations_allocated',v_allocated
  );
end;
$$;

create or replace function public.transfer_inventory_v2(
  p_product_id uuid,
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_flavor_id uuid default null,
  p_quantity integer default 0,
  p_transferred_on date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_source public.locations%rowtype;
  v_destination public.locations%rowtype;
  v_source_physical integer;
  v_source_reserved integer;
  v_source_available integer;
  v_group_id uuid:=gen_random_uuid();
  v_occurred_at timestamptz;
  v_allocated integer:=0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para transferir estoque';
  end if;

  if p_quantity is null or p_quantity<=0 then
    raise exception 'Informe uma quantidade maior que zero';
  end if;

  if p_source_location_id=p_destination_location_id then
    raise exception 'Origem e destino precisam ser diferentes';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id
    and active;

  if not found then
    raise exception 'Produto não encontrado ou inativo';
  end if;

  select * into v_source
  from public.locations
  where id=p_source_location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Estoque de origem inválido ou inativo';
  end if;

  select * into v_destination
  from public.locations
  where id=p_destination_location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Estoque de destino inválido ou inativo';
  end if;

  if v_product.flavor_tracking_enabled then
    if p_flavor_id is null
       or not exists(
         select 1
         from public.product_flavors
         where id=p_flavor_id
           and product_id=p_product_id
           and active
       )
    then
      raise exception 'Selecione o sabor';
    end if;

    insert into public.product_flavor_stock_balances(
      flavor_id,location_id,quantity
    )
    values
      (p_flavor_id,p_source_location_id,0),
      (p_flavor_id,p_destination_location_id,0)
    on conflict(flavor_id,location_id) do nothing;

    perform 1
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id in (
        p_source_location_id,
        p_destination_location_id
      )
    order by location_id
    for update;

    select quantity into v_source_physical
    from public.product_flavor_stock_balances
    where flavor_id=p_flavor_id
      and location_id=p_source_location_id;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_source_reserved
    from public.stock_reservations
    where flavor_id=p_flavor_id
      and location_id=p_source_location_id
      and status in ('reserved','partial');
  else
    if p_flavor_id is not null then
      raise exception 'Este produto não possui sabores';
    end if;

    insert into public.stock_balances(
      product_id,location_id,quantity
    )
    values
      (p_product_id,p_source_location_id,0),
      (p_product_id,p_destination_location_id,0)
    on conflict(product_id,location_id) do nothing;

    perform 1
    from public.stock_balances
    where product_id=p_product_id
      and location_id in (
        p_source_location_id,
        p_destination_location_id
      )
    order by location_id
    for update;

    select quantity into v_source_physical
    from public.stock_balances
    where product_id=p_product_id
      and location_id=p_source_location_id;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_source_reserved
    from public.stock_reservations
    where product_id=p_product_id
      and location_id=p_source_location_id
      and flavor_id is null
      and status in ('reserved','partial');
  end if;

  v_source_available:=greatest(
    coalesce(v_source_physical,0)-coalesce(v_source_reserved,0),
    0
  );

  if v_source_available<p_quantity then
    raise exception
      'Estoque disponível insuficiente em %. Disponível: %',
      v_source.code,
      v_source_available;
  end if;

  v_occurred_at:=(
    (
      coalesce(
        p_transferred_on,
        (now() at time zone 'America/Sao_Paulo')::date
      )
    )::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(
    product_id,location_id,flavor_id,movement_type,
    quantity_delta,transfer_group_id,notes,idempotency_key,created_at
  )
  values(
    p_product_id,
    p_source_location_id,
    p_flavor_id,
    'transfer_out',
    -p_quantity,
    v_group_id,
    coalesce(
      nullif(btrim(p_notes),''),
      'Transferência para '||v_destination.code
    ),
    'app:inventory-transfer-v2-out:'||v_group_id::text,
    v_occurred_at
  );

  insert into public.inventory_movements(
    product_id,location_id,flavor_id,movement_type,
    quantity_delta,transfer_group_id,notes,idempotency_key,created_at
  )
  values(
    p_product_id,
    p_destination_location_id,
    p_flavor_id,
    'transfer_in',
    p_quantity,
    v_group_id,
    coalesce(
      nullif(btrim(p_notes),''),
      'Transferência de '||v_source.code
    ),
    'app:inventory-transfer-v2-in:'||v_group_id::text,
    v_occurred_at
  );

  v_allocated:=public.allocate_available_stock_v2(
    p_product_id,
    p_destination_location_id,
    p_flavor_id,
    'Transferência recebida'
  );

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'product',
    p_product_id,
    'inventory_transferred_v2',
    jsonb_build_object(
      'transfer_group_id',v_group_id,
      'flavor_id',p_flavor_id,
      'source_location_id',p_source_location_id,
      'destination_location_id',p_destination_location_id,
      'quantity',p_quantity,
      'reservations_allocated',v_allocated
    )
  );

  return jsonb_build_object(
    'transfer_group_id',v_group_id,
    'quantity',p_quantity,
    'flavor_id',p_flavor_id,
    'reservations_allocated',v_allocated
  );
end;
$$;

revoke all
on function public.allocate_available_stock_v2(uuid,uuid,uuid,text)
from public,anon,authenticated;

revoke all
on function public.register_inventory_adjustment_v2(
  uuid,uuid,uuid,integer,date,text
)
from public,anon;

revoke all
on function public.register_inventory_count_v2(
  uuid,uuid,uuid,integer,date,text
)
from public,anon;

revoke all
on function public.transfer_inventory_v2(
  uuid,uuid,uuid,uuid,integer,date,text
)
from public,anon;

grant execute
on function public.register_inventory_adjustment_v2(
  uuid,uuid,uuid,integer,date,text
)
to authenticated,service_role;

grant execute
on function public.register_inventory_count_v2(
  uuid,uuid,uuid,integer,date,text
)
to authenticated,service_role;

grant execute
on function public.transfer_inventory_v2(
  uuid,uuid,uuid,uuid,integer,date,text
)
to authenticated,service_role;

-- Pedido de fornecedor passa a registrar sabor por item.
create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_ordered_on date,
  p_destination_location_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order_id uuid;
  v_item record;
  v_supplier public.suppliers%rowtype;
  v_location public.locations%rowtype;
  v_product public.products%rowtype;
  v_ordered_on date:=
    coalesce(
      p_ordered_on,
      (now() at time zone 'America/Sao_Paulo')::date
    );
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para criar pedidos';
  end if;

  if p_items is null
     or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)=0
  then
    raise exception 'Adicione pelo menos um produto ao pedido';
  end if;

  if jsonb_array_length(p_items)>50 then
    raise exception 'O pedido pode ter no máximo 50 itens';
  end if;

  if exists(
    select 1
    from jsonb_to_recordset(p_items)
      as x(
        product_id uuid,
        flavor_id uuid,
        quantity integer,
        unit_cost numeric,
        notes text
      )
    group by product_id,flavor_id
    having count(*)>1
  ) then
    raise exception
      'O mesmo produto e sabor foram adicionados mais de uma vez';
  end if;

  select * into v_supplier
  from public.suppliers
  where id=p_supplier_id
    and active;

  if not found then
    raise exception 'Fornecedor inválido ou inativo';
  end if;

  select * into v_location
  from public.locations
  where id=p_destination_location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Estoque de destino inválido';
  end if;

  insert into public.purchase_orders(
    supplier_id,ordered_on,destination_location_id,notes
  )
  values(
    v_supplier.id,
    v_ordered_on,
    v_location.id,
    nullif(btrim(p_notes),'')
  )
  returning id into v_order_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items)
      as x(
        product_id uuid,
        flavor_id uuid,
        quantity integer,
        unit_cost numeric,
        notes text
      )
  loop
    if v_item.quantity is null or v_item.quantity<=0 then
      raise exception 'Quantidade inválida';
    end if;

    if v_item.unit_cost is null or v_item.unit_cost<0 then
      raise exception 'Custo inválido';
    end if;

    select * into v_product
    from public.products
    where id=v_item.product_id
      and active;

    if not found then
      raise exception 'Produto inválido ou inativo';
    end if;

    if v_product.flavor_tracking_enabled then
      if v_item.flavor_id is null
         or not exists(
           select 1
           from public.product_flavors
           where id=v_item.flavor_id
             and product_id=v_product.id
             and active
         )
      then
        raise exception 'Selecione o sabor de %',v_product.name;
      end if;
    elsif v_item.flavor_id is not null then
      raise exception
        'O produto % não possui controle por sabor',
        v_product.name;
    end if;

    insert into public.purchase_order_items(
      purchase_order_id,
      product_id,
      flavor_id,
      quantity_ordered,
      unit_cost,
      notes
    )
    values(
      v_order_id,
      v_product.id,
      v_item.flavor_id,
      v_item.quantity,
      v_item.unit_cost,
      nullif(btrim(v_item.notes),'')
    );
  end loop;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'purchase_order',
    v_order_id,
    'created',
    jsonb_build_object(
      'supplier_id',v_supplier.id,
      'ordered_on',v_ordered_on,
      'destination_location_id',v_location.id,
      'item_count',jsonb_array_length(p_items),
      'flavor_aware',true
    )
  );

  return v_order_id;
end;
$$;

create or replace function public.receive_purchase_order_item(
  p_item_id uuid,
  p_quantity integer,
  p_received_on date,
  p_unit_cost numeric,
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
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para receber pedidos';
  end if;

  if p_quantity is null or p_quantity<=0 then
    raise exception 'Informe uma quantidade maior que zero';
  end if;

  if p_received_on is null then
    raise exception 'Informe a data do recebimento';
  end if;

  if p_unit_cost is null or p_unit_cost<0 then
    raise exception 'Informe um custo válido';
  end if;

  select * into v_item
  from public.purchase_order_items
  where id=p_item_id
  for update;

  if not found then
    raise exception 'Item do pedido não encontrado';
  end if;

  select * into v_order
  from public.purchase_orders
  where id=v_item.purchase_order_id
  for update;

  if v_order.status='cancelled' then
    raise exception 'Pedido cancelado não pode ser recebido';
  end if;

  v_remaining:=v_item.quantity_ordered-v_item.quantity_received;

  if v_remaining<=0 then
    raise exception 'Este item já foi totalmente recebido';
  end if;

  if p_quantity>v_remaining then
    raise exception
      'Quantidade maior que o saldo pendente (%)',
      v_remaining;
  end if;

  select * into v_product
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
    raise exception 'Este produto não utiliza sabores';
  end if;

  v_received_at:=(
    p_received_on::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  insert into public.inventory_movements(
    product_id,
    location_id,
    flavor_id,
    movement_type,
    quantity_delta,
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
    'Recebimento do pedido de fornecedor '||v_order.id::text,
    'app:purchase-receipt:'||v_receipt_id::text,
    v_received_at
  )
  returning id into v_movement_id;

  insert into public.purchase_receipts(
    id,
    purchase_order_item_id,
    flavor_id,
    quantity_received,
    unit_cost,
    received_on,
    inventory_movement_id,
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
    nullif(btrim(p_notes),''),
    v_received_at
  );

  update public.purchase_order_items
  set quantity_received=quantity_received+p_quantity,
      unit_cost=p_unit_cost,
      updated_at=now()
  where id=v_item.id;

  update public.products
  set cost_price=p_unit_cost,
      updated_at=now()
  where id=v_item.product_id;

  v_allocated_total:=public.allocate_available_stock_v2(
    v_item.product_id,
    v_order.destination_location_id,
    v_item.flavor_id,
    'Recebimento do fornecedor'
  );

  select case
    when bool_and(quantity_received>=quantity_ordered)
      then 'received'
    when bool_or(quantity_received>0)
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
    entity_type,entity_id,action,details
  )
  values(
    'purchase_order_item',
    v_item.id,
    'received',
    jsonb_build_object(
      'purchase_order_id',v_order.id,
      'flavor_id',v_item.flavor_id,
      'quantity',p_quantity,
      'received_on',p_received_on,
      'unit_cost',p_unit_cost,
      'inventory_movement_id',v_movement_id,
      'reservations_allocated',v_allocated_total,
      'order_status',v_new_status
    )
  );

  return jsonb_build_object(
    'purchase_order_id',v_order.id,
    'item_id',v_item.id,
    'flavor_id',v_item.flavor_id,
    'quantity_received',p_quantity,
    'quantity_remaining',v_remaining-p_quantity,
    'reservations_allocated',v_allocated_total,
    'order_status',v_new_status
  );
end;
$$;

-- Mantém todas as colunas antigas e acrescenta sabor no final.
create or replace view public.supplier_order_items_overview
with (security_invoker=true)
as
select
  poi.id,
  poi.purchase_order_id,
  poi.product_id,
  p.name as product_name,
  p.image_url as product_image_url,
  p.category,
  p.brand,
  poi.quantity_ordered,
  poi.quantity_received,
  (poi.quantity_ordered-poi.quantity_received)::integer
    as quantity_pending,
  poi.unit_cost,
  (poi.quantity_ordered*poi.unit_cost)::numeric(12,2)
    as total_cost,
  case
    when poi.quantity_received=0 then 'pending'
    when poi.quantity_received<poi.quantity_ordered then 'partial'
    else 'received'
  end as item_status,
  poi.notes,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  coalesce((
    select sum(
      sr.quantity_requested-sr.quantity_reserved
    )::integer
    from public.stock_reservations sr
    where sr.product_id=poi.product_id
      and sr.location_id=po.destination_location_id
      and sr.flavor_id is not distinct from poi.flavor_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved<sr.quantity_requested
  ),0) as waiting_sales_units,
  coalesce((
    select count(*)::integer
    from public.stock_reservations sr
    where sr.product_id=poi.product_id
      and sr.location_id=po.destination_location_id
      and sr.flavor_id is not distinct from poi.flavor_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved<sr.quantity_requested
  ),0) as waiting_sales_count,
  poi.created_at,
  poi.updated_at,
  poi.flavor_id,
  pf.name as flavor_name
from public.purchase_order_items poi
join public.purchase_orders po on po.id=poi.purchase_order_id
join public.products p on p.id=poi.product_id
left join public.product_flavors pf on pf.id=poi.flavor_id
join public.locations l on l.id=po.destination_location_id;

grant select on public.supplier_order_items_overview
to authenticated,service_role;

create or replace view public.supplier_order_summary
with (security_invoker=true)
as
select
  po.id,
  po.supplier_id,
  s.name as supplier_name,
  po.ordered_on,
  po.destination_location_id,
  l.code as destination_code,
  l.name as destination_name,
  po.status,
  po.notes,
  po.legacy_supplier_order_id,
  count(poi.id)::integer as item_count,
  coalesce(sum(poi.quantity_ordered),0)::integer as ordered_units,
  coalesce(sum(poi.quantity_received),0)::integer as received_units,
  coalesce(
    sum(poi.quantity_ordered-poi.quantity_received),
    0
  )::integer as pending_units,
  coalesce(
    sum(poi.quantity_ordered*poi.unit_cost),
    0
  )::numeric(12,2) as order_total,
  string_agg(
    p.name
    ||case when pf.name is not null
      then ' · '||pf.name
      else ''
    end
    ||' ×'||poi.quantity_ordered::text,
    ', '
    order by p.name,coalesce(pf.name,'')
  ) as product_summary,
  coalesce(sum((
    select count(*)
    from public.stock_reservations sr
    where sr.product_id=poi.product_id
      and sr.location_id=po.destination_location_id
      and sr.flavor_id is not distinct from poi.flavor_id
      and sr.status in ('awaiting_stock','partial')
      and sr.quantity_reserved<sr.quantity_requested
  )),0)::integer as waiting_sales_count,
  po.created_at,
  po.updated_at
from public.purchase_orders po
join public.suppliers s on s.id=po.supplier_id
join public.locations l on l.id=po.destination_location_id
left join public.purchase_order_items poi
  on poi.purchase_order_id=po.id
left join public.products p on p.id=poi.product_id
left join public.product_flavors pf on pf.id=poi.flavor_id
group by po.id,s.name,l.code,l.name;

grant select on public.supplier_order_summary
to authenticated,service_role;

-- Views de estoque mantêm compatibilidade e acrescentam sabor no final.
create or replace view public.inventory_product_reservations
with (security_invoker=true)
as
select
  sr.id,
  sr.product_id,
  sr.location_id,
  l.code as location_code,
  l.name as location_name,
  sr.sale_id,
  s.customer_id,
  coalesce(c.name,'Cliente não informado') as customer_name,
  (s.quoted_at at time zone 'UTC')::date as sale_date,
  sr.quantity_requested,
  sr.quantity_reserved,
  greatest(
    sr.quantity_requested-sr.quantity_reserved,
    0
  )::integer as quantity_missing,
  sr.status,
  sr.reserved_at,
  sr.fulfilled_at,
  sr.notes,
  sr.flavor_id,
  pf.name as flavor_name
from public.stock_reservations sr
join public.sales s on s.id=sr.sale_id
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=sr.location_id
left join public.product_flavors pf on pf.id=sr.flavor_id;

grant select on public.inventory_product_reservations
to authenticated,service_role;

create or replace view public.inventory_movement_history
with (security_invoker=true)
as
select
  im.id,
  im.product_id,
  p.name as product_name,
  im.location_id,
  l.code as location_code,
  l.name as location_name,
  im.movement_type,
  im.quantity_delta,
  im.sale_id,
  s.customer_id,
  c.name as customer_name,
  im.transfer_group_id,
  counterpart.location_code as counterpart_location_code,
  counterpart.location_name as counterpart_location_name,
  im.notes,
  im.created_at as occurred_at,
  im.created_by,
  im.flavor_id,
  pf.name as flavor_name
from public.inventory_movements im
join public.products p on p.id=im.product_id
join public.locations l on l.id=im.location_id
left join public.sales s on s.id=im.sale_id
left join public.customers c on c.id=s.customer_id
left join public.product_flavors pf on pf.id=im.flavor_id
left join lateral (
  select
    l2.code as location_code,
    l2.name as location_name
  from public.inventory_movements im2
  join public.locations l2 on l2.id=im2.location_id
  where im.transfer_group_id is not null
    and im2.transfer_group_id=im.transfer_group_id
    and im2.id<>im.id
  order by im2.created_at,im2.id
  limit 1
) counterpart on true;

grant select on public.inventory_movement_history
to authenticated,service_role;
