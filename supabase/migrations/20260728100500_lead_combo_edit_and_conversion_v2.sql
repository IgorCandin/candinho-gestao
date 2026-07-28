begin;

alter table public.sales
  add column if not exists lead_combo_id uuid
  references public.product_combos(id)
  on delete set null;

create index if not exists sales_lead_combo_id_idx
  on public.sales(lead_combo_id)
  where lead_combo_id is not null;

create or replace function public.update_lead_interest_v2(
  p_lead_id uuid,
  p_customer_id uuid,
  p_product_id uuid default null,
  p_flavor_id uuid default null,
  p_combo_id uuid default null,
  p_combo_items jsonb default '[]'::jsonb,
  p_lead_status text default 'Perguntou sobre',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead public.sales%rowtype;
  v_customer public.customers%rowtype;
  v_product public.products%rowtype;
  v_combo public.product_combos%rowtype;
  v_component record;
  v_component_flavor uuid;
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
    raise exception 'Usuário sem permissão para editar leads';
  end if;

  select * into v_lead
  from public.sales
  where id = p_lead_id
  for update;

  if not found or v_lead.record_type <> 'lead' then
    raise exception 'Lead não encontrado';
  end if;

  if v_lead.general_status = 'finalized'
    or coalesce(v_lead.lead_status,'') = 'Convertido'
  then
    raise exception 'Lead convertido não pode ser editado. Abra a venda vinculada.';
  end if;

  if exists(
    select 1
    from public.sales_quotes
    where lead_id = p_lead_id
  ) then
    raise exception 'Este lead já possui orçamento. Edite ou exclua o orçamento antes de alterar o interesse.';
  end if;

  if p_lead_status is null
    or not (p_lead_status = any(v_allowed))
  then
    raise exception 'Status do lead inválido';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  if p_combo_id is null
    and p_product_id is null
  then
    raise exception 'Selecione um produto ou combo';
  end if;

  if p_combo_id is not null
    and p_product_id is not null
  then
    raise exception 'Escolha produto individual ou combo, não os dois ao mesmo tempo';
  end if;

  update public.sales
  set customer_id = v_customer.id,
      reference = v_customer.reference,
      city = v_customer.city,
      phone = v_customer.phone,
      lead_status = p_lead_status,
      notes = nullif(btrim(p_notes),''),
      general_status = 'pending',
      cancelled_at = null,
      cancellation_reason = null,
      lead_combo_id = p_combo_id,
      updated_at = now()
  where id = p_lead_id;

  delete from public.sale_items
  where sale_id = p_lead_id;

  if p_combo_id is not null then
    select * into v_combo
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
        p_lead_id,
        v_component.product_id,
        v_component_flavor,
        v_component.quantity,
        0,
        0
      );
    end loop;
  else
    select * into v_product
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
      p_lead_id,
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
    p_lead_id,
    'interest_updated_v2',
    jsonb_build_object(
      'customer_id', v_customer.id,
      'product_id', p_product_id,
      'combo_id', p_combo_id,
      'flavor_id', p_flavor_id,
      'lead_status', p_lead_status
    )
  );

  return p_lead_id;
end;
$function$;

grant execute on function
  public.update_lead_interest_v2(
    uuid,uuid,uuid,uuid,uuid,jsonb,text,text
  )
to authenticated, service_role;

create or replace function public.prepare_lead_conversion_v1(
  p_lead_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead public.sales%rowtype;
  v_quote public.sales_quotes%rowtype;
  v_combo public.product_combos%rowtype;
  v_quote_id uuid;
  v_today date :=
    (now() at time zone 'America/Sao_Paulo')::date;
  v_gross numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_markup numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item_count integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para converter leads';
  end if;

  select * into v_lead
  from public.sales
  where id = p_lead_id
  for update;

  if not found
    or v_lead.record_type <> 'lead'
  then
    raise exception 'Lead não encontrado';
  end if;

  if v_lead.general_status = 'finalized'
    or coalesce(
      v_lead.lead_status,
      ''
    ) = 'Convertido'
  then
    raise exception 'Este lead já foi convertido em venda';
  end if;

  select * into v_quote
  from public.sales_quotes
  where lead_id = p_lead_id
  order by created_at desc
  limit 1
  for update;

  if found then
    if v_quote.status = 'confirmed'
      or v_quote.sale_id is not null
    then
      raise exception 'Este lead já possui uma venda confirmada';
    end if;

    if v_quote.status <> 'quoted' then
      update public.sales_quotes
      set status = 'quoted',
          updated_at = now()
      where id = v_quote.id;

      update public.sales
      set lead_status = 'Cotação',
          general_status = 'pending',
          cancelled_at = null,
          cancellation_reason = null,
          updated_at = now()
      where id = p_lead_id;
    end if;

    return v_quote.id;
  end if;

  with priced as (
    select
      si.quantity,
      coalesce(
        (
          select min(
            a.effective_promotional_price
          )
          from
            public.active_operation_promotion_snapshot() a
          where a.operation_scope =
                'supplements'
            and a.supplement_product_id =
                p.id
            and a.available_quantity > 0
            and a.effective_promotional_price
                >= 0
            and a.effective_promotional_price
                < a.current_price
        ),
        p.sale_price
      )::numeric(12,2)
        as effective_price
    from public.sale_items si
    join public.products p
      on p.id = si.product_id
     and p.active
    where si.sale_id = p_lead_id
  )
  select
    count(*)::integer,
    coalesce(
      sum(
        quantity * effective_price
      ),
      0
    )::numeric(12,2)
  into
    v_item_count,
    v_gross
  from priced;

  if v_item_count = 0 then
    raise exception 'Este lead não possui produto de interesse';
  end if;

  v_total := v_gross;

  if v_lead.lead_combo_id is not null then
    select * into v_combo
    from public.product_combos
    where id =
          v_lead.lead_combo_id
      and active;

    if not found then
      raise exception 'O combo deste lead não está mais ativo. Edite o lead antes de converter.';
    end if;

    v_total :=
      v_combo.sale_price;
    v_discount :=
      greatest(
        v_gross - v_total,
        0
      );
    v_markup :=
      greatest(
        v_total - v_gross,
        0
      );
  end if;

  insert into public.sales_quotes(
    customer_id,
    location_id,
    lead_id,
    status,
    quoted_on,
    valid_until,
    gross_amount,
    discount_amount,
    total_amount,
    payment_mode,
    delivered,
    schedule_post_sale,
    notes,
    agreed_markup_amount
  )
  values(
    v_lead.customer_id,
    v_lead.location_id,
    p_lead_id,
    'quoted',
    v_today,
    v_today + 7,
    v_gross,
    v_discount,
    v_total,
    'receivable',
    false,
    true,
    v_lead.notes,
    v_markup
  )
  returning id into v_quote_id;

  insert into public.sales_quote_items(
    quote_id,
    product_id,
    flavor_id,
    quantity,
    unit_cost,
    unit_price
  )
  select
    v_quote_id,
    si.product_id,
    si.flavor_id,
    si.quantity,
    p.cost_price,
    coalesce(
      (
        select min(
          a.effective_promotional_price
        )
        from
          public.active_operation_promotion_snapshot() a
        where a.operation_scope =
              'supplements'
          and a.supplement_product_id =
              p.id
          and a.available_quantity > 0
          and a.effective_promotional_price
              >= 0
          and a.effective_promotional_price
              < a.current_price
      ),
      p.sale_price
    )::numeric(12,2)
  from public.sale_items si
  join public.products p
    on p.id = si.product_id
   and p.active
  where si.sale_id = p_lead_id
  order by
    si.created_at,
    si.id;

  update public.sales
  set lead_status = 'Cotação',
      general_status = 'pending',
      cancelled_at = null,
      cancellation_reason = null,
      updated_at = now()
  where id = p_lead_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'lead',
    p_lead_id,
    'conversion_started_v2',
    jsonb_build_object(
      'quote_id', v_quote_id,
      'gross_amount', v_gross,
      'discount_amount',
        v_discount,
      'agreed_markup_amount',
        v_markup,
      'total_amount', v_total,
      'item_count', v_item_count,
      'combo_id',
        v_lead.lead_combo_id,
      'promotion_aware', true
    )
  );

  return v_quote_id;
end;
$function$;

grant execute on function
  public.prepare_lead_conversion_v1(uuid)
to authenticated, service_role;

commit;
