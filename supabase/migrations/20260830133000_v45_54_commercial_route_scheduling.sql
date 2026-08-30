-- V45.54 · Agendamento de Rotas + fila temporária por cidade
-- Base alvo: main 0b5b7f31ec4dec0a3ea77c579e783ecddc34349e
-- IMPORTANTE: migration incremental. Não foi aplicada em produção durante a geração do pacote.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: usa somente estruturas já existentes no main atual.
-- ---------------------------------------------------------------------------
do $preflight$
begin
  if to_regclass('public.customers') is null
     or to_regclass('public.customer_interactions') is null
     or to_regclass('public.sales_quotes') is null
     or to_regclass('public.ux_health_signals') is null then
    raise exception 'V45.54 preflight: estrutura base esperada não encontrada';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='register_customer_interaction'
  ) then
    raise exception 'V45.54 preflight: register_customer_interaction não encontrada';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='sales_quotes'
      and column_name='payment_due_on'
      and data_type='date'
  ) then
    raise exception 'V45.54 preflight: sales_quotes.payment_due_on não encontrado';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Normalização de cidade.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_commercial_route_city_v1(p_city text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      btrim(coalesce(p_city,'')),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Agenda de rotas.
-- ---------------------------------------------------------------------------
create table if not exists public.commercial_route_schedules (
  id uuid primary key default gen_random_uuid(),
  route_on date not null,
  city text not null,
  city_key text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  notes text,
  prepared_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(city)) between 2 and 120),
  check (city_key <> '')
);

create unique index if not exists commercial_route_schedules_active_city_day_uidx
  on public.commercial_route_schedules(route_on,city_key)
  where status <> 'cancelled';

create index if not exists commercial_route_schedules_day_idx
  on public.commercial_route_schedules(route_on,status);

alter table public.commercial_route_schedules enable row level security;

drop policy if exists "commercial_route_schedules_select" on public.commercial_route_schedules;
create policy "commercial_route_schedules_select"
on public.commercial_route_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id=auth.uid() and p.active
  )
);

grant select on public.commercial_route_schedules to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fila temporária separada da Fila Comercial.
-- ---------------------------------------------------------------------------
create table if not exists public.commercial_route_customers (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.commercial_route_schedules(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','notified','skipped')),
  prepared_at timestamptz not null default now(),
  notified_at timestamptz,
  skipped_at timestamptz,
  last_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(route_id,customer_id)
);

create index if not exists commercial_route_customers_route_status_idx
  on public.commercial_route_customers(route_id,status,created_at);

alter table public.commercial_route_customers enable row level security;

drop policy if exists "commercial_route_customers_select" on public.commercial_route_customers;
create policy "commercial_route_customers_select"
on public.commercial_route_customers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id=auth.uid() and p.active
  )
);

grant select on public.commercial_route_customers to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Agendar rota por data + cidade.
--    A mesma data/cidade ativa é reaproveitada em vez de duplicada.
-- ---------------------------------------------------------------------------
create or replace function public.commercial_schedule_route_v1(
  p_route_on date,
  p_city text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_city text := regexp_replace(btrim(coalesce(p_city,'')), '\s+', ' ', 'g');
  v_city_key text := public.normalize_commercial_route_city_v1(p_city);
  v_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para agendar rota';
  end if;

  if p_route_on is null then
    raise exception 'Data da rota é obrigatória';
  end if;

  if length(v_city) < 2 then
    raise exception 'Cidade inválida';
  end if;

  select r.id
  into v_id
  from public.commercial_route_schedules r
  where r.route_on=p_route_on
    and r.city_key=v_city_key
    and r.status<>'cancelled'
  order by r.created_at
  limit 1
  for update;

  if v_id is not null then
    update public.commercial_route_schedules
    set
      city=v_city,
      notes=coalesce(nullif(btrim(p_notes),''),notes),
      updated_at=now()
    where id=v_id;

    return v_id;
  end if;

  begin
    insert into public.commercial_route_schedules(
      route_on,city,city_key,notes,created_by
    )
    values(
      p_route_on,
      v_city,
      v_city_key,
      nullif(btrim(p_notes),''),
      auth.uid()
    )
    returning id into v_id;
  exception
    when unique_violation then
      select r.id
      into v_id
      from public.commercial_route_schedules r
      where r.route_on=p_route_on
        and r.city_key=v_city_key
        and r.status<>'cancelled'
      order by r.created_at
      limit 1;
  end;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'commercial_route',
    v_id,
    'route_scheduled',
    jsonb_build_object(
      'route_on',p_route_on,
      'city',v_city
    )
  );

  return v_id;
end;
$$;

revoke all on function public.commercial_schedule_route_v1(date,text,text) from public;
grant execute on function public.commercial_schedule_route_v1(date,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Preparação idempotente de clientes do CRM.
--    Pode rodar várias vezes: só insere clientes ainda ausentes daquela rota.
-- ---------------------------------------------------------------------------
create or replace function public.commercial_prepare_route_v1(p_route_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_route public.commercial_route_schedules%rowtype;
  v_inserted integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para preparar rota';
  end if;

  select *
  into v_route
  from public.commercial_route_schedules
  where id=p_route_id
  for update;

  if not found then
    raise exception 'Rota não encontrada';
  end if;

  if v_route.status='cancelled' then
    raise exception 'Rota cancelada não pode ser preparada';
  end if;

  if v_route.status='completed' then
    return 0;
  end if;

  insert into public.commercial_route_customers(
    route_id,
    customer_id
  )
  select
    v_route.id,
    c.id
  from public.customers c
  where c.active
    and coalesce(btrim(c.city),'')<>''
    and public.normalize_commercial_route_city_v1(c.city)=v_route.city_key
  on conflict(route_id,customer_id) do nothing;

  get diagnostics v_inserted = row_count;

  update public.commercial_route_schedules
  set
    prepared_at=coalesce(prepared_at,now()),
    status=case
      when status='completed' then status
      when route_on <= (now() at time zone 'America/Sao_Paulo')::date
        then 'in_progress'
      else status
    end,
    updated_at=now()
  where id=v_route.id;

  if v_inserted > 0 then
    insert into public.audit_events(entity_type,entity_id,action,details)
    values(
      'commercial_route',
      v_route.id,
      'route_customers_prepared',
      jsonb_build_object(
        'inserted_customers',v_inserted,
        'route_on',v_route.route_on,
        'city',v_route.city
      )
    );
  end if;

  return v_inserted;
end;
$$;

revoke all on function public.commercial_prepare_route_v1(uuid) from public;
grant execute on function public.commercial_prepare_route_v1(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Preparar automaticamente na véspera ou no dia da rota ao entrar no ERP.
--    O front chama esta RPC ao abrir a aba Rotas.
-- ---------------------------------------------------------------------------
create or replace function public.commercial_prepare_due_routes_v1()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_route_id uuid;
  v_count integer := 0;
begin
  if not public.can_write() then
    return 0;
  end if;

  for v_route_id in
    select r.id
    from public.commercial_route_schedules r
    where r.status in ('scheduled','in_progress')
      and r.route_on between v_today and (v_today + 1)
    order by r.route_on,r.created_at
  loop
    perform public.commercial_prepare_route_v1(v_route_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.commercial_prepare_due_routes_v1() from public;
grant execute on function public.commercial_prepare_due_routes_v1() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Ações da fila:
--    notified -> registra contato real no CRM via register_customer_interaction
--    skipped  -> pula sem mexer no CRM
--    pending  -> volta para pendente sem apagar o histórico já registrado
-- ---------------------------------------------------------------------------
create or replace function public.commercial_route_customer_action_v1(
  p_route_customer_id uuid,
  p_action text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_row record;
  v_should_register boolean := false;
  v_note text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar a fila de rota';
  end if;

  if v_action not in ('notified','skipped','pending') then
    raise exception 'Ação inválida para fila de rota';
  end if;

  select
    q.id,
    q.customer_id,
    q.status,
    q.notified_at,
    r.id route_id,
    r.route_on,
    r.city
  into v_row
  from public.commercial_route_customers q
  join public.commercial_route_schedules r on r.id=q.route_id
  where q.id=p_route_customer_id
  for update of q;

  if not found then
    raise exception 'Cliente da rota não encontrado';
  end if;

  v_should_register :=
    v_action='notified'
    and (v_row.status<>'notified' or v_row.notified_at is null);

  v_note := concat(
    '[Rota ',
    to_char(v_row.route_on,'DD/MM/YYYY'),
    ' · ',
    v_row.city,
    ']',
    case
      when nullif(btrim(p_notes),'') is not null
        then ' '||btrim(p_notes)
      else ''
    end
  );

  update public.commercial_route_customers
  set
    status=v_action,
    notified_at=case
      when v_action='notified' then coalesce(notified_at,now())
      else notified_at
    end,
    skipped_at=case
      when v_action='skipped' then now()
      else skipped_at
    end,
    last_action_at=now(),
    notes=case
      when nullif(btrim(p_notes),'') is not null then btrim(p_notes)
      else notes
    end,
    updated_at=now()
  where id=p_route_customer_id;

  if v_should_register then
    perform public.register_customer_interaction(
      v_row.customer_id,
      'contact',
      (now() at time zone 'America/Sao_Paulo')::date,
      'WhatsApp',
      'Avisado sobre rota',
      v_note,
      null,
      null,
      null
    );
  end if;

  update public.commercial_route_schedules r
  set
    status=case
      when exists (
        select 1
        from public.commercial_route_customers q
        where q.route_id=r.id
          and q.status='pending'
      ) then 'in_progress'
      else 'completed'
    end,
    updated_at=now()
  where r.id=v_row.route_id
    and r.status<>'cancelled';

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'commercial_route_customer',
    p_route_customer_id,
    'route_customer_action',
    jsonb_build_object(
      'route_id',v_row.route_id,
      'customer_id',v_row.customer_id,
      'action',v_action,
      'registered_crm_contact',v_should_register
    )
  );
end;
$$;

revoke all on function public.commercial_route_customer_action_v1(uuid,text,text) from public;
grant execute on function public.commercial_route_customer_action_v1(uuid,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Views para a aba Rotas.
-- ---------------------------------------------------------------------------
create or replace view public.commercial_route_schedule_overview_v1
with (security_invoker=true)
as
select
  r.id,
  r.route_on,
  r.city,
  r.status,
  r.notes,
  r.prepared_at,
  r.created_at,
  r.updated_at,
  count(q.id)::integer as customer_count,
  count(q.id) filter (where q.status='pending')::integer as pending_count,
  count(q.id) filter (where q.status='notified')::integer as notified_count,
  count(q.id) filter (where q.status='skipped')::integer as skipped_count
from public.commercial_route_schedules r
left join public.commercial_route_customers q on q.route_id=r.id
group by r.id;

grant select on public.commercial_route_schedule_overview_v1 to authenticated;

create or replace view public.commercial_route_queue_v1
with (security_invoker=true)
as
select
  r.id as route_id,
  r.route_on,
  r.city as route_city,
  r.status as route_status,
  q.id as route_customer_id,
  q.status,
  q.prepared_at,
  q.notified_at,
  q.skipped_at,
  q.last_action_at,
  q.notes,
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.city as customer_city,
  c.reference,
  c.last_contact_at,
  c.last_contact_outcome
from public.commercial_route_customers q
join public.commercial_route_schedules r on r.id=q.route_id
join public.customers c on c.id=q.customer_id
order by
  case q.status
    when 'pending' then 1
    when 'notified' then 2
    else 3
  end,
  c.name;

grant select on public.commercial_route_queue_v1 to authenticated;

-- ---------------------------------------------------------------------------
-- 9. UX Doctor · fechar somente os 4 sinais históricos conhecidos.
--    nexus_record_ux_health_signal_v1 já reabre o fingerprint automaticamente
--    ao receber nova ocorrência (status='active', resolved_at=null).
-- ---------------------------------------------------------------------------
update public.ux_health_signals
set
  status='resolved',
  resolved_at=now(),
  resolution_note='V45.54: sinal histórico encerrado após hardening/estabilização. A RPC reabre automaticamente se o mesmo fingerprint reaparecer.'
where status='active'
  and fingerprint in (
    '0f503e9b13ea0490322835b17b6c502f', -- /suplementos/hoje
    'ac9250a3bf93d684bfcad798da982a0f', -- /bank
    'dc584151b430e65b106774c282b43335', -- /dashboard
    '03947fec8b4b34f9d77392b6375c19d2'  -- /suplementos/vendas
  );

commit;
