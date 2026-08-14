begin;

/*
  V45.37.R12 · Interesse público da Vitrine Fitness

  O catálogo de suplementos já transforma interesse público em cliente + lead.
  Fitness usa uma tabela própria de produtos, portanto recebe uma referência
  separada sem falsificar product_id de suplementos.
*/

alter table public.catalog_public_leads
  add column if not exists fitness_product_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.catalog_public_leads'::regclass
      and conname = 'catalog_public_leads_fitness_product_id_fkey'
  ) then
    alter table public.catalog_public_leads
      add constraint catalog_public_leads_fitness_product_id_fkey
      foreign key (fitness_product_id)
      references public.fitness_products(id)
      on delete set null;
  end if;
end $$;

create index if not exists catalog_public_leads_fitness_product_idx
  on public.catalog_public_leads(fitness_product_id, created_at desc)
  where fitness_product_id is not null;

create or replace function public.public_create_fitness_catalog_lead_v1(
  p_name text,
  p_phone text,
  p_fitness_product_id uuid,
  p_context_summary text default null,
  p_source text default 'catalog_fitness_lightbox'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(coalesce(p_name,'')),120);
  v_phone text := left(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),40);
  v_source text := left(coalesce(nullif(btrim(p_source),''),'catalog_fitness_lightbox'),60);
  v_context text := left(nullif(btrim(p_context_summary),''),2000);
  v_product public.fitness_products%rowtype;
  v_customer public.customers%rowtype;
  v_customer_id uuid;
  v_location_id uuid;
  v_public_id uuid;
  v_sales_lead_id uuid;
  v_existing_sales_lead_id uuid;
  v_note text;
begin
  if char_length(v_name) < 2 then
    raise exception 'Informe seu nome';
  end if;

  if char_length(v_phone) < 8 then
    raise exception 'Informe um telefone válido';
  end if;

  select fp.*
  into v_product
  from public.fitness_products fp
  where fp.id = p_fitness_product_id
    and fp.active;

  if not found then
    raise exception 'Produto Fitness indisponível para atendimento público';
  end if;

  select c.*
  into v_customer
  from public.customers c
  where c.active
    and regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') = v_phone
  order by c.updated_at desc, c.created_at desc
  limit 1;

  if found then
    v_customer_id := v_customer.id;
  else
    insert into public.customers(
      name,
      phone,
      active
    )
    values(
      v_name,
      v_phone,
      true
    )
    returning id into v_customer_id;

    select *
    into v_customer
    from public.customers
    where id = v_customer_id;
  end if;

  select l.id, l.sales_lead_id
  into v_public_id, v_existing_sales_lead_id
  from public.catalog_public_leads l
  where regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = v_phone
    and l.fitness_product_id = p_fitness_product_id
    and l.created_at >= now() - interval '24 hours'
    and coalesce(l.inbox_status,'new') not in ('converted','closed')
  order by l.created_at desc
  limit 1;

  if v_public_id is null then
    insert into public.catalog_public_leads(
      name,
      phone,
      product_id,
      fitness_product_id,
      source,
      context_summary,
      status,
      inbox_status,
      inbox_kind,
      customer_id
    )
    values(
      v_name,
      v_phone,
      null,
      p_fitness_product_id,
      v_source,
      v_context,
      'open',
      'new',
      'interest',
      v_customer_id
    )
    returning id into v_public_id;
  else
    update public.catalog_public_leads
    set name = v_name,
        phone = v_phone,
        customer_id = v_customer_id,
        source = v_source,
        context_summary = coalesce(v_context, context_summary),
        inbox_status = case
          when inbox_status in ('converted','closed') then 'new'
          else inbox_status
        end,
        inbox_kind = 'interest',
        updated_at = now()
    where id = v_public_id;
  end if;

  if v_existing_sales_lead_id is not null
     and exists (
       select 1
       from public.sales s
       where s.id = v_existing_sales_lead_id
         and s.record_type = 'lead'
         and s.cancelled_at is null
         and s.general_status <> 'finalized'
     ) then
    v_sales_lead_id := v_existing_sales_lead_id;
  end if;

  v_note := concat_ws(
    E'\n',
    'Origem: Vitrine Fitness',
    'Interesse Fitness: ' || v_product.name,
    case
      when v_context is not null then 'Contexto: ' || v_context
      else null
    end
  );

  if v_sales_lead_id is null then
    select l.id
    into v_location_id
    from public.locations l
    where l.code = 'CS'
      and l.active
    limit 1;

    if v_location_id is null then
      raise exception 'Estoque central CS não encontrado';
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
      v_customer_id,
      v_location_id,
      v_customer.reference,
      v_customer.city,
      coalesce(v_customer.phone, v_phone),
      'pending',
      'not_applicable',
      'not_applicable',
      'Perguntou sobre',
      now(),
      v_note,
      false,
      0,
      0,
      0,
      'public:fitness-catalog:' || v_public_id::text
    )
    on conflict (idempotency_key) do update set
      customer_id = excluded.customer_id,
      phone = excluded.phone,
      notes = excluded.notes,
      updated_at = now()
    returning id into v_sales_lead_id;
  else
    update public.sales
    set notes = case
          when position(v_product.name in coalesce(notes,'')) > 0
            then notes
          else concat_ws(E'\n\n', notes, v_note)
        end,
        lead_status = case
          when coalesce(lead_status,'') in ('','Convertido')
            then 'Perguntou sobre'
          else lead_status
        end,
        updated_at = now()
    where id = v_sales_lead_id;
  end if;

  update public.catalog_public_leads
  set customer_id = v_customer_id,
      sales_lead_id = v_sales_lead_id,
      updated_at = now()
  where id = v_public_id;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'catalog_public_lead',
    v_public_id,
    'fitness_catalog_interest_v1',
    jsonb_build_object(
      'customer_id', v_customer_id,
      'sales_lead_id', v_sales_lead_id,
      'fitness_product_id', p_fitness_product_id,
      'fitness_product_name', v_product.name,
      'source', v_source
    )
  );

  return v_public_id;
end;
$$;

revoke all on function public.public_create_fitness_catalog_lead_v1(
  text,text,uuid,text,text
) from public;

grant execute on function public.public_create_fitness_catalog_lead_v1(
  text,text,uuid,text,text
) to anon, authenticated;

commit;
