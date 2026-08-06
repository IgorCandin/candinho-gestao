create table if not exists public.commercial_outflows (
  id uuid primary key default gen_random_uuid(),
  reason_code text not null check (reason_code in (
    'partnership_activation','raffle_prize','sample','marketing_action',
    'influencer','donation','internal_use','loss_damage','other'
  )),
  partner_id uuid references public.partners(id) on delete set null,
  destination_name text,
  occurred_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  notes text,
  status text not null default 'completed' check (status in ('completed','cancelled')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  check (partner_id is not null or nullif(btrim(destination_name),'') is not null)
);

create table if not exists public.commercial_outflow_items (
  id uuid primary key default gen_random_uuid(),
  outflow_id uuid not null references public.commercial_outflows(id) on delete cascade,
  product_id uuid not null references public.products(id),
  flavor_id uuid references public.product_flavors(id),
  location_id uuid not null references public.locations(id),
  quantity integer not null check (quantity > 0),
  unit_cost_snapshot numeric(12,2) not null default 0,
  unit_sale_price_snapshot numeric(12,2) not null default 0,
  inventory_movement_id uuid not null references public.inventory_movements(id),
  reversal_inventory_movement_id uuid references public.inventory_movements(id),
  notes text,
  created_at timestamptz not null default now(),
  unique (inventory_movement_id)
);

create index if not exists idx_commercial_outflows_partner
  on public.commercial_outflows(partner_id, occurred_on desc);

create index if not exists idx_commercial_outflows_occurred
  on public.commercial_outflows(occurred_on desc, status);

create index if not exists idx_commercial_outflow_items_outflow
  on public.commercial_outflow_items(outflow_id);

create index if not exists idx_commercial_outflow_items_product
  on public.commercial_outflow_items(product_id);

alter table public.commercial_outflows enable row level security;
alter table public.commercial_outflow_items enable row level security;

drop policy if exists commercial_outflows_read on public.commercial_outflows;
create policy commercial_outflows_read
  on public.commercial_outflows
  for select
  to authenticated
  using (public.can_write());

drop policy if exists commercial_outflow_items_read on public.commercial_outflow_items;
create policy commercial_outflow_items_read
  on public.commercial_outflow_items
  for select
  to authenticated
  using (public.can_write());

revoke insert, update, delete on public.commercial_outflows from authenticated;
revoke insert, update, delete on public.commercial_outflow_items from authenticated;
grant select on public.commercial_outflows to authenticated;
grant select on public.commercial_outflow_items to authenticated;

create or replace function public.create_commercial_outflow_v1(
  p_reason_code text,
  p_partner_id uuid default null,
  p_destination_name text default null,
  p_occurred_on date default null,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_outflow_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_location public.locations%rowtype;
  v_product_id uuid;
  v_location_id uuid;
  v_flavor_id uuid;
  v_quantity integer;
  v_current integer;
  v_reserved integer;
  v_movement_id uuid;
  v_idx integer:=0;
  v_destination text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar saída comercial';
  end if;

  if p_reason_code not in (
    'partnership_activation','raffle_prize','sample','marketing_action',
    'influencer','donation','internal_use','loss_damage','other'
  ) then
    raise exception 'Motivo de saída inválido';
  end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Máximo de 50 itens por saída';
  end if;

  if p_partner_id is not null then
    select name
      into v_destination
    from public.partners
    where id=p_partner_id
      and active;

    if v_destination is null then
      raise exception 'Parceiro não encontrado ou inativo';
    end if;
  else
    v_destination:=nullif(btrim(coalesce(p_destination_name,'')),'');

    if v_destination is null then
      raise exception 'Informe o destino da saída';
    end if;
  end if;

  insert into public.commercial_outflows(
    reason_code,
    partner_id,
    destination_name,
    occurred_on,
    notes,
    created_by
  )
  values(
    p_reason_code,
    p_partner_id,
    case when p_partner_id is null then v_destination else null end,
    coalesce(
      p_occurred_on,
      (now() at time zone 'America/Sao_Paulo')::date
    ),
    nullif(btrim(coalesce(p_notes,'')),''),
    auth.uid()
  )
  returning id into v_outflow_id;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_idx:=v_idx+1;
    v_product_id:=nullif(v_item->>'product_id','')::uuid;
    v_location_id:=nullif(v_item->>'location_id','')::uuid;
    v_flavor_id:=nullif(v_item->>'flavor_id','')::uuid;
    v_quantity:=coalesce((v_item->>'quantity')::integer,0);

    if v_product_id is null
       or v_location_id is null
       or v_quantity<=0 then
      raise exception 'Item % inválido',v_idx;
    end if;

    select *
      into v_product
    from public.products
    where id=v_product_id
      and active;

    if not found then
      raise exception 'Produto do item % não encontrado ou inativo',v_idx;
    end if;

    select *
      into v_location
    from public.locations
    where id=v_location_id
      and active
      and tracks_inventory;

    if not found then
      raise exception 'Local de estoque do item % inválido',v_idx;
    end if;

    if v_product.flavor_tracking_enabled then
      if v_flavor_id is null
         or not exists(
           select 1
           from public.product_flavors
           where id=v_flavor_id
             and product_id=v_product_id
             and active
         ) then
        raise exception 'Selecione o sabor do item %',v_idx;
      end if;

      insert into public.product_flavor_stock_balances(
        flavor_id,
        location_id,
        quantity
      )
      values(v_flavor_id,v_location_id,0)
      on conflict(flavor_id,location_id) do nothing;

      select quantity
        into v_current
      from public.product_flavor_stock_balances
      where flavor_id=v_flavor_id
        and location_id=v_location_id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer
        into v_reserved
      from public.stock_reservations
      where product_id=v_product_id
        and flavor_id=v_flavor_id
        and location_id=v_location_id
        and status in ('reserved','partial');
    else
      if v_flavor_id is not null then
        raise exception 'O item % não usa controle por sabor',v_idx;
      end if;

      insert into public.stock_balances(
        product_id,
        location_id,
        quantity
      )
      values(v_product_id,v_location_id,0)
      on conflict(product_id,location_id) do nothing;

      select quantity
        into v_current
      from public.stock_balances
      where product_id=v_product_id
        and location_id=v_location_id
      for update;

      select coalesce(sum(quantity_reserved),0)::integer
        into v_reserved
      from public.stock_reservations
      where product_id=v_product_id
        and flavor_id is null
        and location_id=v_location_id
        and status in ('reserved','partial');
    end if;

    if coalesce(v_current,0)-v_quantity < coalesce(v_reserved,0) then
      raise exception
        'Estoque disponível insuficiente no item %. Físico: %, reservado: %, solicitado: %',
        v_idx,
        v_current,
        v_reserved,
        v_quantity;
    end if;

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
      v_product_id,
      v_location_id,
      v_flavor_id,
      'commercial_outflow',
      -v_quantity,
      '[Saída não-venda] '||
      v_destination||
      ' · '||
      p_reason_code||
      case
        when nullif(btrim(coalesce(p_notes,'')),'') is not null
        then ' · '||btrim(p_notes)
        else ''
      end,
      'commercial-outflow:'||
      v_outflow_id::text||
      ':'||
      v_idx::text,
      (
        (
          coalesce(
            p_occurred_on,
            (now() at time zone 'America/Sao_Paulo')::date
          )
        )::timestamp
        + interval '12 hours'
      ) at time zone 'America/Sao_Paulo'
    )
    returning id into v_movement_id;

    insert into public.commercial_outflow_items(
      outflow_id,
      product_id,
      flavor_id,
      location_id,
      quantity,
      unit_cost_snapshot,
      unit_sale_price_snapshot,
      inventory_movement_id,
      notes
    )
    values(
      v_outflow_id,
      v_product_id,
      v_flavor_id,
      v_location_id,
      v_quantity,
      coalesce(v_product.cost_price,0),
      coalesce(v_product.sale_price,0),
      v_movement_id,
      nullif(v_item->>'notes','')
    );
  end loop;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'commercial_outflow',
    v_outflow_id,
    'created',
    jsonb_build_object(
      'reason_code',p_reason_code,
      'partner_id',p_partner_id,
      'destination',v_destination,
      'item_count',v_idx
    )
  );

  return jsonb_build_object(
    'outflow_id',v_outflow_id,
    'item_count',v_idx,
    'destination',v_destination
  );
exception
  when others then
    raise;
end;
$$;

create or replace function public.cancel_commercial_outflow_v1(
  p_outflow_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_outflow public.commercial_outflows%rowtype;
  v_item record;
  v_movement_id uuid;
  v_allocated integer;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cancelar saída comercial';
  end if;

  select *
    into v_outflow
  from public.commercial_outflows
  where id=p_outflow_id
  for update;

  if not found then
    raise exception 'Saída não encontrada';
  end if;

  if v_outflow.status='cancelled' then
    return jsonb_build_object(
      'outflow_id',p_outflow_id,
      'status','cancelled',
      'already_cancelled',true
    );
  end if;

  if exists(
    select 1
    from public.commercial_outflow_items i
    join public.products p on p.id=i.product_id
    where i.outflow_id=p_outflow_id
      and p.lot_tracking_enabled
  ) then
    raise exception
      'Esta saída possui produto com rastreio de lote. Faça a devolução pelo fluxo de estoque para preservar a rastreabilidade.';
  end if;

  for v_item in
    select *
    from public.commercial_outflow_items
    where outflow_id=p_outflow_id
    order by created_at,id
  loop
    insert into public.inventory_movements(
      product_id,
      location_id,
      flavor_id,
      movement_type,
      quantity_delta,
      notes,
      idempotency_key
    )
    values(
      v_item.product_id,
      v_item.location_id,
      v_item.flavor_id,
      'commercial_outflow_reversal',
      v_item.quantity,
      '[Estorno saída não-venda] '||
      coalesce(
        nullif(btrim(p_reason),''),
        'Cancelamento da saída'
      ),
      'commercial-outflow-reversal:'||
      p_outflow_id::text||
      ':'||
      v_item.id::text
    )
    returning id into v_movement_id;

    update public.commercial_outflow_items
    set reversal_inventory_movement_id=v_movement_id
    where id=v_item.id;

    v_allocated:=public.allocate_available_stock_v2(
      v_item.product_id,
      v_item.location_id,
      v_item.flavor_id,
      'Estorno de saída não-venda'
    );
  end loop;

  update public.commercial_outflows
  set
    status='cancelled',
    cancelled_at=now(),
    cancelled_by=auth.uid(),
    cancellation_reason=nullif(btrim(coalesce(p_reason,'')),''),
    updated_at=now()
  where id=p_outflow_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'commercial_outflow',
    p_outflow_id,
    'cancelled',
    jsonb_build_object(
      'reason',
      nullif(btrim(coalesce(p_reason,'')),'')
    )
  );

  return jsonb_build_object(
    'outflow_id',p_outflow_id,
    'status','cancelled'
  );
end;
$$;

grant execute on function public.create_commercial_outflow_v1(
  text,uuid,text,date,text,jsonb
) to authenticated;

grant execute on function public.cancel_commercial_outflow_v1(
  uuid,text
) to authenticated;

create or replace view public.commercial_outflows_overview
with (security_invoker=true)
as
select
  o.id,
  o.occurred_on,
  o.reason_code,
  case o.reason_code
    when 'partnership_activation' then 'Ativação de parceria'
    when 'raffle_prize' then 'Premiação / sorteio'
    when 'sample' then 'Amostra'
    when 'marketing_action' then 'Ação de marketing'
    when 'influencer' then 'Influenciador'
    when 'donation' then 'Doação'
    when 'internal_use' then 'Uso interno'
    when 'loss_damage' then 'Perda / avaria'
    else 'Outro'
  end as reason_label,
  o.partner_id,
  p.name as partner_name,
  coalesce(p.name,o.destination_name) as destination_name,
  o.status,
  o.notes,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity),0)::integer as total_units,
  coalesce(
    sum(i.quantity*i.unit_cost_snapshot),
    0
  )::numeric(12,2) as total_cost,
  coalesce(
    sum(i.quantity*i.unit_sale_price_snapshot),
    0
  )::numeric(12,2) as reference_sale_value,
  string_agg(
    pr.name||' ×'||i.quantity::text,
    ', '
    order by pr.name
  ) as product_summary,
  o.created_at,
  o.cancelled_at,
  o.cancellation_reason
from public.commercial_outflows o
left join public.partners p on p.id=o.partner_id
left join public.commercial_outflow_items i
  on i.outflow_id=o.id
left join public.products pr
  on pr.id=i.product_id
group by o.id,p.name;

grant select on public.commercial_outflows_overview
to authenticated;

create or replace view public.partner_commercial_investment_v1
with (security_invoker=true)
as
select
  p.id as partner_id,
  p.name as partner_name,
  count(distinct o.id)
    filter(where o.status='completed')::integer
      as action_count,
  coalesce(
    sum(i.quantity)
      filter(where o.status='completed'),
    0
  )::integer as units_invested,
  coalesce(
    sum(i.quantity*i.unit_cost_snapshot)
      filter(where o.status='completed'),
    0
  )::numeric(12,2) as investment_cost,
  coalesce(
    sum(i.quantity*i.unit_sale_price_snapshot)
      filter(where o.status='completed'),
    0
  )::numeric(12,2) as reference_sale_value,
  max(o.occurred_on)
    filter(where o.status='completed')
      as last_investment_on
from public.partners p
left join public.commercial_outflows o
  on o.partner_id=p.id
left join public.commercial_outflow_items i
  on i.outflow_id=o.id
where p.active
group by p.id,p.name;

grant select on public.partner_commercial_investment_v1
to authenticated;

create table if not exists public.customer_sales_opportunity_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null
    references public.customers(id)
    on delete cascade,
  recommended_product_id uuid
    references public.products(id)
    on delete set null,
  opportunity_group text,
  opportunity_subtype text,
  feedback_status text not null
    check (
      feedback_status in (
        'contacted',
        'still_using',
        'product_ended',
        'not_interested',
        'bought_elsewhere',
        'later',
        'sale_completed',
        'dismissed'
      )
    ),
  notes text,
  next_action_on date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_opp_feedback_customer
  on public.customer_sales_opportunity_feedback(
    customer_id,
    created_at desc
  );

create index if not exists idx_sales_opp_feedback_product
  on public.customer_sales_opportunity_feedback(
    recommended_product_id,
    created_at desc
  );

alter table public.customer_sales_opportunity_feedback
  enable row level security;

drop policy if exists customer_sales_opp_feedback_read
  on public.customer_sales_opportunity_feedback;

create policy customer_sales_opp_feedback_read
  on public.customer_sales_opportunity_feedback
  for select
  to authenticated
  using (public.can_write());

revoke insert,update,delete
  on public.customer_sales_opportunity_feedback
  from authenticated;

grant select
  on public.customer_sales_opportunity_feedback
  to authenticated;

create or replace function public.record_sales_opportunity_feedback_v1(
  p_customer_id uuid,
  p_recommended_product_id uuid default null,
  p_opportunity_group text default null,
  p_opportunity_subtype text default null,
  p_feedback_status text default 'contacted',
  p_notes text default null,
  p_next_action_on date default null
) returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar feedback comercial';
  end if;

  if p_feedback_status not in (
    'contacted',
    'still_using',
    'product_ended',
    'not_interested',
    'bought_elsewhere',
    'later',
    'sale_completed',
    'dismissed'
  ) then
    raise exception 'Feedback inválido';
  end if;

  if not exists(
    select 1
    from public.customers
    where id=p_customer_id
      and active
  ) then
    raise exception 'Cliente não encontrado';
  end if;

  insert into public.customer_sales_opportunity_feedback(
    customer_id,
    recommended_product_id,
    opportunity_group,
    opportunity_subtype,
    feedback_status,
    notes,
    next_action_on,
    created_by
  )
  values(
    p_customer_id,
    p_recommended_product_id,
    nullif(btrim(coalesce(p_opportunity_group,'')),''),
    nullif(btrim(coalesce(p_opportunity_subtype,'')),''),
    p_feedback_status,
    nullif(btrim(coalesce(p_notes,'')),''),
    p_next_action_on,
    auth.uid()
  )
  returning id into v_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'customer',
    p_customer_id,
    'sales_opportunity_feedback',
    jsonb_build_object(
      'feedback_id',v_id,
      'product_id',p_recommended_product_id,
      'status',p_feedback_status,
      'next_action_on',p_next_action_on
    )
  );

  return v_id;
end;
$$;

grant execute on function public.record_sales_opportunity_feedback_v1(
  uuid,uuid,text,text,text,text,date
) to authenticated;

create or replace view public.customer_sales_opportunities_actionable_v2
with (security_invoker=true)
as
select
  o.*,
  f.feedback_status as last_feedback_status,
  f.next_action_on as feedback_next_action_on,
  f.created_at as feedback_at
from public.customer_sales_opportunities_v1 o
left join lateral (
  select
    x.feedback_status,
    x.next_action_on,
    x.created_at
  from public.customer_sales_opportunity_feedback x
  where x.customer_id=o.customer_id
    and x.recommended_product_id
      is not distinct from o.recommended_product_id
    and (
      x.opportunity_group is null
      or x.opportunity_group=o.opportunity_group
    )
  order by x.created_at desc
  limit 1
) f on true
where
  f.created_at is null
  or case f.feedback_status
    when 'not_interested'
      then f.created_at < now()-interval '60 days'
    when 'bought_elsewhere'
      then f.created_at < now()-interval '30 days'
    when 'still_using'
      then coalesce(
        f.next_action_on,
        (f.created_at at time zone 'America/Sao_Paulo')::date+14
      ) <= (now() at time zone 'America/Sao_Paulo')::date
    when 'later'
      then coalesce(
        f.next_action_on,
        (f.created_at at time zone 'America/Sao_Paulo')::date+7
      ) <= (now() at time zone 'America/Sao_Paulo')::date
    when 'sale_completed'
      then f.created_at < now()-interval '14 days'
    when 'dismissed'
      then f.created_at < now()-interval '30 days'
    when 'contacted'
      then f.created_at < now()-interval '2 days'
    else true
  end;

grant select
  on public.customer_sales_opportunities_actionable_v2
  to authenticated;

create or replace view public.customer_sales_opportunities_priority_v2
with (security_invoker=true)
as
select *
from (
  select
    o.*,
    row_number() over(
      partition by customer_id
      order by
        opportunity_score desc,
        abs(coalesce(days_to_action,9999)),
        recommended_product_name
    ) as rn
  from public.customer_sales_opportunities_actionable_v2 o
  where priority in ('Alta','Média')
) ranked
where rn=1;

grant select
  on public.customer_sales_opportunities_priority_v2
  to authenticated;

create or replace view public.product_sales_targets_v2
with (security_invoker=true)
as
select
  recommended_product_id as product_id,
  recommended_product_name as product_name,
  max(recommended_product_price)::numeric(12,2) as product_price,
  count(distinct customer_id)::integer as candidate_customers,
  count(distinct customer_id)
    filter(where priority='Alta')::integer
      as high_priority_customers,
  count(distinct customer_id)
    filter(where priority='Média')::integer
      as medium_priority_customers,
  max(opportunity_score)::integer as best_score,
  array_agg(
    distinct opportunity_group
    order by opportunity_group
  ) as opportunity_groups
from public.customer_sales_opportunities_actionable_v2
where recommended_product_id is not null
  and priority in ('Alta','Média')
group by
  recommended_product_id,
  recommended_product_name;

grant select on public.product_sales_targets_v2
to authenticated;

create or replace view public.partner_setup_health_v1
with (security_invoker=true)
as
select
  p.id as partner_id,
  p.name as partner_name,
  p.partner_type,
  p.city,
  p.status,
  p.start_date,
  p.partnership_model,
  p.settlement_rule,
  p.reward_type,
  p.commission_pct,
  p.phone,
  p.contact_name,
  (
    case when p.start_date is not null then 1 else 0 end +
    case
      when nullif(
        btrim(coalesce(p.partnership_model,'')),
        ''
      ) is not null
      then 1
      else 0
    end +
    case
      when nullif(
        btrim(coalesce(p.settlement_rule,'')),
        ''
      ) is not null
      then 1
      else 0
    end +
    case
      when nullif(btrim(coalesce(p.contact_name,'')),'') is not null
        or nullif(btrim(coalesce(p.phone,'')),'') is not null
      then 1
      else 0
    end
  )::integer as setup_fields_done,
  array_remove(
    array[
      case
        when p.start_date is null
        then 'Definir início da parceria'
      end,
      case
        when nullif(
          btrim(coalesce(p.partnership_model,'')),
          ''
        ) is null
        then 'Definir como a parceria funciona'
      end,
      case
        when nullif(
          btrim(coalesce(p.settlement_rule,'')),
          ''
        ) is null
        then 'Definir regra de acerto/contrapartida'
      end,
      case
        when nullif(
          btrim(coalesce(p.contact_name,'')),
          ''
        ) is null
        and nullif(
          btrim(coalesce(p.phone,'')),
          ''
        ) is null
        then 'Cadastrar contato da parceria'
      end
    ],
    null
  ) as pending_setup,
  coalesce(
    i.investment_cost,
    0
  )::numeric(12,2) as commercial_investment_cost,
  coalesce(
    i.units_invested,
    0
  )::integer as commercial_units_invested
from public.partners p
left join public.partner_commercial_investment_v1 i
  on i.partner_id=p.id
where p.active;

grant select on public.partner_setup_health_v1
to authenticated;
