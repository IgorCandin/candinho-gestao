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
declare v_sale_id uuid; v_item record; v_variant public.fitness_variants%rowtype; v_item_id uuid; v_physical integer; v_reserved integer; v_available integer; v_reserve integer; v_status text; v_total numeric;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar vendas Fitness'; end if;
  if nullif(btrim(p_customer_name),'') is null then raise exception 'Informe o cliente'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione pelo menos um item'; end if;
  if p_payment_mode not in ('receivable','paid','combined') then raise exception 'Situação de pagamento inválida'; end if;
  if p_payment_mode='paid' and (p_paid_on is null or nullif(btrim(p_payment_method),'') is null) then raise exception 'Informe data e forma de pagamento'; end if;
  if p_payment_mode='combined' and p_payment_due_on is null then raise exception 'Informe a data combinada'; end if;
  if p_delivered and p_delivered_on is null then raise exception 'Informe a data da entrega'; end if;

  insert into public.fitness_sales(customer_name,customer_phone,city,quoted_on,payment_status,delivery_status,payment_method,payment_due_on,paid_on,delivered_on,notes)
  values(
    btrim(p_customer_name),nullif(btrim(p_customer_phone),''),nullif(btrim(p_city),''),coalesce(p_quoted_on,(now() at time zone 'America/Sao_Paulo')::date),
    case when p_payment_mode='paid' then 'received' else 'receivable' end,
    case when p_delivered then 'delivered' else 'to_deliver' end,
    case when p_payment_mode='paid' then p_payment_method else null end,
    case when p_payment_mode='combined' then p_payment_due_on else null end,
    case when p_payment_mode='paid' then p_paid_on else null end,
    case when p_delivered then p_delivered_on else null end,
    nullif(btrim(p_notes),'')
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer,unit_price numeric)
  loop
    if coalesce(v_item.quantity,0)<=0 then raise exception 'Quantidade inválida'; end if;
    select * into v_variant from public.fitness_variants where id=v_item.variant_id and active;
    if not found then raise exception 'Variação inválida ou inativa'; end if;
    insert into public.fitness_sale_items(sale_id,variant_id,quantity,unit_cost,unit_price)
    values(v_sale_id,v_variant.id,v_item.quantity,v_variant.cost_price,coalesce(v_item.unit_price,v_variant.sale_price)) returning id into v_item_id;

    insert into public.fitness_stock_balances(variant_id,quantity) values(v_variant.id,0) on conflict(variant_id) do nothing;
    select quantity into v_physical from public.fitness_stock_balances where variant_id=v_variant.id for update;
    select coalesce(sum(quantity_reserved),0)::integer into v_reserved from public.fitness_stock_reservations where variant_id=v_variant.id and status in ('reserved','partial');
    v_available := greatest(v_physical-v_reserved,0);

    if p_delivered then
      if v_available < v_item.quantity then raise exception 'Estoque insuficiente para entregar % / % / %. Disponível: %',(select name from public.fitness_products where id=v_variant.product_id),v_variant.size,v_variant.color,v_available; end if;
      insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,sale_id,notes,idempotency_key)
      values(v_variant.id,'sale',-v_item.quantity,v_sale_id,'Baixa automática na venda Fitness','fitness:sale:'||v_sale_id||':'||v_item_id);
    else
      v_reserve := least(v_item.quantity,v_available);
      v_status := case when v_reserve=v_item.quantity then 'reserved' when v_reserve>0 then 'partial' else 'awaiting_stock' end;
      insert into public.fitness_stock_reservations(sale_id,sale_item_id,variant_id,quantity_requested,quantity_reserved,status,reserved_at,notes)
      values(v_sale_id,v_item_id,v_variant.id,v_item.quantity,v_reserve,v_status,case when v_reserve>0 then now() else null end,case when v_reserve<v_item.quantity then 'Aguardando estoque' else 'Reservado para a venda' end);
    end if;
  end loop;

  select total_amount into v_total from public.fitness_sales where id=v_sale_id;
  update public.fitness_sales set general_status=case when payment_status='received' and delivery_status='delivered' then 'finalized' else 'active' end where id=v_sale_id;
  insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_sale',v_sale_id,'created',jsonb_build_object('total',v_total));
  return v_sale_id;
end;
$$;

create or replace function public.mark_fitness_sale_paid(p_sale_id uuid,p_paid_on date,p_payment_method text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar pagamentos Fitness'; end if;
  if p_paid_on is null or nullif(btrim(p_payment_method),'') is null then raise exception 'Informe data e forma de pagamento'; end if;
  update public.fitness_sales
  set payment_status='received',paid_on=p_paid_on,payment_method=btrim(p_payment_method),general_status=case when delivery_status='delivered' then 'finalized' else 'active' end
  where id=p_sale_id and general_status<>'cancelled';
  if not found then raise exception 'Venda Fitness não encontrada'; end if;
  return p_sale_id;
end;
$$;

create or replace function public.mark_fitness_sale_delivered(p_sale_id uuid,p_delivered_on date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_sale public.fitness_sales%rowtype; v_item record; v_physical integer; v_other_reserved integer;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar entregas Fitness'; end if;
  if p_delivered_on is null then raise exception 'Informe a data da entrega'; end if;
  select * into v_sale from public.fitness_sales where id=p_sale_id for update;
  if not found or v_sale.general_status='cancelled' then raise exception 'Venda Fitness não encontrada'; end if;
  if v_sale.delivery_status='delivered' then return p_sale_id; end if;

  for v_item in select i.id sale_item_id,i.variant_id,i.quantity,p.name product_name,v.size,v.color from public.fitness_sale_items i join public.fitness_variants v on v.id=i.variant_id join public.fitness_products p on p.id=v.product_id where i.sale_id=p_sale_id
  loop
    insert into public.fitness_stock_balances(variant_id,quantity) values(v_item.variant_id,0) on conflict(variant_id) do nothing;
    select quantity into v_physical from public.fitness_stock_balances where variant_id=v_item.variant_id for update;
    select coalesce(sum(quantity_reserved),0)::integer into v_other_reserved from public.fitness_stock_reservations where variant_id=v_item.variant_id and sale_id<>p_sale_id and status in ('reserved','partial');
    if v_physical-v_other_reserved < v_item.quantity then raise exception 'Estoque insuficiente para entregar % / % / %',v_item.product_name,v_item.size,v_item.color; end if;
  end loop;

  for v_item in select id sale_item_id,variant_id,quantity from public.fitness_sale_items where sale_id=p_sale_id
  loop
    insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,sale_id,notes,idempotency_key)
    values(v_item.variant_id,'sale',-v_item.quantity,p_sale_id,'Baixa automática na entrega Fitness','fitness:deliver:'||p_sale_id||':'||v_item.sale_item_id);
    update public.fitness_stock_reservations set status='fulfilled',quantity_reserved=quantity_requested,fulfilled_at=now(),updated_at=now(),notes='Reserva consumida na entrega' where sale_item_id=v_item.sale_item_id;
  end loop;

  update public.fitness_sales set delivery_status='delivered',delivered_on=p_delivered_on,general_status=case when payment_status='received' then 'finalized' else 'active' end where id=p_sale_id;
  return p_sale_id;
end;
$$;

