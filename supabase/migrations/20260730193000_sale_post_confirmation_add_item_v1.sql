create or replace function public.append_item_to_confirmed_sale_v1(
  p_sale_id uuid,
  p_product_id uuid,
  p_flavor_id uuid default null,
  p_quantity integer default 1,
  p_unit_price numeric default null,
  p_reason text default null,
  p_price_condition text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sale public.sales%rowtype;
  v_product public.products%rowtype;
  v_quote public.sales_quotes%rowtype;
  v_payment public.sale_payment_summary%rowtype;
  v_existing_item public.sale_items%rowtype;
  v_quote_item public.sales_quote_items%rowtype;
  v_sale_item_id uuid;
  v_quote_id uuid;
  v_price numeric(12,2);
  v_delta numeric(12,2);
  v_old_total numeric(12,2);
  v_new_total numeric(12,2);
  v_new_cost numeric(12,2);
  v_new_profit numeric(12,2);
  v_condition text;
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_reserve integer;
  v_reservation_status text;
  v_is_stock_deducted boolean;
  v_amendment_id uuid := gen_random_uuid();
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para corrigir vendas';
  end if;

  if coalesce(p_quantity,0) <= 0 then
    raise exception 'Informe uma quantidade válida';
  end if;

  select * into v_sale
  from public.sales
  where id=p_sale_id
  for update;

  if not found or v_sale.record_type <> 'sale' then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    raise exception 'Venda cancelada não pode ser corrigida';
  end if;

  if v_sale.general_status not in ('active','finalized') then
    raise exception 'A venda ainda não está em uma etapa segura para correção pós-confirmação';
  end if;

  select * into v_payment
  from public.sale_payment_summary
  where sale_id=p_sale_id;

  if coalesce(v_payment.received_amount,0) > 0.005
     or v_sale.payment_status='received' then
    raise exception 'Esta venda já possui pagamento recebido. Corrija o financeiro antes de alterar os itens.';
  end if;

  if coalesce(v_payment.installment_count,0) > 0 then
    raise exception 'Esta venda possui parcelamento planejado. A correção de itens precisa ajustar o plano financeiro e ainda não está liberada nesta versão.';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id and active;

  if not found then
    raise exception 'Produto não encontrado ou inativo';
  end if;

  if v_product.flavor_tracking_enabled then
    if p_flavor_id is null then
      raise exception 'Selecione o sabor de %',v_product.name;
    end if;

    if not exists(
      select 1 from public.product_flavors
      where id=p_flavor_id
        and product_id=p_product_id
        and active
    ) then
      raise exception 'Sabor inválido para %',v_product.name;
    end if;
  elsif p_flavor_id is not null then
    raise exception 'O produto % não utiliza sabores',v_product.name;
  end if;

  v_price := coalesce(p_unit_price,v_product.sale_price)::numeric(12,2);
  if v_price < 0 then raise exception 'O preço não pode ser negativo'; end if;

  v_condition := coalesce(
    nullif(btrim(p_price_condition),''),
    case
      when v_price=v_product.cost_price then 'Custo'
      when v_price=v_product.sale_price then 'Preço normal'
      when v_price<v_product.sale_price then 'Desconto'
      else 'Preço combinado'
    end
  );

  v_delta := (p_quantity * v_price)::numeric(12,2);
  v_old_total := v_sale.total_amount;
  v_is_stock_deducted :=
    coalesce(v_sale.stock_deducted,false)
    or v_sale.delivery_status='delivered';

  select * into v_existing_item
  from public.sale_items
  where sale_id=p_sale_id
    and product_id=p_product_id
    and flavor_id is not distinct from p_flavor_id
    and unit_price=v_price
    and coalesce(price_condition,'')=coalesce(v_condition,'')
  order by created_at,id
  limit 1
  for update;

  if found then
    update public.sale_items
    set quantity=quantity+p_quantity
    where id=v_existing_item.id
    returning id into v_sale_item_id;
  else
    insert into public.sale_items(
      sale_id,product_id,flavor_id,quantity,unit_cost,unit_price,price_condition
    ) values(
      p_sale_id,p_product_id,p_flavor_id,p_quantity,
      v_product.cost_price,v_price,v_condition
    )
    returning id into v_sale_item_id;
  end if;

  if v_is_stock_deducted then
    insert into public.inventory_movements(
      product_id,location_id,flavor_id,movement_type,
      quantity_delta,sale_id,notes,idempotency_key
    ) values(
      p_product_id,v_sale.location_id,p_flavor_id,'sale',
      -p_quantity,p_sale_id,
      'Correção pós-confirmação: produto esquecido adicionado à venda',
      'app:sale-amendment-v1:'||v_amendment_id::text
    );
  else
    if v_product.flavor_tracking_enabled then
      insert into public.product_flavor_stock_balances(flavor_id,location_id,quantity)
      values(p_flavor_id,v_sale.location_id,0)
      on conflict(flavor_id,location_id) do nothing;

      select quantity into v_physical
      from public.product_flavor_stock_balances
      where flavor_id=p_flavor_id and location_id=v_sale.location_id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer into v_reserved
      from public.stock_reservations
      where flavor_id=p_flavor_id
        and location_id=v_sale.location_id
        and status in ('reserved','partial');
    else
      insert into public.stock_balances(product_id,location_id,quantity)
      values(p_product_id,v_sale.location_id,0)
      on conflict(product_id,location_id) do nothing;

      select quantity into v_physical
      from public.stock_balances
      where product_id=p_product_id and location_id=v_sale.location_id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer into v_reserved
      from public.stock_reservations
      where product_id=p_product_id
        and location_id=v_sale.location_id
        and flavor_id is null
        and status in ('reserved','partial');
    end if;

    v_available:=greatest(coalesce(v_physical,0)-coalesce(v_reserved,0),0);
    v_reserve:=least(p_quantity,v_available);
    v_reservation_status:=case
      when v_reserve=p_quantity then 'reserved'
      when v_reserve>0 then 'partial'
      else 'awaiting_stock'
    end;

    insert into public.stock_reservations(
      sale_id,sale_item_id,product_id,location_id,flavor_id,
      quantity_requested,quantity_reserved,status,reserved_at,notes
    ) values(
      p_sale_id,v_sale_item_id,p_product_id,v_sale.location_id,p_flavor_id,
      p_quantity,v_reserve,v_reservation_status,
      case when v_reserve>0 then now() else null end,
      case
        when v_reserve<p_quantity then 'Correção da venda · aguardando reposição de estoque'
        else 'Correção da venda · item reservado'
      end
    );
  end if;

  select * into v_quote
  from public.sales_quotes
  where sale_id=p_sale_id
  order by confirmed_at desc nulls last,created_at desc
  limit 1
  for update;

  if found then
    v_quote_id := v_quote.id;

    select * into v_quote_item
    from public.sales_quote_items
    where quote_id=v_quote.id
      and product_id=p_product_id
      and flavor_id is not distinct from p_flavor_id
      and unit_price=v_price
    order by created_at,id
    limit 1
    for update;

    if found then
      update public.sales_quote_items
      set quantity=quantity+p_quantity
      where id=v_quote_item.id;
    else
      insert into public.sales_quote_items(
        quote_id,product_id,flavor_id,quantity,unit_cost,unit_price
      ) values(
        v_quote.id,p_product_id,p_flavor_id,p_quantity,
        v_product.cost_price,v_price
      );
    end if;
  end if;

  select
    (
      coalesce(sum(si.total_cost),0)
      + coalesce(v_sale.gift_quantity,0)
        * coalesce(v_sale.gift_unit_cost,0)
    )::numeric(12,2),
    (
      greatest(
        coalesce(sum(si.total_price),0)
        - coalesce(v_sale.discount_amount,0),
        0
      )
      + coalesce(v_sale.agreed_markup_amount,0)
    )::numeric(12,2)
  into v_new_cost,v_new_total
  from public.sale_items si
  where si.sale_id=p_sale_id;

  v_new_profit := (v_new_total-v_new_cost)::numeric(12,2);

  update public.sales
  set total_cost=v_new_cost,
      total_amount=v_new_total,
      total_profit=v_new_profit,
      price_condition=(
        select case
          when count(distinct coalesce(si.price_condition,''))=1
            then nullif(min(coalesce(si.price_condition,'')),'')
          else 'Preço combinado'
        end
        from public.sale_items si
        where si.sale_id=p_sale_id
      ),
      updated_at=now()
  where id=p_sale_id;

  if v_quote_id is not null then
    update public.sales_quotes
    set gross_amount=gross_amount+v_delta,
        total_amount=v_new_total,
        updated_at=now()
    where id=v_quote_id;
  end if;

  perform public.sync_sale_payment_state(p_sale_id);

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'sale',p_sale_id,'post_confirmation_item_added_v1',
    jsonb_build_object(
      'amendment_id',v_amendment_id,
      'quote_id',v_quote_id,
      'sale_item_id',v_sale_item_id,
      'product_id',p_product_id,
      'product_name',v_product.name,
      'flavor_id',p_flavor_id,
      'quantity_added',p_quantity,
      'unit_price',v_price,
      'price_condition',v_condition,
      'old_total',v_old_total,
      'new_total',v_new_total,
      'stock_adjusted_immediately',v_is_stock_deducted,
      'reason',nullif(btrim(p_reason),'')
    )
  );

  return jsonb_build_object(
    'sale_id',p_sale_id,
    'quote_id',v_quote_id,
    'sale_item_id',v_sale_item_id,
    'product_name',v_product.name,
    'quantity_added',p_quantity,
    'unit_price',v_price,
    'old_total',v_old_total,
    'new_total',v_new_total,
    'delta_total',(v_new_total-v_old_total)::numeric(12,2),
    'stock_adjusted_immediately',v_is_stock_deducted
  );
end;
$function$;

grant execute on function public.append_item_to_confirmed_sale_v1(
  uuid,uuid,uuid,integer,numeric,text,text
) to authenticated,service_role;
