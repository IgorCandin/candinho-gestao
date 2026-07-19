-- V25 · Mantém o desconto do orçamento ao converter em venda Fitness.
-- Já aplicado diretamente no Supabase de produção.

alter table public.fitness_sales
  add column if not exists discount_amount numeric(12,2)
  not null default 0
  check (discount_amount >= 0);

create or replace function public.fitness_refresh_sale_totals()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sale_id uuid;
  v_cost numeric(12,2);
  v_gross numeric(12,2);
  v_discount numeric(12,2);
  v_net numeric(12,2);
begin
  v_sale_id:=coalesce(new.sale_id,old.sale_id);

  select
    coalesce(sum(quantity*unit_cost),0)::numeric(12,2),
    coalesce(sum(quantity*unit_price),0)::numeric(12,2)
  into v_cost,v_gross
  from public.fitness_sale_items
  where sale_id=v_sale_id;

  select coalesce(discount_amount,0)
  into v_discount
  from public.fitness_sales
  where id=v_sale_id;

  v_net:=greatest(v_gross-coalesce(v_discount,0),0)::numeric(12,2);

  update public.fitness_sales
  set total_cost=v_cost,
      total_amount=v_net,
      total_profit=(v_net-v_cost)::numeric(12,2),
      updated_at=now()
  where id=v_sale_id;

  return coalesce(new,old);
end;
$$;

create or replace function public.convert_fitness_quote_to_sale(
  p_quote_id uuid,
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
set search_path=public
as $$
declare
  v_q public.fitness_quotes%rowtype;
  v_c public.fitness_customers%rowtype;
  v_items jsonb;
  v_sale uuid;
  v_cost numeric(12,2);
  v_gross numeric(12,2);
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para converter orçamentos Fitness';
  end if;

  select * into v_q
  from public.fitness_quotes
  where id=p_quote_id
  for update;

  if not found then
    raise exception 'Orçamento Fitness não encontrado';
  end if;

  if v_q.status<>'quoted' then
    raise exception 'Este orçamento não está mais em aberto';
  end if;

  select * into v_c
  from public.fitness_customers
  where id=v_q.customer_id;

  select jsonb_agg(
    jsonb_build_object(
      'variant_id',i.variant_id,
      'quantity',i.quantity,
      'unit_price',i.unit_price
    )
    order by i.created_at
  )
  into v_items
  from public.fitness_quote_items i
  where i.quote_id=p_quote_id;

  if v_items is null then
    raise exception 'Orçamento sem itens';
  end if;

  v_sale:=public.create_fitness_sale_v2(
    v_c.id,v_c.name,v_c.phone,v_c.instagram,v_c.city,v_c.source,
    (now() at time zone 'America/Sao_Paulo')::date,
    v_items,
    p_payment_mode,p_paid_on,p_payment_method,p_payment_due_on,
    p_delivered,p_delivered_on,
    v_q.responsible,
    concat_ws(E'\n',v_q.notes,nullif(btrim(p_notes),''))
  );

  select
    coalesce(sum(quantity*unit_cost),0)::numeric(12,2),
    coalesce(sum(quantity*unit_price),0)::numeric(12,2)
  into v_cost,v_gross
  from public.fitness_sale_items
  where sale_id=v_sale;

  update public.fitness_sales
  set source_quote_id=p_quote_id,
      discount_amount=v_q.discount_amount,
      total_cost=v_cost,
      total_amount=greatest(v_gross-v_q.discount_amount,0)::numeric(12,2),
      total_profit=(greatest(v_gross-v_q.discount_amount,0)-v_cost)::numeric(12,2),
      updated_at=now()
  where id=v_sale;

  update public.fitness_quotes
  set status='confirmed',
      sale_id=v_sale,
      updated_at=now()
  where id=p_quote_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'fitness_quote',
    p_quote_id,
    'converted',
    jsonb_build_object(
      'sale_id',v_sale,
      'discount_amount',v_q.discount_amount
    )
  );

  return v_sale;
end;
$$;
