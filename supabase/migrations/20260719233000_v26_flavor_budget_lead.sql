-- Candinho Company V26
-- Orçamento/lead com sabor opcional no lead e obrigatório ao confirmar.
-- Já aplicado diretamente no Supabase de produção.

create or replace function public.save_budget_quote_v2(
  p_customer_id uuid,
  p_location_id uuid,
  p_quoted_on date,
  p_valid_until date,
  p_items jsonb,
  p_discount_amount numeric default 0,
  p_gift_product_id uuid default null,
  p_gift_quantity integer default 0,
  p_payment_mode text default 'receivable',
  p_paid_on date default null,
  p_payment_method text default null,
  p_payment_due_on date default null,
  p_delivered boolean default false,
  p_delivered_on date default null,
  p_delivery_due_on date default null,
  p_schedule_post_sale boolean default true,
  p_post_sale_due_on date default null,
  p_notes text default null,
  p_partner_id uuid default null,
  p_existing_quote_id uuid default null
)
returns table(quote_id uuid,lead_id uuid)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_quote_id uuid;
  v_lead_id uuid;
  v_customer public.customers%rowtype;
  v_location public.locations%rowtype;
  v_product public.products%rowtype;
  v_gift public.products%rowtype;
  v_quote public.sales_quotes%rowtype;
  v_item record;
  v_quoted_on date:=
    coalesce(
      p_quoted_on,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  v_valid_until date:=
    coalesce(
      p_valid_until,
      coalesce(
        p_quoted_on,
        (now() at time zone 'America/Sao_Paulo')::date
      )+7
    );
  v_quoted_at timestamptz;
  v_discount numeric(12,2):=
    greatest(coalesce(p_discount_amount,0),0);
  v_gross numeric(12,2):=0;
  v_total numeric(12,2):=0;
  v_gift_cost numeric(12,2):=0;
  v_payment_condition text:='A receber';
  v_allowed_methods constant text[]:=
    array[
      'Pix',
      'Dinheiro',
      'Cartão',
      'Link de Pagamento',
      'Pagamento fracionado'
    ];
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para registrar orçamentos';
  end if;

  if p_items is null
     or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)=0
  then
    raise exception
      'Adicione pelo menos um produto ao orçamento';
  end if;

  if jsonb_array_length(p_items)>20 then
    raise exception
      'O orçamento pode ter no máximo 20 itens';
  end if;

  if v_valid_until<v_quoted_on then
    raise exception
      'A validade do orçamento não pode ser anterior à data do orçamento';
  end if;

  if p_payment_mode not in (
    'receivable','paid','combined'
  ) then
    raise exception 'Situação do pagamento inválida';
  end if;

  if p_payment_method is not null
     and not(p_payment_method=any(v_allowed_methods))
  then
    raise exception 'Forma de pagamento inválida';
  end if;

  if p_payment_mode='combined'
     and p_payment_due_on is null
  then
    raise exception
      'Informe a data combinada para pagamento';
  end if;

  if p_gift_quantity is null
     or p_gift_quantity<0
  then
    raise exception 'Quantidade de brinde inválida';
  end if;

  if p_gift_product_id is null
     and coalesce(p_gift_quantity,0)>0
  then
    raise exception 'Selecione o produto do brinde';
  end if;

  if p_gift_product_id is not null
     and coalesce(p_gift_quantity,0)=0
  then
    p_gift_quantity:=1;
  end if;

  select * into v_customer
  from public.customers
  where id=p_customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  select * into v_location
  from public.locations
  where id=p_location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Estoque de origem inválido';
  end if;

  if p_partner_id is not null
     and not exists(
       select 1
       from public.partners
       where id=p_partner_id
         and lower(partner_type)<>'supplier'
         and coalesce(active,true)
     )
  then
    raise exception 'Parceiro inválido ou inativo';
  end if;

  if p_gift_product_id is not null then
    select * into v_gift
    from public.products
    where id=p_gift_product_id
      and active;

    if not found then
      raise exception
        'Produto de brinde não encontrado ou inativo';
    end if;

    if v_gift.flavor_tracking_enabled then
      raise exception
        'Produto com sabores deve ser adicionado como item do orçamento para escolher o sabor';
    end if;

    v_gift_cost:=v_gift.cost_price;
  end if;

  if exists(
    select 1
    from jsonb_to_recordset(p_items)
      as x(
        product_id uuid,
        flavor_id uuid,
        quantity integer,
        unit_price numeric
      )
    group by product_id,flavor_id
    having count(*)>1
  ) then
    raise exception
      'O mesmo produto e sabor foram adicionados mais de uma vez';
  end if;

  v_quoted_at:=(
    v_quoted_on::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  if p_payment_mode='paid' then
    v_payment_condition:='Pago';
  elsif p_payment_mode='combined' then
    v_payment_condition:='Pagamento combinado';
  end if;

  if p_existing_quote_id is not null then
    select * into v_quote
    from public.sales_quotes
    where id=p_existing_quote_id
    for update;

    if not found then
      raise exception 'Orçamento anterior não encontrado';
    end if;

    if v_quote.status<>'quoted' then
      raise exception
        'Este orçamento não está disponível para edição';
    end if;

    v_quote_id:=v_quote.id;
    v_lead_id:=v_quote.lead_id;

    update public.sales_quotes
    set customer_id=p_customer_id,
        location_id=p_location_id,
        quoted_on=v_quoted_on,
        valid_until=v_valid_until,
        discount_amount=v_discount,
        gift_product_id=p_gift_product_id,
        gift_quantity=coalesce(p_gift_quantity,0),
        payment_mode=p_payment_mode,
        payment_method=p_payment_method,
        paid_on=p_paid_on,
        payment_due_on=p_payment_due_on,
        delivered=coalesce(p_delivered,false),
        delivered_on=p_delivered_on,
        delivery_due_on=p_delivery_due_on,
        schedule_post_sale=coalesce(
          p_schedule_post_sale,true
        ),
        post_sale_due_on=p_post_sale_due_on,
        partner_id=p_partner_id,
        notes=nullif(btrim(p_notes),''),
        updated_at=now()
    where id=v_quote_id;

    delete from public.sales_quote_items
    where quote_id=v_quote_id;
  else
    insert into public.sales_quotes(
      customer_id,
      location_id,
      status,
      quoted_on,
      valid_until,
      discount_amount,
      gift_product_id,
      gift_quantity,
      payment_mode,
      payment_method,
      paid_on,
      payment_due_on,
      delivered,
      delivered_on,
      delivery_due_on,
      schedule_post_sale,
      post_sale_due_on,
      partner_id,
      notes
    )
    values(
      p_customer_id,
      p_location_id,
      'quoted',
      v_quoted_on,
      v_valid_until,
      v_discount,
      p_gift_product_id,
      coalesce(p_gift_quantity,0),
      p_payment_mode,
      p_payment_method,
      p_paid_on,
      p_payment_due_on,
      coalesce(p_delivered,false),
      p_delivered_on,
      p_delivery_due_on,
      coalesce(p_schedule_post_sale,true),
      p_post_sale_due_on,
      p_partner_id,
      nullif(btrim(p_notes),'')
    )
    returning id into v_quote_id;
  end if;

  for v_item in
    select *
    from jsonb_to_recordset(p_items)
      as x(
        product_id uuid,
        flavor_id uuid,
        quantity integer,
        unit_price numeric
      )
  loop
    if v_item.quantity is null
       or v_item.quantity<=0
    then
      raise exception
        'A quantidade de cada produto deve ser maior que zero';
    end if;

    if v_item.unit_price is null
       or v_item.unit_price<0
    then
      raise exception 'Preço de venda inválido';
    end if;

    select * into v_product
    from public.products
    where id=v_item.product_id
      and active;

    if not found then
      raise exception 'Produto não encontrado ou inativo';
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
        raise exception
          'Selecione o sabor de %',
          v_product.name;
      end if;
    elsif v_item.flavor_id is not null then
      raise exception
        'O produto % não possui controle por sabor',
        v_product.name;
    end if;

    insert into public.sales_quote_items(
      quote_id,
      product_id,
      flavor_id,
      quantity,
      unit_cost,
      unit_price
    )
    values(
      v_quote_id,
      v_product.id,
      v_item.flavor_id,
      v_item.quantity,
      v_product.cost_price,
      v_item.unit_price
    );

    v_gross:=
      v_gross+(v_item.quantity*v_item.unit_price);
  end loop;

  if v_discount>v_gross then
    raise exception
      'O desconto não pode ser maior que o subtotal do orçamento';
  end if;

  v_total:=greatest(v_gross-v_discount,0);

  update public.sales_quotes
  set gross_amount=v_gross,
      total_amount=v_total,
      updated_at=now()
  where id=v_quote_id;

  if v_lead_id is null then
    insert into public.sales(
      record_type,
      customer_id,
      location_id,
      reference,
      city,
      phone,
      general_status,
      payment_status,
      delivery_status,
      lead_status,
      payment_method,
      payment_condition,
      payment_due_at,
      quoted_at,
      notes,
      stock_deducted,
      total_cost,
      total_amount,
      total_profit,
      idempotency_key,
      discount_amount,
      gift_product_id,
      gift_quantity,
      gift_unit_cost
    )
    values(
      'lead',
      v_customer.id,
      v_location.id,
      v_customer.reference,
      v_customer.city,
      v_customer.phone,
      'pending',
      'not_applicable',
      'not_applicable',
      'Cotação',
      p_payment_method,
      v_payment_condition,
      p_payment_due_on,
      v_quoted_at,
      nullif(btrim(p_notes),''),
      false,
      0,
      0,
      0,
      'app:save-budget-v2-lead:'||v_quote_id::text,
      v_discount,
      p_gift_product_id,
      coalesce(p_gift_quantity,0),
      v_gift_cost
    )
    returning id into v_lead_id;
  else
    update public.sales
    set customer_id=v_customer.id,
        location_id=v_location.id,
        reference=v_customer.reference,
        city=v_customer.city,
        phone=v_customer.phone,
        lead_status='Cotação',
        general_status='pending',
        payment_method=p_payment_method,
        payment_condition=v_payment_condition,
        payment_due_at=p_payment_due_on,
        quoted_at=v_quoted_at,
        notes=nullif(btrim(p_notes),''),
        discount_amount=v_discount,
        gift_product_id=p_gift_product_id,
        gift_quantity=coalesce(p_gift_quantity,0),
        gift_unit_cost=v_gift_cost,
        updated_at=now()
    where id=v_lead_id
      and record_type='lead';

    delete from public.sale_items
    where sale_id=v_lead_id;
  end if;

  insert into public.sale_items(
    sale_id,
    product_id,
    flavor_id,
    quantity,
    unit_cost,
    unit_price,
    price_condition
  )
  select
    v_lead_id,
    qi.product_id,
    qi.flavor_id,
    qi.quantity,
    qi.unit_cost,
    qi.unit_price,
    case
      when qi.unit_price=p.cost_price
        then 'Custo'
      when qi.unit_price=p.sale_price
        then 'Preço normal'
      when qi.unit_price<p.sale_price
        then 'Desconto'
      else 'Preço combinado'
    end
  from public.sales_quote_items qi
  join public.products p on p.id=qi.product_id
  where qi.quote_id=v_quote_id;

  update public.sales_quotes
  set lead_id=v_lead_id,
      status='quoted',
      updated_at=now()
  where id=v_quote_id;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'quote',
    v_quote_id,
    'saved_v2',
    jsonb_build_object(
      'lead_id',v_lead_id,
      'customer_id',p_customer_id,
      'total_amount',v_total,
      'flavor_aware',true
    )
  );

  return query
    select v_quote_id,v_lead_id;
end;
$$;

create or replace function public.confirm_budget_quote_v2(
  p_quote_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_q public.sales_quotes%rowtype;
  v_customer public.customers%rowtype;
  v_location public.locations%rowtype;
  v_partner public.partners%rowtype;
  v_gift public.products%rowtype;
  v_item record;
  v_sale_id uuid;
  v_sale_item_id uuid;
  v_quoted_at timestamptz;
  v_paid_at timestamptz;
  v_delivered_at timestamptz;
  v_payment_status public.payment_status:='receivable';
  v_delivery_status public.delivery_status:='to_deliver';
  v_general_status public.sale_general_status:='active';
  v_payment_condition text:='A receber';
  v_item_condition text;
  v_sale_condition text;
  v_physical integer;
  v_reserved integer;
  v_available integer;
  v_reserve integer;
  v_reservation_status text;
  v_gift_cost numeric(12,2):=0;
  v_total numeric(12,2):=0;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para confirmar orçamentos';
  end if;

  select * into v_q
  from public.sales_quotes
  where id=p_quote_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  if v_q.status<>'quoted' then
    raise exception
      'Este orçamento não está disponível para conversão';
  end if;

  if not exists(
    select 1
    from public.sales_quote_items
    where quote_id=p_quote_id
  ) then
    raise exception 'Orçamento sem itens';
  end if;

  select * into v_customer
  from public.customers
  where id=v_q.customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  select * into v_location
  from public.locations
  where id=v_q.location_id
    and active
    and tracks_inventory;

  if not found then
    raise exception 'Estoque de origem inválido';
  end if;

  if v_q.partner_id is not null then
    select * into v_partner
    from public.partners
    where id=v_q.partner_id
      and lower(partner_type)<>'supplier'
      and coalesce(active,true);

    if not found then
      raise exception 'Parceiro inválido ou inativo';
    end if;
  end if;

  if v_q.payment_mode='paid' then
    if v_q.paid_on is null
       or nullif(btrim(v_q.payment_method),'') is null
    then
      raise exception
        'Informe data e forma de pagamento';
    end if;

    v_payment_status:='received';
    v_payment_condition:='Pago';
    v_paid_at:=(
      v_q.paid_on::timestamp+interval '12 hours'
    ) at time zone 'America/Sao_Paulo';
  elsif v_q.payment_mode='combined' then
    if v_q.payment_due_on is null then
      raise exception
        'Informe a data combinada para pagamento';
    end if;

    v_payment_condition:='Pagamento combinado';
  elsif v_q.payment_mode<>'receivable' then
    raise exception 'Situação do pagamento inválida';
  end if;

  if v_q.delivered then
    if v_q.delivered_on is null then
      raise exception 'Informe a data da entrega';
    end if;

    v_delivery_status:='delivered';
    v_delivered_at:=(
      v_q.delivered_on::timestamp+interval '12 hours'
    ) at time zone 'America/Sao_Paulo';
  end if;

  if v_payment_status='received'
     and v_delivery_status='delivered'
  then
    v_general_status:='finalized';
  end if;

  v_quoted_at:=(
    v_q.quoted_on::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  if v_q.gift_product_id is not null
     and coalesce(v_q.gift_quantity,0)>0
  then
    select * into v_gift
    from public.products
    where id=v_q.gift_product_id
      and active;

    if not found then
      raise exception
        'Produto de brinde não encontrado ou inativo';
    end if;

    if v_gift.flavor_tracking_enabled then
      raise exception
        'Produto com sabores não pode ser usado como brinde automático';
    end if;

    v_gift_cost:=v_gift.cost_price;
  end if;

  insert into public.sales(
    record_type,
    customer_id,
    location_id,
    reference,
    city,
    phone,
    general_status,
    payment_status,
    delivery_status,
    payment_method,
    payment_condition,
    payment_due_at,
    partnership,
    partner_id,
    quoted_at,
    paid_at,
    delivered_at,
    delivery_due_at,
    post_sale_due_at,
    notes,
    stock_deducted,
    total_cost,
    total_amount,
    total_profit,
    idempotency_key,
    discount_amount,
    gift_product_id,
    gift_quantity,
    gift_unit_cost
  )
  values(
    'sale',
    v_customer.id,
    v_location.id,
    v_customer.reference,
    v_customer.city,
    v_customer.phone,
    v_general_status,
    v_payment_status,
    v_delivery_status,
    case
      when v_q.payment_mode='paid'
      then v_q.payment_method
      else null
    end,
    v_payment_condition,
    case
      when v_q.payment_mode='combined'
      then v_q.payment_due_on
      else null
    end,
    case
      when v_q.partner_id is not null
      then v_partner.name
      else null
    end,
    v_q.partner_id,
    v_quoted_at,
    v_paid_at,
    v_delivered_at,
    v_q.delivery_due_on,
    case
      when coalesce(v_q.schedule_post_sale,true)
      then v_q.post_sale_due_on
      else null
    end,
    v_q.notes,
    coalesce(v_q.delivered,false),
    0,
    0,
    0,
    'app:confirm-budget-v2:'||v_q.id::text,
    v_q.discount_amount,
    v_q.gift_product_id,
    coalesce(v_q.gift_quantity,0),
    v_gift_cost
  )
  returning id into v_sale_id;

  for v_item in
    select
      qi.*,
      p.name product_name,
      p.sale_price standard_price,
      p.flavor_tracking_enabled
    from public.sales_quote_items qi
    join public.products p on p.id=qi.product_id
    where qi.quote_id=p_quote_id
    order by qi.created_at,qi.id
  loop
    if v_item.flavor_tracking_enabled then
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
          'Selecione um sabor válido para %',
          v_item.product_name;
      end if;
    elsif v_item.flavor_id is not null then
      raise exception
        'O produto % não utiliza sabores',
        v_item.product_name;
    end if;

    v_item_condition:=
      case
        when v_item.unit_price=v_item.unit_cost
          then 'Custo'
        when v_item.unit_price=v_item.standard_price
          then 'Preço normal'
        when v_item.unit_price<v_item.standard_price
          then 'Desconto'
        else 'Preço combinado'
      end;

    insert into public.sale_items(
      sale_id,
      product_id,
      flavor_id,
      quantity,
      unit_cost,
      unit_price,
      price_condition
    )
    values(
      v_sale_id,
      v_item.product_id,
      v_item.flavor_id,
      v_item.quantity,
      v_item.unit_cost,
      v_item.unit_price,
      v_item_condition
    )
    returning id into v_sale_item_id;

    if v_item.flavor_tracking_enabled then
      insert into public.product_flavor_stock_balances(
        flavor_id,location_id,quantity
      )
      values(
        v_item.flavor_id,
        v_location.id,
        0
      )
      on conflict(flavor_id,location_id) do nothing;

      select quantity into v_physical
      from public.product_flavor_stock_balances
      where flavor_id=v_item.flavor_id
        and location_id=v_location.id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer
      into v_reserved
      from public.stock_reservations
      where flavor_id=v_item.flavor_id
        and location_id=v_location.id
        and status in ('reserved','partial');
    else
      insert into public.stock_balances(
        product_id,location_id,quantity
      )
      values(
        v_item.product_id,
        v_location.id,
        0
      )
      on conflict(product_id,location_id) do nothing;

      select quantity into v_physical
      from public.stock_balances
      where product_id=v_item.product_id
        and location_id=v_location.id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer
      into v_reserved
      from public.stock_reservations
      where product_id=v_item.product_id
        and location_id=v_location.id
        and flavor_id is null
        and status in ('reserved','partial');
    end if;

    v_available:=greatest(
      coalesce(v_physical,0)-coalesce(v_reserved,0),
      0
    );

    if v_q.delivered then
      if v_available<v_item.quantity then
        raise exception
          'Estoque insuficiente para entregar % no sabor selecionado. Disponível: %',
          v_item.product_name,
          v_available;
      end if;

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
        v_location.id,
        v_item.flavor_id,
        'sale',
        -v_item.quantity,
        v_sale_id,
        'Baixa automática na confirmação do orçamento',
        'app:confirm-budget-v2-delivery:'
          ||v_sale_id::text
          ||':'
          ||v_sale_item_id::text
      );
    else
      v_reserve:=least(v_item.quantity,v_available);

      v_reservation_status:=
        case
          when v_reserve=v_item.quantity
            then 'reserved'
          when v_reserve>0
            then 'partial'
          else 'awaiting_stock'
        end;

      insert into public.stock_reservations(
        sale_id,
        sale_item_id,
        product_id,
        location_id,
        flavor_id,
        quantity_requested,
        quantity_reserved,
        status,
        reserved_at,
        notes
      )
      values(
        v_sale_id,
        v_sale_item_id,
        v_item.product_id,
        v_location.id,
        v_item.flavor_id,
        v_item.quantity,
        v_reserve,
        v_reservation_status,
        case
          when v_reserve>0
          then now()
          else null
        end,
        case
          when v_reserve<v_item.quantity
          then 'Aguardando reposição de estoque'
          else 'Reservado para a venda'
        end
      );
    end if;
  end loop;

  if v_q.gift_product_id is not null
     and coalesce(v_q.gift_quantity,0)>0
  then
    insert into public.stock_balances(
      product_id,location_id,quantity
    )
    values(
      v_q.gift_product_id,
      v_location.id,
      0
    )
    on conflict(product_id,location_id) do nothing;

    select quantity into v_physical
    from public.stock_balances
    where product_id=v_q.gift_product_id
      and location_id=v_location.id
    for update;

    select coalesce(sum(quantity_reserved),0)::integer
    into v_reserved
    from public.stock_reservations
    where product_id=v_q.gift_product_id
      and location_id=v_location.id
      and status in ('reserved','partial');

    v_available:=greatest(
      v_physical-v_reserved,
      0
    );

    if v_available<v_q.gift_quantity then
      raise exception
        'Estoque insuficiente para o brinde %. Disponível: %',
        v_gift.name,
        v_available;
    end if;

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
      v_q.gift_product_id,
      v_location.id,
      'sale',
      -v_q.gift_quantity,
      v_sale_id,
      'Baixa automática do brinde do orçamento confirmado',
      'app:confirm-budget-v2-gift:'
        ||v_sale_id::text
        ||':'
        ||v_q.gift_product_id::text
    );
  end if;

  select
    case
      when count(distinct price_condition)=1
      then min(price_condition)
      else 'Preço combinado'
    end
  into v_sale_condition
  from public.sale_items
  where sale_id=v_sale_id;

  update public.sales s
  set price_condition=v_sale_condition,
      total_cost=(
        coalesce(x.item_cost,0)
        +(
          coalesce(s.gift_quantity,0)
          *coalesce(s.gift_unit_cost,0)
        )
      )::numeric(12,2),
      total_amount=greatest(
        coalesce(x.item_amount,0)
        -coalesce(s.discount_amount,0),
        0
      )::numeric(12,2),
      total_profit=(
        greatest(
          coalesce(x.item_amount,0)
          -coalesce(s.discount_amount,0),
          0
        )
        -(
          coalesce(x.item_cost,0)
          +(
            coalesce(s.gift_quantity,0)
            *coalesce(s.gift_unit_cost,0)
          )
        )
      )::numeric(12,2)
  from (
    select
      sale_id,
      sum(total_cost)::numeric(12,2) item_cost,
      sum(total_price)::numeric(12,2) item_amount
    from public.sale_items
    where sale_id=v_sale_id
    group by sale_id
  ) x
  where s.id=v_sale_id
    and x.sale_id=s.id;

  select total_amount into v_total
  from public.sales
  where id=v_sale_id;

  if v_q.payment_mode='paid' then
    insert into public.sale_payment_entries(
      sale_id,
      amount,
      payment_method,
      received_at,
      notes
    )
    values(
      v_sale_id,
      v_total,
      v_q.payment_method,
      v_paid_at,
      'Pagamento registrado na confirmação do orçamento'
    );
  end if;

  update public.sales_quotes
  set status='confirmed',
      sale_id=v_sale_id,
      confirmed_at=now(),
      updated_at=now()
  where id=p_quote_id;

  if v_q.lead_id is not null then
    update public.sales
    set lead_status='Convertido',
        general_status='finalized',
        updated_at=now()
    where id=v_q.lead_id
      and record_type='lead';
  end if;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'quote',
    p_quote_id,
    'confirmed_v2',
    jsonb_build_object(
      'sale_id',v_sale_id,
      'lead_id',v_q.lead_id,
      'customer_id',v_q.customer_id,
      'discount_amount',v_q.discount_amount,
      'total_amount',v_total,
      'flavor_aware',true
    )
  );

  return v_sale_id;
end;
$$;

-- Lead manual: sabor é opcional porque ainda não há reserva de estoque.
create or replace function public.create_lead_v2(
  p_customer_id uuid,
  p_product_id uuid,
  p_flavor_id uuid default null,
  p_lead_status text default 'Perguntou sobre',
  p_notes text default null,
  p_lead_on date default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_location uuid;
  v_customer public.customers%rowtype;
  v_product public.products%rowtype;
  v_date date:=
    coalesce(
      p_lead_on,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  v_at timestamptz;
  v_allowed constant text[]:=
    array[
      'Perguntou sobre',
      'Decidindo',
      'Está quase comprando',
      'Esperando receber',
      'Esperando pedido de fornecedor',
      'Cotação',
      'Aguardando'
    ];
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cadastrar leads';
  end if;

  if p_lead_status is null
     or not(p_lead_status=any(v_allowed))
  then
    raise exception 'Status do lead inválido';
  end if;

  select * into v_customer
  from public.customers
  where id=p_customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  select * into v_product
  from public.products
  where id=p_product_id
    and active;

  if not found then
    raise exception 'Produto não encontrado ou inativo';
  end if;

  if p_flavor_id is not null then
    if not v_product.flavor_tracking_enabled then
      raise exception 'Este produto não possui controle por sabor';
    end if;

    if not exists(
      select 1
      from public.product_flavors
      where id=p_flavor_id
        and product_id=p_product_id
        and active
    ) then
      raise exception 'Sabor inválido para este produto';
    end if;
  end if;

  select id into v_location
  from public.locations
  where code='CS'
    and active
  limit 1;

  if v_location is null then
    raise exception 'Estoque central CS não encontrado';
  end if;

  v_at:=(
    v_date::timestamp+interval '12 hours'
  ) at time zone 'America/Sao_Paulo';

  insert into public.sales(
    record_type,
    customer_id,
    location_id,
    reference,
    city,
    phone,
    general_status,
    payment_status,
    delivery_status,
    lead_status,
    quoted_at,
    notes,
    stock_deducted,
    total_cost,
    total_amount,
    total_profit,
    idempotency_key
  )
  values(
    'lead',
    v_customer.id,
    v_location,
    v_customer.reference,
    v_customer.city,
    v_customer.phone,
    'pending',
    'not_applicable',
    'not_applicable',
    p_lead_status,
    v_at,
    nullif(btrim(p_notes),''),
    false,
    0,
    0,
    0,
    'app:create-lead-v2:'||gen_random_uuid()::text
  )
  returning id into v_id;

  insert into public.sale_items(
    sale_id,
    product_id,
    flavor_id,
    quantity,
    unit_cost,
    unit_price
  )
  values(
    v_id,
    v_product.id,
    p_flavor_id,
    1,
    0,
    0
  );

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'lead',
    v_id,
    'created_v2',
    jsonb_build_object(
      'customer_id',v_customer.id,
      'product_id',v_product.id,
      'flavor_id',p_flavor_id,
      'lead_status',p_lead_status,
      'lead_on',v_date
    )
  );

  return v_id;
end;
$$;

revoke all
on function public.save_budget_quote_v2(
  uuid,uuid,date,date,jsonb,numeric,uuid,integer,
  text,date,text,date,boolean,date,date,boolean,date,
  text,uuid,uuid
)
from public,anon;

revoke all
on function public.confirm_budget_quote_v2(uuid)
from public,anon;

revoke all
on function public.create_lead_v2(
  uuid,uuid,uuid,text,text,date
)
from public,anon;

grant execute
on function public.save_budget_quote_v2(
  uuid,uuid,date,date,jsonb,numeric,uuid,integer,
  text,date,text,date,boolean,date,date,boolean,date,
  text,uuid,uuid
)
to authenticated,service_role;

grant execute
on function public.confirm_budget_quote_v2(uuid)
to authenticated,service_role;

grant execute
on function public.create_lead_v2(
  uuid,uuid,uuid,text,text,date
)
to authenticated,service_role;
