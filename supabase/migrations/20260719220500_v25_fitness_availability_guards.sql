-- V25 · Fitness — disponibilidade real respeita peças em consignação/prova.
-- Espelho do estado já aplicado diretamente no Supabase de produção.

create or replace function public.create_fitness_sale(
  p_customer_name text,
  p_customer_phone text,
  p_city text,
  p_quoted_on date,
  p_items jsonb,
  p_payment_mode text default 'receivable',
  p_paid_on date default null,
  p_payment_method text default null,
  p_payment_due_on date default null,
  p_delivered boolean default false,
  p_delivered_on date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item record;
  v_variant public.fitness_variants%rowtype;
  v_item_id uuid;
  v_physical integer;
  v_reserved integer;
  v_consigned integer;
  v_available integer;
  v_reserve integer;
  v_status text;
  v_total numeric;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para registrar vendas Fitness';
  end if;
  if nullif(btrim(p_customer_name),'') is null then
    raise exception 'Informe o cliente';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um item';
  end if;
  if p_payment_mode not in ('receivable','paid','combined') then
    raise exception 'Situação de pagamento inválida';
  end if;
  if p_payment_mode = 'paid' and (p_paid_on is null or nullif(btrim(p_payment_method),'') is null) then
    raise exception 'Informe data e forma de pagamento';
  end if;
  if p_payment_mode = 'combined' and p_payment_due_on is null then
    raise exception 'Informe a data combinada';
  end if;
  if p_delivered and p_delivered_on is null then
    raise exception 'Informe a data da entrega';
  end if;

  insert into public.fitness_sales(
    customer_name,customer_phone,city,quoted_on,payment_status,delivery_status,
    payment_method,payment_due_on,paid_on,delivered_on,notes
  )
  values(
    btrim(p_customer_name),
    nullif(btrim(p_customer_phone),''),
    nullif(btrim(p_city),''),
    coalesce(p_quoted_on,(now() at time zone 'America/Sao_Paulo')::date),
    case when p_payment_mode='paid' then 'received' else 'receivable' end,
    case when p_delivered then 'delivered' else 'to_deliver' end,
    case when p_payment_mode='paid' then p_payment_method else null end,
    case when p_payment_mode='combined' then p_payment_due_on else null end,
    case when p_payment_mode='paid' then p_paid_on else null end,
    case when p_delivered then p_delivered_on else null end,
    nullif(btrim(p_notes),'')
  )
  returning id into v_sale_id;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(variant_id uuid, quantity integer, unit_price numeric)
  loop
    if coalesce(v_item.quantity,0) <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select * into v_variant
    from public.fitness_variants
    where id = v_item.variant_id and active;

    if not found then
      raise exception 'Variação inválida ou inativa';
    end if;

    insert into public.fitness_sale_items(sale_id,variant_id,quantity,unit_cost,unit_price)
    values(v_sale_id,v_variant.id,v_item.quantity,v_variant.cost_price,coalesce(v_item.unit_price,v_variant.sale_price))
    returning id into v_item_id;

    insert into public.fitness_stock_balances(variant_id,quantity)
    values(v_variant.id,0)
    on conflict(variant_id) do nothing;

    select quantity into v_physical
    from public.fitness_stock_balances
    where variant_id=v_variant.id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer into v_reserved
    from public.fitness_stock_reservations
    where variant_id=v_variant.id
      and status in ('reserved','partial');

    select coalesce(sum(i.quantity_sent-i.quantity_returned-i.quantity_sold),0)::integer
    into v_consigned
    from public.fitness_consignment_items i
    join public.fitness_consignments c on c.id=i.consignment_id
    where i.variant_id=v_variant.id
      and c.status in ('open','partial');

    v_available := greatest(v_physical-v_reserved-v_consigned,0);

    if p_delivered then
      if v_available < v_item.quantity then
        raise exception 'Estoque insuficiente para entregar % / % / %. Disponível: %',
          (select name from public.fitness_products where id=v_variant.product_id),
          v_variant.size,v_variant.color,v_available;
      end if;

      insert into public.fitness_inventory_movements(
        variant_id,movement_type,quantity_delta,sale_id,notes,idempotency_key
      )
      values(
        v_variant.id,'sale',-v_item.quantity,v_sale_id,
        'Baixa automática na venda Fitness',
        'fitness:sale:'||v_sale_id||':'||v_item_id
      );
    else
      v_reserve := least(v_item.quantity,v_available);
      v_status := case
        when v_reserve=v_item.quantity then 'reserved'
        when v_reserve>0 then 'partial'
        else 'awaiting_stock'
      end;

      insert into public.fitness_stock_reservations(
        sale_id,sale_item_id,variant_id,quantity_requested,quantity_reserved,
        status,reserved_at,notes
      )
      values(
        v_sale_id,v_item_id,v_variant.id,v_item.quantity,v_reserve,v_status,
        case when v_reserve>0 then now() else null end,
        case when v_reserve<v_item.quantity then 'Aguardando estoque' else 'Reservado para a venda' end
      );
    end if;
  end loop;

  select total_amount into v_total
  from public.fitness_sales
  where id=v_sale_id;

  update public.fitness_sales
  set general_status=case
    when payment_status='received' and delivery_status='delivered' then 'finalized'
    else 'active'
  end
  where id=v_sale_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('fitness_sale',v_sale_id,'created',jsonb_build_object('total',v_total));

  return v_sale_id;
end;
$$;

create or replace function public.adjust_fitness_stock(
  p_variant_id uuid,
  p_new_quantity integer,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_delta integer;
  v_id uuid;
  v_committed integer;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para alterar o estoque Fitness';
  end if;
  if p_new_quantity < 0 then
    raise exception 'A quantidade não pode ser negativa';
  end if;

  select coalesce(reserved_quantity,0)+coalesce(consigned_quantity,0)
  into v_committed
  from public.fitness_stock_overview
  where variant_id=p_variant_id;

  if p_new_quantity < coalesce(v_committed,0) then
    raise exception 'O saldo físico não pode ficar abaixo das unidades reservadas ou em consignação (%)',
      v_committed;
  end if;

  insert into public.fitness_stock_balances(variant_id,quantity)
  values(p_variant_id,0)
  on conflict(variant_id) do nothing;

  select quantity into v_current
  from public.fitness_stock_balances
  where variant_id=p_variant_id
  for update;

  v_delta := p_new_quantity-v_current;
  if v_delta=0 then return null; end if;

  insert into public.fitness_inventory_movements(
    variant_id,movement_type,quantity_delta,notes,idempotency_key
  )
  values(
    p_variant_id,'adjustment',v_delta,nullif(btrim(p_notes),''),
    'fitness:adjust:'||gen_random_uuid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.convert_fitness_stock(
  p_source_variant_id uuid,
  p_source_quantity integer,
  p_targets jsonb,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := gen_random_uuid();
  v_target record;
  v_multiplier integer;
  v_available integer;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para converter estoque Fitness';
  end if;
  if p_source_quantity <= 0 then
    raise exception 'Quantidade inválida';
  end if;
  if p_targets is null or jsonb_typeof(p_targets)<>'array' or jsonb_array_length(p_targets)=0 then
    raise exception 'Adicione os itens gerados pela conversão';
  end if;

  select available_quantity into v_available
  from public.fitness_stock_overview
  where variant_id=p_source_variant_id;

  if coalesce(v_available,0) < p_source_quantity then
    raise exception 'Quantidade disponível insuficiente para conversão. Disponível: %',
      coalesce(v_available,0);
  end if;

  insert into public.fitness_inventory_movements(
    variant_id,movement_type,quantity_delta,transfer_group_id,notes,idempotency_key
  )
  values(
    p_source_variant_id,'conversion_out',-p_source_quantity,v_group,
    coalesce(nullif(btrim(p_notes),''),'Conversão de conjunto em peças'),
    'fitness:conversion-out:'||v_group
  );

  for v_target in
    select * from jsonb_to_recordset(p_targets)
      as x(variant_id uuid,quantity_per_source integer)
  loop
    v_multiplier := coalesce(v_target.quantity_per_source,0);
    if v_multiplier <= 0 then
      raise exception 'Quantidade de destino inválida';
    end if;

    insert into public.fitness_inventory_movements(
      variant_id,movement_type,quantity_delta,transfer_group_id,notes,idempotency_key
    )
    values(
      v_target.variant_id,'conversion_in',p_source_quantity*v_multiplier,v_group,
      coalesce(nullif(btrim(p_notes),''),'Conversão de conjunto em peças'),
      'fitness:conversion-in:'||v_group||':'||v_target.variant_id
    );
  end loop;

  return v_group;
end;
$$;
