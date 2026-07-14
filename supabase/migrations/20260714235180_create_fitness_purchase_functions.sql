create or replace function public.create_fitness_purchase_order(p_supplier_name text,p_ordered_on date,p_items jsonb,p_notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_supplier_id uuid; v_order_id uuid; v_item record;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar pedidos Fitness'; end if;
  if nullif(btrim(p_supplier_name),'') is null then raise exception 'Informe o fornecedor'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione pelo menos um item'; end if;
  select id into v_supplier_id from public.fitness_suppliers where lower(name)=lower(btrim(p_supplier_name));
  if v_supplier_id is null then insert into public.fitness_suppliers(name) values(btrim(p_supplier_name)) returning id into v_supplier_id; end if;
  insert into public.fitness_purchase_orders(supplier_id,ordered_on,notes) values(v_supplier_id,coalesce(p_ordered_on,(now() at time zone 'America/Sao_Paulo')::date),nullif(btrim(p_notes),'')) returning id into v_order_id;
  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer,unit_cost numeric,notes text)
  loop
    if coalesce(v_item.quantity,0)<=0 or coalesce(v_item.unit_cost,0)<0 then raise exception 'Revise quantidade e custo dos itens'; end if;
    insert into public.fitness_purchase_order_items(purchase_order_id,variant_id,quantity_ordered,unit_cost,notes)
    values(v_order_id,v_item.variant_id,v_item.quantity,coalesce(v_item.unit_cost,0),nullif(btrim(v_item.notes),''));
  end loop;
  return v_order_id;
end;
$$;

create or replace function public.receive_fitness_purchase_item(p_item_id uuid,p_quantity integer,p_received_on date,p_notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_item public.fitness_purchase_order_items%rowtype; v_remaining integer; v_receipt_id uuid; v_status text;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para receber pedidos Fitness'; end if;
  select * into v_item from public.fitness_purchase_order_items where id=p_item_id for update;
  if not found then raise exception 'Item do pedido não encontrado'; end if;
  v_remaining := v_item.quantity_ordered-v_item.quantity_received;
  if p_quantity<=0 or p_quantity>v_remaining then raise exception 'Quantidade de recebimento inválida. Restante: %',v_remaining; end if;
  insert into public.fitness_purchase_receipts(purchase_order_item_id,quantity,received_on,notes)
  values(p_item_id,p_quantity,coalesce(p_received_on,(now() at time zone 'America/Sao_Paulo')::date),nullif(btrim(p_notes),'')) returning id into v_receipt_id;
  update public.fitness_purchase_order_items set quantity_received=quantity_received+p_quantity where id=p_item_id;
  update public.fitness_variants set cost_price=v_item.unit_cost where id=v_item.variant_id;
  insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,purchase_order_item_id,notes,idempotency_key)
  values(v_item.variant_id,'purchase',p_quantity,p_item_id,'Entrada de pedido Fitness','fitness:receipt:'||v_receipt_id);
  select case when bool_and(quantity_received>=quantity_ordered) then 'received' when bool_or(quantity_received>0) then 'partial' else 'pending' end into v_status
  from public.fitness_purchase_order_items where purchase_order_id=v_item.purchase_order_id;
  update public.fitness_purchase_orders set status=v_status where id=v_item.purchase_order_id;

  -- Completa reservas antigas desta variação pela ordem das vendas.
  with available as (
    select greatest(sb.quantity-coalesce((select sum(r.quantity_reserved) from public.fitness_stock_reservations r where r.variant_id=v_item.variant_id and r.status in ('reserved','partial')),0),0)::integer qty
    from public.fitness_stock_balances sb where sb.variant_id=v_item.variant_id
  ), ordered as (
    select r.id,r.quantity_requested-r.quantity_reserved missing,
      sum(r.quantity_requested-r.quantity_reserved) over(order by s.quoted_on,s.created_at,r.id rows between unbounded preceding and 1 preceding) prior_missing
    from public.fitness_stock_reservations r join public.fitness_sales s on s.id=r.sale_id
    where r.variant_id=v_item.variant_id and r.status in ('awaiting_stock','partial')
  )
  update public.fitness_stock_reservations r
  set quantity_reserved=r.quantity_reserved+greatest(least(o.missing,greatest(a.qty-coalesce(o.prior_missing,0),0)),0),
      status=case when r.quantity_reserved+greatest(least(o.missing,greatest(a.qty-coalesce(o.prior_missing,0),0)),0)>=r.quantity_requested then 'reserved' when r.quantity_reserved+greatest(least(o.missing,greatest(a.qty-coalesce(o.prior_missing,0),0)),0)>0 then 'partial' else 'awaiting_stock' end,
      reserved_at=case when r.quantity_reserved=0 and greatest(least(o.missing,greatest(a.qty-coalesce(o.prior_missing,0),0)),0)>0 then now() else r.reserved_at end,
      updated_at=now()
  from ordered o cross join available a where r.id=o.id;
  return v_receipt_id;
end;
$$;

create or replace function public.convert_fitness_stock(p_source_variant_id uuid,p_source_quantity integer,p_targets jsonb,p_notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_group uuid:=gen_random_uuid(); v_target record; v_multiplier integer;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para converter estoque Fitness'; end if;
  if p_source_quantity<=0 then raise exception 'Quantidade inválida'; end if;
  if p_targets is null or jsonb_typeof(p_targets)<>'array' or jsonb_array_length(p_targets)=0 then raise exception 'Adicione os itens gerados pela conversão'; end if;
  insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,transfer_group_id,notes,idempotency_key)
  values(p_source_variant_id,'conversion_out',-p_source_quantity,v_group,coalesce(nullif(btrim(p_notes),''),'Conversão de conjunto em peças'),'fitness:conversion-out:'||v_group);
  for v_target in select * from jsonb_to_recordset(p_targets) as x(variant_id uuid,quantity_per_source integer)
  loop
    v_multiplier:=coalesce(v_target.quantity_per_source,0);
    if v_multiplier<=0 then raise exception 'Quantidade de destino inválida'; end if;
    insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,transfer_group_id,notes,idempotency_key)
    values(v_target.variant_id,'conversion_in',p_source_quantity*v_multiplier,v_group,coalesce(nullif(btrim(p_notes),''),'Conversão de conjunto em peças'),'fitness:conversion-in:'||v_group||':'||v_target.variant_id);
  end loop;
  return v_group;
end;
$$;

