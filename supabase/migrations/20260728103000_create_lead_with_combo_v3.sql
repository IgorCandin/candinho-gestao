begin;

alter table public.sales
  add column if not exists lead_combo_id uuid
  references public.product_combos(id)
  on delete set null;

create or replace function public.create_lead_interest_v3(
  p_customer_id uuid,
  p_product_id uuid default null,
  p_flavor_id uuid default null,
  p_combo_id uuid default null,
  p_combo_items jsonb default '[]'::jsonb,
  p_lead_status text default 'Perguntou sobre',
  p_notes text default null,
  p_lead_on date default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_location uuid;
  v_customer public.customers%rowtype;
  v_product public.products%rowtype;
  v_combo public.product_combos%rowtype;
  v_component record;
  v_component_flavor uuid;
  v_date date := coalesce(
    p_lead_on,
    (now() at time zone 'America/Sao_Paulo')::date
  );
  v_at timestamptz;
  v_allowed constant text[] := array[
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
    or not (p_lead_status = any(v_allowed))
  then
    raise exception 'Status do lead inválido';
  end if;

  select *
  into v_customer
  from public.customers
  where id = p_customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  if p_product_id is null
    and p_combo_id is null
  then
    raise exception 'Selecione um produto ou combo';
  end if;

  if p_product_id is not null
    and p_combo_id is not null
  then
    raise exception 'Escolha produto individual ou combo, não os dois ao mesmo tempo';
  end if;

  select id
  into v_location
  from public.locations
  where code = 'CS'
    and active
  limit 1;

  if v_location is null then
    raise exception 'Estoque central CS não encontrado';
  end if;

  v_at :=
    (v_date::timestamp + interval '12 hours')
    at time zone 'America/Sao_Paulo';

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
    idempotency_key,
    lead_combo_id
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
    'app:create-lead-interest-v3:' ||
      gen_random_uuid()::text,
    p_combo_id
  )
  returning id into v_id;

  if p_combo_id is not null then
    select *
    into v_combo
    from public.product_combos
    where id = p_combo_id
      and active;

    if not found then
      raise exception 'Combo não encontrado ou inativo';
    end if;

    if not exists(
      select 1
      from public.product_combo_items
      where combo_id = p_combo_id
    ) then
      raise exception 'O combo selecionado não possui produtos';
    end if;

    for v_component in
      select
        ci.product_id,
        ci.quantity,
        p.name,
        p.flavor_tracking_enabled
      from public.product_combo_items ci
      join public.products p
        on p.id = ci.product_id
       and p.active
      where ci.combo_id = p_combo_id
      order by ci.created_at, ci.id
    loop
      v_component_flavor := null;

      select nullif(
        item->>'flavor_id',
        ''
      )::uuid
      into v_component_flavor
      from jsonb_array_elements(
        coalesce(
          p_combo_items,
          '[]'::jsonb
        )
      ) item
      where item->>'product_id'
        = v_component.product_id::text
      limit 1;

      if v_component_flavor is not null then
        if not v_component.flavor_tracking_enabled then
          raise exception
            'O produto % não utiliza sabores',
            v_component.name;
        end if;

        if not exists(
          select 1
          from public.product_flavors
          where id = v_component_flavor
            and product_id =
              v_component.product_id
            and active
        ) then
          raise exception
            'Sabor inválido para %',
            v_component.name;
        end if;
      end if;

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
        v_component.product_id,
        v_component_flavor,
        v_component.quantity,
        0,
        0
      );
    end loop;
  else
    select *
    into v_product
    from public.products
    where id = p_product_id
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
        where id = p_flavor_id
          and product_id = p_product_id
          and active
      ) then
        raise exception 'Sabor inválido para este produto';
      end if;
    end if;

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
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'lead',
    v_id,
    'created_v3',
    jsonb_build_object(
      'customer_id',v_customer.id,
      'product_id',p_product_id,
      'combo_id',p_combo_id,
      'flavor_id',p_flavor_id,
      'lead_status',p_lead_status,
      'lead_on',v_date
    )
  );

  return v_id;
end;
$function$;

grant execute on function
  public.create_lead_interest_v3(
    uuid,uuid,uuid,uuid,jsonb,text,text,date
  )
to authenticated, service_role;

commit;
