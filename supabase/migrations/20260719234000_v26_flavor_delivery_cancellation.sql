-- Candinho Company V26
-- Entrega e cancelamento conscientes de sabor.
-- Definições espelhadas do estado final já aplicado no Supabase de produção.

create or replace function public.mark_sale_delivered(
  p_sale_id uuid,
  p_delivered_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_delivered_at timestamptz;
  v_item record;
  v_physical integer;
  v_other_reserved integer;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar entregas';
  end if;

  if p_delivered_on is null then
    raise exception 'Informe a data da entrega';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found or v_sale.record_type <> 'sale' then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    raise exception 'Venda cancelada não pode ser entregue';
  end if;

  if v_sale.delivery_status = 'delivered' then
    return p_sale_id;
  end if;

  v_delivered_at :=
    (p_delivered_on::timestamp + interval '12 hours')
    at time zone 'America/Sao_Paulo';

  if not v_sale.stock_deducted then
    -- Primeiro valida todos os itens. Nenhuma baixa ocorre antes
    -- de confirmar que a entrega inteira pode ser concluída.
    for v_item in
      select
        si.id as sale_item_id,
        si.product_id,
        si.flavor_id,
        si.quantity,
        p.name as product_name,
        p.flavor_tracking_enabled
      from public.sale_items si
      join public.products p on p.id = si.product_id
      where si.sale_id = p_sale_id
      order by si.id
    loop
      if v_item.flavor_tracking_enabled then
        if v_item.flavor_id is null then
          raise exception
            'A venda de % precisa ter o sabor classificado antes da entrega',
            v_item.product_name;
        end if;

        insert into public.product_flavor_stock_balances(
          flavor_id,
          location_id,
          quantity
        )
        values(
          v_item.flavor_id,
          v_sale.location_id,
          0
        )
        on conflict(flavor_id, location_id) do nothing;

        select quantity
        into v_physical
        from public.product_flavor_stock_balances
        where flavor_id = v_item.flavor_id
          and location_id = v_sale.location_id
        for update;

        select coalesce(sum(quantity_reserved), 0)::integer
        into v_other_reserved
        from public.stock_reservations
        where flavor_id = v_item.flavor_id
          and location_id = v_sale.location_id
          and sale_id <> p_sale_id
          and status in ('reserved', 'partial');
      else
        insert into public.stock_balances(
          product_id,
          location_id,
          quantity
        )
        values(
          v_item.product_id,
          v_sale.location_id,
          0
        )
        on conflict(product_id, location_id) do nothing;

        select quantity
        into v_physical
        from public.stock_balances
        where product_id = v_item.product_id
          and location_id = v_sale.location_id
        for update;

        select coalesce(sum(quantity_reserved), 0)::integer
        into v_other_reserved
        from public.stock_reservations
        where product_id = v_item.product_id
          and location_id = v_sale.location_id
          and sale_id <> p_sale_id
          and status in ('reserved', 'partial');
      end if;

      if coalesce(v_physical, 0) - coalesce(v_other_reserved, 0)
         < v_item.quantity
      then
        raise exception
          'Estoque insuficiente para entregar %. Disponível para esta venda: %',
          v_item.product_name,
          greatest(
            coalesce(v_physical, 0) - coalesce(v_other_reserved, 0),
            0
          );
      end if;
    end loop;

    -- Só depois da validação completa é feita a baixa real.
    for v_item in
      select
        si.id as sale_item_id,
        si.product_id,
        si.flavor_id,
        si.quantity
      from public.sale_items si
      where si.sale_id = p_sale_id
      order by si.id
    loop
      insert into public.inventory_movements(
        product_id,
        location_id,
        flavor_id,
        movement_type,
        quantity_delta,
        sale_id,
        notes,
        idempotency_key
      )
      values(
        v_item.product_id,
        v_sale.location_id,
        v_item.flavor_id,
        'sale',
        -v_item.quantity,
        p_sale_id,
        'Baixa automática na entrega da venda',
        'app:deliver-sale:'
          || p_sale_id::text
          || ':'
          || v_item.sale_item_id::text
      );

      update public.stock_reservations
      set status = 'fulfilled',
          quantity_reserved = quantity_requested,
          fulfilled_at = v_delivered_at,
          updated_at = now(),
          notes = 'Reserva consumida na entrega'
      where sale_item_id = v_item.sale_item_id;
    end loop;
  end if;

  update public.sales
  set delivery_status = 'delivered',
      delivered_at = v_delivered_at,
      stock_deducted = true,
      general_status = case
        when payment_status = 'received'
          then 'finalized'::public.sale_general_status
        else 'active'::public.sale_general_status
      end,
      updated_at = now()
  where id = p_sale_id;

  update public.deliveries
  set status = 'Entregue',
      delivered_at = v_delivered_at
  where sale_id = p_sale_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'sale',
    p_sale_id,
    'delivered',
    jsonb_build_object(
      'delivered_on', p_delivered_on,
      'previous_delivery_status', v_sale.delivery_status,
      'stock_deducted_now', not v_sale.stock_deducted,
      'flavor_aware', true
    )
  );

  return p_sale_id;
end;
$$;

create or replace function public.cancel_sale(
  p_sale_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_alloc record;
  v_allocated integer;
  v_product public.products%rowtype;
  v_released integer := 0;
  v_restored integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cancelar vendas';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and record_type = 'sale'
  for update;

  if not found then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    return v_sale.id;
  end if;

  -- Para venda histórica que já baixou estoque antes do controle por sabor,
  -- exige classificação completa antes de qualquer estorno.
  if v_sale.stock_deducted then
    for v_item in
      select
        si.id,
        si.product_id,
        si.flavor_id,
        si.quantity,
        p.name as product_name,
        p.flavor_tracking_enabled
      from public.sale_items si
      join public.products p on p.id = si.product_id
      where si.sale_id = p_sale_id
    loop
      if v_item.flavor_tracking_enabled
         and v_item.flavor_id is null
      then
        select coalesce(sum(quantity), 0)::integer
        into v_allocated
        from public.sale_item_flavor_allocations
        where sale_item_id = v_item.id;

        if v_allocated <> v_item.quantity then
          raise exception
            'Classifique os sabores históricos de % antes de cancelar esta venda. Classificado: % de % unidade(s)',
            v_item.product_name,
            v_allocated,
            v_item.quantity;
        end if;
      end if;
    end loop;

    if v_sale.gift_product_id is not null
       and coalesce(v_sale.gift_quantity, 0) > 0
    then
      select *
      into v_product
      from public.products
      where id = v_sale.gift_product_id;

      if v_product.flavor_tracking_enabled then
        raise exception
          'O brinde desta venda pertence a um produto que agora usa sabores. Faça um ajuste manual do sabor antes de cancelar a venda.';
      end if;
    end if;
  end if;

  if v_sale.stock_deducted then
    for v_item in
      select
        si.id,
        si.product_id,
        si.flavor_id,
        si.quantity,
        p.flavor_tracking_enabled
      from public.sale_items si
      join public.products p on p.id = si.product_id
      where si.sale_id = p_sale_id
      order by si.id
    loop
      if v_item.flavor_tracking_enabled
         and v_item.flavor_id is null
      then
        -- Venda histórica: devolve exatamente a composição classificada.
        for v_alloc in
          select flavor_id, quantity
          from public.sale_item_flavor_allocations
          where sale_item_id = v_item.id
          order by flavor_id
        loop
          insert into public.inventory_movements(
            product_id,
            location_id,
            flavor_id,
            movement_type,
            quantity_delta,
            sale_id,
            notes,
            idempotency_key
          )
          values(
            v_item.product_id,
            v_sale.location_id,
            v_alloc.flavor_id,
            'cancellation',
            v_alloc.quantity,
            v_sale.id,
            'Estorno histórico por sabor no cancelamento da venda '
              || v_sale.id,
            'cancel:'
              || v_sale.id
              || ':item:'
              || v_item.id
              || ':flavor:'
              || v_alloc.flavor_id
          )
          on conflict(idempotency_key) do nothing;

          v_restored := v_restored + v_alloc.quantity;
        end loop;
      else
        -- Venda nova: o próprio item já conhece o flavor_id.
        insert into public.inventory_movements(
          product_id,
          location_id,
          flavor_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_item.product_id,
          v_sale.location_id,
          v_item.flavor_id,
          'cancellation',
          v_item.quantity,
          v_sale.id,
          'Estorno do cancelamento da venda ' || v_sale.id,
          'cancel:'
            || v_sale.id
            || ':item:'
            || v_item.id
        )
        on conflict(idempotency_key) do nothing;

        v_restored := v_restored + v_item.quantity;
      end if;
    end loop;
  else
    update public.stock_reservations
    set status = 'released',
        quantity_reserved = 0,
        released_at = now(),
        updated_at = now(),
        notes = case
          when nullif(btrim(notes), '') is null
            then 'Reserva liberada por cancelamento da venda'
          else notes
            || ' | Reserva liberada por cancelamento da venda'
        end
    where sale_id = p_sale_id
      and status in (
        'reserved',
        'partial',
        'awaiting_stock'
      );

    get diagnostics v_released = row_count;
  end if;

  if v_sale.gift_product_id is not null
     and coalesce(v_sale.gift_quantity, 0) > 0
  then
    insert into public.inventory_movements(
      product_id,
      location_id,
      movement_type,
      quantity_delta,
      sale_id,
      notes,
      idempotency_key
    )
    values(
      v_sale.gift_product_id,
      v_sale.location_id,
      'cancellation',
      v_sale.gift_quantity,
      v_sale.id,
      'Estorno do brinde no cancelamento da venda '
        || v_sale.id,
      'cancel:'
        || v_sale.id
        || ':gift:'
        || v_sale.gift_product_id
    )
    on conflict(idempotency_key) do nothing;

    v_restored := v_restored + v_sale.gift_quantity;
  end if;

  update public.sales
  set general_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = nullif(btrim(p_reason), ''),
      stock_deducted = false,
      updated_at = now()
  where id = p_sale_id;

  update public.deliveries
  set status = case
    when status = 'Entregue'
      then status
    else 'Cancelado'
  end
  where sale_id = p_sale_id;

  update public.sales_quotes
  set status = 'cancelled',
      updated_at = now()
  where sale_id = p_sale_id
    and status = 'confirmed';

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'sale',
    p_sale_id,
    'cancelled',
    jsonb_build_object(
      'reason', p_reason,
      'stock_was_deducted', v_sale.stock_deducted,
      'restored_units', v_restored,
      'released_reservations', v_released,
      'gift_product_id', v_sale.gift_product_id,
      'flavor_aware', true
    )
  );

  return p_sale_id;
end;
$$;
