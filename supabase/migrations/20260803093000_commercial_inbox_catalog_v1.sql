begin;

alter table public.catalog_public_leads
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists sales_lead_id uuid references public.sales(id) on delete set null,
  add column if not exists inbox_status text not null default 'new',
  add column if not exists inbox_kind text not null default 'purchase_intent',
  add column if not exists contacted_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists last_action_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.catalog_public_leads'::regclass
      and conname = 'catalog_public_leads_inbox_status_check'
  ) then
    alter table public.catalog_public_leads
      add constraint catalog_public_leads_inbox_status_check
      check (inbox_status in (
        'new',
        'in_service',
        'waiting_customer',
        'ready_to_close',
        'converted',
        'closed'
      ));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.catalog_public_leads'::regclass
      and conname = 'catalog_public_leads_inbox_kind_check'
  ) then
    alter table public.catalog_public_leads
      add constraint catalog_public_leads_inbox_kind_check
      check (inbox_kind in (
        'purchase_intent',
        'human_handoff',
        'interest'
      ));
  end if;
end $$;

create index if not exists catalog_public_leads_inbox_status_idx
  on public.catalog_public_leads(inbox_status, created_at desc);

create index if not exists catalog_public_leads_customer_idx
  on public.catalog_public_leads(customer_id, created_at desc)
  where customer_id is not null;

create index if not exists catalog_public_leads_sales_lead_idx
  on public.catalog_public_leads(sales_lead_id)
  where sales_lead_id is not null;

create or replace function public.sync_catalog_public_lead_to_commercial_v1(
  p_catalog_lead_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public public.catalog_public_leads%rowtype;
  v_customer_id uuid;
  v_sales_lead_id uuid;
  v_location_id uuid;
  v_product public.products%rowtype;
  v_customer public.customers%rowtype;
  v_phone_digits text;
  v_note text;
begin
  select *
  into v_public
  from public.catalog_public_leads
  where id = p_catalog_lead_id
  for update;

  if not found then
    raise exception 'Interesse público não encontrado';
  end if;

  if v_public.sales_lead_id is not null
     and exists (
       select 1
       from public.sales s
       where s.id = v_public.sales_lead_id
         and s.record_type = 'lead'
     ) then
    return v_public.sales_lead_id;
  end if;

  v_phone_digits := regexp_replace(coalesce(v_public.phone,''), '[^0-9]', '', 'g');

  select c.*
  into v_customer
  from public.customers c
  where c.active
    and regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') = v_phone_digits
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
      v_public.name,
      v_phone_digits,
      true
    )
    returning id into v_customer_id;

    select *
    into v_customer
    from public.customers
    where id = v_customer_id;
  end if;

  update public.catalog_public_leads
  set customer_id = v_customer_id,
      updated_at = now()
  where id = v_public.id;

  if v_public.product_id is null then
    return null;
  end if;

  select p.*
  into v_product
  from public.products p
  where p.id = v_public.product_id
    and p.active
    and not p.restricted
    and coalesce(upper(p.sales_category),'') <> 'Z';

  if not found then
    return null;
  end if;

  select s.id
  into v_sales_lead_id
  from public.sales s
  join public.sale_items si
    on si.sale_id = s.id
   and si.product_id = v_product.id
  where s.record_type = 'lead'
    and s.customer_id = v_customer_id
    and s.cancelled_at is null
    and s.general_status <> 'finalized'
    and coalesce(s.lead_status,'') <> 'Convertido'
    and s.created_at >= now() - interval '45 days'
  order by s.updated_at desc, s.created_at desc
  limit 1;

  v_note := concat_ws(
    E'\n',
    'Origem: Catálogo público',
    'Interesse: ' || v_product.name,
    case
      when nullif(btrim(v_public.context_summary),'') is not null
        then 'Contexto: ' || btrim(v_public.context_summary)
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
      coalesce(v_customer.phone, v_public.phone),
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
      'public:catalog-inbox:' || v_public.id::text
    )
    returning id into v_sales_lead_id;

    insert into public.sale_items(
      sale_id,
      product_id,
      flavor_id,
      quantity,
      unit_cost,
      unit_price
    )
    values(
      v_sales_lead_id,
      v_product.id,
      null,
      1,
      0,
      0
    );
  else
    update public.sales
    set notes = case
          when nullif(btrim(v_public.context_summary),'') is null then notes
          when position(btrim(v_public.context_summary) in coalesce(notes,'')) > 0 then notes
          else concat_ws(E'\n\n', notes, v_note)
        end,
        updated_at = now()
    where id = v_sales_lead_id;
  end if;

  update public.catalog_public_leads
  set customer_id = v_customer_id,
      sales_lead_id = v_sales_lead_id,
      updated_at = now()
  where id = v_public.id;

  update public.nexus_signals
  set status = 'resolved',
      resolved_at = coalesce(resolved_at, now()),
      updated_at = now()
  where fingerprint = 'catalog-lead:' || v_public.id::text
    and status <> 'resolved';

  insert into public.nexus_signals(
    fingerprint,
    signal_type,
    severity,
    operation_scope,
    entity_type,
    entity_id,
    customer_id,
    product_id,
    title,
    summary,
    rationale,
    recommended_action,
    action_label,
    action_href,
    score,
    status,
    generated_by,
    metadata
  )
  values(
    'catalog-commercial-lead:' || v_public.id::text,
    'catalog_commercial_lead',
    'opportunity',
    'supplements',
    'lead',
    v_sales_lead_id,
    v_customer_id,
    v_product.id,
    'Novo pedido da vitrine · ' || coalesce(v_customer.name, v_public.name),
    concat_ws(' · ', v_product.name, left(nullif(btrim(v_public.context_summary),''), 220)),
    'O cliente deixou telefone e pediu atendimento pela vitrine pública.',
    'Abrir o lead, revisar o contexto e entrar em contato.',
    'Abrir lead',
    '/leads/' || v_sales_lead_id::text,
    96,
    'open',
    'commercial_inbox',
    jsonb_build_object(
      'catalog_lead_id', v_public.id,
      'sales_lead_id', v_sales_lead_id,
      'customer_id', v_customer_id,
      'phone', coalesce(v_customer.phone, v_public.phone),
      'product_name', v_product.name,
      'source', v_public.source,
      'inbox_status', v_public.inbox_status
    )
  )
  on conflict(fingerprint) do update set
    entity_id = excluded.entity_id,
    customer_id = excluded.customer_id,
    product_id = excluded.product_id,
    title = excluded.title,
    summary = excluded.summary,
    action_href = excluded.action_href,
    score = excluded.score,
    status = 'open',
    resolved_at = null,
    last_seen_at = now(),
    updated_at = now(),
    metadata = excluded.metadata;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'catalog_public_lead',
    v_public.id,
    'synced_to_commercial_v1',
    jsonb_build_object(
      'customer_id', v_customer_id,
      'sales_lead_id', v_sales_lead_id,
      'product_id', v_product.id,
      'source', v_public.source
    )
  );

  return v_sales_lead_id;
end;
$$;

create or replace function public.public_create_catalog_lead_v2(
  p_name text,
  p_phone text,
  p_product_id uuid default null,
  p_context_summary text default null,
  p_source text default 'catalog'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := left(btrim(coalesce(p_name,'')),120);
  v_phone text := left(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),40);
  v_source text := left(coalesce(nullif(btrim(p_source),''),'catalog'),60);
  v_existing uuid;
  v_kind text;
begin
  if char_length(v_name) < 2 then
    raise exception 'Informe seu nome';
  end if;

  if char_length(v_phone) < 8 then
    raise exception 'Informe um telefone válido';
  end if;

  if p_product_id is not null and not exists(
    select 1
    from public.products p
    where p.id = p_product_id
      and p.active
      and not p.restricted
      and coalesce(upper(p.sales_category),'') <> 'Z'
  ) then
    raise exception 'Produto indisponível para atendimento público';
  end if;

  v_kind := case
    when lower(v_source) like '%buy%' then 'purchase_intent'
    when lower(v_source) like '%human%' or lower(v_source) like '%handoff%' then 'human_handoff'
    else 'interest'
  end;

  select l.id
  into v_existing
  from public.catalog_public_leads l
  where regexp_replace(l.phone,'[^0-9]','','g') = v_phone
    and l.product_id is not distinct from p_product_id
    and l.created_at >= now() - interval '24 hours'
    and l.inbox_status not in ('converted','closed')
  order by l.created_at desc
  limit 1;

  if v_existing is not null then
    update public.catalog_public_leads
    set name = v_name,
        source = v_source,
        context_summary = coalesce(nullif(btrim(p_context_summary),''), context_summary),
        inbox_kind = v_kind,
        updated_at = now()
    where id = v_existing;

    perform public.sync_catalog_public_lead_to_commercial_v1(v_existing);
    return v_existing;
  end if;

  insert into public.catalog_public_leads(
    name,
    phone,
    product_id,
    source,
    context_summary,
    status,
    inbox_status,
    inbox_kind
  )
  values(
    v_name,
    v_phone,
    p_product_id,
    v_source,
    left(nullif(btrim(p_context_summary),''),2000),
    'open',
    'new',
    v_kind
  )
  returning id into v_id;

  perform public.sync_catalog_public_lead_to_commercial_v1(v_id);

  return v_id;
end;
$$;

create or replace function public.set_commercial_inbox_status_v1(
  p_catalog_lead_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public public.catalog_public_leads%rowtype;
  v_status text := btrim(coalesce(p_status,''));
  v_sales_status text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para atualizar a Inbox';
  end if;

  if v_status not in (
    'new',
    'in_service',
    'waiting_customer',
    'ready_to_close',
    'converted',
    'closed'
  ) then
    raise exception 'Status inválido da Inbox';
  end if;

  select *
  into v_public
  from public.catalog_public_leads
  where id = p_catalog_lead_id
  for update;

  if not found then
    raise exception 'Item da Inbox não encontrado';
  end if;

  update public.catalog_public_leads
  set inbox_status = v_status,
      status = case
        when v_status = 'converted' then 'converted'
        when v_status = 'closed' then 'closed'
        when v_status = 'new' then 'open'
        else 'contacted'
      end,
      contacted_at = case
        when v_status in ('in_service','waiting_customer','ready_to_close')
          then coalesce(contacted_at, now())
        else contacted_at
      end,
      converted_at = case
        when v_status = 'converted' then coalesce(converted_at, now())
        else converted_at
      end,
      closed_at = case
        when v_status = 'closed' then coalesce(closed_at, now())
        else closed_at
      end,
      last_action_at = now(),
      updated_at = now()
  where id = p_catalog_lead_id;

  v_sales_status := case v_status
    when 'new' then 'Perguntou sobre'
    when 'in_service' then 'Decidindo'
    when 'waiting_customer' then 'Aguardando'
    when 'ready_to_close' then 'Está quase comprando'
    else null
  end;

  if v_public.sales_lead_id is not null and v_sales_status is not null then
    update public.sales
    set lead_status = v_sales_status,
        updated_at = now()
    where id = v_public.sales_lead_id
      and record_type = 'lead'
      and general_status <> 'finalized';
  end if;

  if v_public.customer_id is not null
     and v_status in ('waiting_customer','ready_to_close') then
    update public.customers
    set last_contact_at = now(),
        last_contact_outcome = case
          when v_status = 'waiting_customer'
            then 'Contato feito pela Inbox · aguardando retorno'
          else 'Cliente pronto para fechamento pela Inbox'
        end,
        updated_at = now()
    where id = v_public.customer_id;
  end if;

  if v_status in ('converted','closed') then
    update public.nexus_signals
    set status = 'resolved',
        resolved_at = coalesce(resolved_at, now()),
        updated_at = now()
    where fingerprint = 'catalog-commercial-lead:' || p_catalog_lead_id::text;
  else
    update public.nexus_signals
    set status = 'open',
        resolved_at = null,
        last_seen_at = now(),
        updated_at = now(),
        metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('inbox_status',v_status)
    where fingerprint = 'catalog-commercial-lead:' || p_catalog_lead_id::text;
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'catalog_public_lead',
    p_catalog_lead_id,
    'inbox_status_changed_v1',
    jsonb_build_object(
      'status', v_status,
      'sales_lead_id', v_public.sales_lead_id,
      'customer_id', v_public.customer_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'catalog_lead_id', p_catalog_lead_id,
    'sales_lead_id', v_public.sales_lead_id,
    'status', v_status
  );
end;
$$;

create or replace function public.sync_commercial_inbox_from_lead_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.record_type <> 'lead' then
    return new;
  end if;

  if new.general_status = 'finalized'
     or coalesce(new.lead_status,'') = 'Convertido' then
    update public.catalog_public_leads
    set inbox_status = 'converted',
        status = 'converted',
        converted_at = coalesce(converted_at, now()),
        last_action_at = now(),
        updated_at = now()
    where sales_lead_id = new.id
      and inbox_status <> 'converted';

    update public.nexus_signals
    set status = 'resolved',
        resolved_at = coalesce(resolved_at, now()),
        updated_at = now()
    where entity_type = 'lead'
      and entity_id = new.id
      and signal_type = 'catalog_commercial_lead';
  elsif new.cancelled_at is not null then
    update public.catalog_public_leads
    set inbox_status = 'closed',
        status = 'closed',
        closed_at = coalesce(closed_at, now()),
        last_action_at = now(),
        updated_at = now()
    where sales_lead_id = new.id
      and inbox_status not in ('converted','closed');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_commercial_inbox_from_lead_v1
  on public.sales;

create trigger trg_sync_commercial_inbox_from_lead_v1
after update of lead_status, general_status, cancelled_at
on public.sales
for each row
execute function public.sync_commercial_inbox_from_lead_v1();

create or replace view public.commercial_inbox_overview_v1 as
select
  l.id as catalog_lead_id,
  l.sales_lead_id,
  l.customer_id,
  coalesce(c.name,l.name) as customer_name,
  coalesce(c.phone,l.phone) as phone,
  c.city,
  l.product_id,
  p.name as product_name,
  coalesce(p.thumbnail_url,p.image_url) as product_image_url,
  p.sale_price,
  l.source,
  l.inbox_kind,
  l.inbox_status,
  l.context_summary,
  l.created_at,
  l.updated_at,
  l.last_action_at,
  l.contacted_at,
  l.converted_at,
  l.closed_at,
  s.lead_status,
  s.general_status::text as general_status,
  q.id as quote_id,
  q.status as quote_status,
  q.sale_id as converted_sale_id
from public.catalog_public_leads l
left join public.customers c on c.id = l.customer_id
left join public.products p on p.id = l.product_id
left join public.sales s on s.id = l.sales_lead_id
left join lateral (
  select sq.id, sq.status, sq.sale_id
  from public.sales_quotes sq
  where sq.lead_id = l.sales_lead_id
  order by sq.created_at desc
  limit 1
) q on true;

grant select on public.commercial_inbox_overview_v1 to authenticated;

grant execute on function public.public_create_catalog_lead_v2(text,text,uuid,text,text)
  to anon, authenticated, service_role;

grant execute on function public.sync_catalog_public_lead_to_commercial_v1(uuid)
  to authenticated, service_role;

grant execute on function public.set_commercial_inbox_status_v1(uuid,text)
  to authenticated, service_role;

do $$
declare
  r record;
begin
  for r in
    select id
    from public.catalog_public_leads
    where sales_lead_id is null
      and inbox_status not in ('converted','closed')
    order by created_at
  loop
    perform public.sync_catalog_public_lead_to_commercial_v1(r.id);
  end loop;
end $$;

commit;
