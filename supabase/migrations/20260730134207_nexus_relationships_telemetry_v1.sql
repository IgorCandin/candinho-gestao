begin;

create table if not exists public.customer_relationships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  related_customer_id uuid not null references public.customers(id) on delete cascade,
  relation_type text not null,
  relation_label text,
  notes text,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_relationships_not_self check (customer_id <> related_customer_id),
  constraint customer_relationships_unique unique (customer_id, related_customer_id, relation_type)
);

create index if not exists customer_relationships_customer_idx
  on public.customer_relationships(customer_id, active);
create index if not exists customer_relationships_related_idx
  on public.customer_relationships(related_customer_id, active);

create table if not exists public.customer_partner_affiliations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  relation_type text not null default 'client_of_partner',
  relation_label text,
  counts_for_partnership boolean not null default true,
  auto_attribute_sales boolean not null default true,
  is_primary boolean not null default false,
  priority integer not null default 100,
  valid_from date,
  valid_until date,
  notes text,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_partner_affiliations_unique unique (customer_id, partner_id, relation_type)
);

create unique index if not exists customer_partner_affiliations_primary_idx
  on public.customer_partner_affiliations(customer_id)
  where active and is_primary and counts_for_partnership and auto_attribute_sales;
create index if not exists customer_partner_affiliations_partner_idx
  on public.customer_partner_affiliations(partner_id, active);

create table if not exists public.nexus_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  session_id text,
  route text not null,
  previous_route text,
  target_route text,
  action_kind text not null default 'page_view',
  action_key text,
  operation_scope text not null default 'supplements',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nexus_activity_user_created_idx
  on public.nexus_activity_events(user_id, created_at desc);
create index if not exists nexus_activity_route_created_idx
  on public.nexus_activity_events(route, created_at desc);

create table if not exists public.nexus_signals (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  signal_type text not null,
  severity text not null default 'info',
  operation_scope text not null default 'supplements',
  entity_type text,
  entity_id uuid,
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete cascade,
  title text not null,
  summary text,
  rationale text,
  recommended_action text,
  action_label text,
  action_href text,
  score numeric not null default 0,
  status text not null default 'open',
  snoozed_until timestamptz,
  generated_by text not null default 'engine',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists nexus_signals_open_idx
  on public.nexus_signals(operation_scope, status, score desc, last_seen_at desc);
create index if not exists nexus_signals_customer_idx
  on public.nexus_signals(customer_id, status, last_seen_at desc);

create or replace function public.nexus_touch_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customer_relationships_updated_at on public.customer_relationships;
create trigger trg_customer_relationships_updated_at
before update on public.customer_relationships
for each row execute function public.nexus_touch_updated_at_v1();

drop trigger if exists trg_customer_partner_affiliations_updated_at on public.customer_partner_affiliations;
create trigger trg_customer_partner_affiliations_updated_at
before update on public.customer_partner_affiliations
for each row execute function public.nexus_touch_updated_at_v1();

drop trigger if exists trg_nexus_signals_updated_at on public.nexus_signals;
create trigger trg_nexus_signals_updated_at
before update on public.nexus_signals
for each row execute function public.nexus_touch_updated_at_v1();

create or replace function public.inverse_customer_relationship_type_v1(p_relation_type text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_relation_type,'other'))
    when 'spouse' then 'spouse'
    when 'mother' then 'child'
    when 'father' then 'child'
    when 'parent' then 'child'
    when 'child' then 'parent'
    when 'sibling' then 'sibling'
    when 'friend' then 'friend'
    when 'colleague' then 'colleague'
    when 'trainer' then 'student'
    when 'student' then 'trainer'
    when 'referred_by' then 'referred'
    when 'referred' then 'referred_by'
    when 'family' then 'family'
    else 'other'
  end;
$$;

create or replace function public.resolve_customer_auto_partner_v1(p_customer_id uuid)
returns table (
  partner_id uuid,
  partner_name text,
  relation_type text,
  relation_label text,
  affiliation_id uuid
)
language sql
security definer
set search_path to 'public'
as $$
  select a.partner_id,p.name,a.relation_type,a.relation_label,a.id
  from public.customer_partner_affiliations a
  join public.partners p on p.id=a.partner_id
  where a.customer_id=p_customer_id
    and a.active
    and a.counts_for_partnership
    and a.auto_attribute_sales
    and coalesce(p.active,true)
    and lower(coalesce(p.partner_type,''))<>'supplier'
    and (a.valid_from is null or a.valid_from <= (now() at time zone 'America/Sao_Paulo')::date)
    and (a.valid_until is null or a.valid_until >= (now() at time zone 'America/Sao_Paulo')::date)
  order by a.is_primary desc,a.priority desc,a.created_at asc
  limit 1;
$$;

grant execute on function public.resolve_customer_auto_partner_v1(uuid) to authenticated,service_role;

create or replace function public.get_customer_network_v1(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_relationships jsonb;
  v_affiliations jsonb;
  v_auto_partner jsonb;
begin
  if auth.uid() is null and current_user<>'service_role' then
    raise exception 'Usuário não autenticado';
  end if;

  select coalesce(jsonb_agg(x order by x->>'related_name'),'[]'::jsonb)
  into v_relationships
  from (
    select jsonb_build_object(
      'id',r.id,'direction','outgoing','related_customer_id',r.related_customer_id,
      'related_name',rc.name,'relation_type',r.relation_type,
      'relation_label',r.relation_label,'notes',r.notes,'active',r.active
    ) x
    from public.customer_relationships r
    join public.customers rc on rc.id=r.related_customer_id
    where r.customer_id=p_customer_id and r.active

    union all

    select jsonb_build_object(
      'id',r.id,'direction','incoming','related_customer_id',r.customer_id,
      'related_name',rc.name,
      'relation_type',public.inverse_customer_relationship_type_v1(r.relation_type),
      'relation_label',r.relation_label,'notes',r.notes,'active',r.active
    ) x
    from public.customer_relationships r
    join public.customers rc on rc.id=r.customer_id
    where r.related_customer_id=p_customer_id and r.active
  ) q;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',a.id,'partner_id',a.partner_id,'partner_name',p.name,
      'partner_type',p.partner_type,'relation_type',a.relation_type,
      'relation_label',a.relation_label,'counts_for_partnership',a.counts_for_partnership,
      'auto_attribute_sales',a.auto_attribute_sales,'is_primary',a.is_primary,
      'priority',a.priority,'valid_from',a.valid_from,'valid_until',a.valid_until,
      'notes',a.notes,'active',a.active
    ) order by a.is_primary desc,a.priority desc,p.name
  ),'[]'::jsonb)
  into v_affiliations
  from public.customer_partner_affiliations a
  join public.partners p on p.id=a.partner_id
  where a.customer_id=p_customer_id and a.active;

  select to_jsonb(r) into v_auto_partner
  from public.resolve_customer_auto_partner_v1(p_customer_id) r;

  return jsonb_build_object(
    'customer_id',p_customer_id,
    'relationships',coalesce(v_relationships,'[]'::jsonb),
    'affiliations',coalesce(v_affiliations,'[]'::jsonb),
    'auto_partner',v_auto_partner
  );
end;
$$;

grant execute on function public.get_customer_network_v1(uuid) to authenticated,service_role;

create or replace function public.apply_customer_auto_partner_quote_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_partner_id uuid;
begin
  if new.customer_id is null then return new; end if;

  -- Atribuição automática só preenche quando o fluxo não informou parceiro.
  -- Uma escolha manual explícita sempre vence.
  if new.partner_id is null then
    select r.partner_id into v_partner_id
    from public.resolve_customer_auto_partner_v1(new.customer_id) r;

    if v_partner_id is not null then
      new.partner_id:=v_partner_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_quotes_auto_partner on public.sales_quotes;
create trigger trg_sales_quotes_auto_partner
before insert or update of customer_id,partner_id on public.sales_quotes
for each row execute function public.apply_customer_auto_partner_quote_v1();

create or replace function public.apply_customer_auto_partner_sale_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_partner_id uuid;
  v_partner_name text;
begin
  if new.record_type::text<>'sale' or new.customer_id is null then return new; end if;

  -- Atribuição automática só preenche quando não houve escolha manual.
  if new.partner_id is null then
    select r.partner_id,r.partner_name into v_partner_id,v_partner_name
    from public.resolve_customer_auto_partner_v1(new.customer_id) r;

    if v_partner_id is not null then
      new.partner_id:=v_partner_id;
      new.partnership:=v_partner_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_auto_partner on public.sales;
create trigger trg_sales_auto_partner
before insert or update of customer_id,partner_id on public.sales
for each row execute function public.apply_customer_auto_partner_sale_v1();

create or replace function public.get_nexus_usage_summary_v1(p_days integer default 30)
returns table(route text,visits bigint,distinct_days bigint,last_seen_at timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select e.route,count(*)::bigint,
    count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)::bigint,
    max(e.created_at)
  from public.nexus_activity_events e
  where e.user_id=auth.uid()
    and e.action_kind='page_view'
    and e.created_at>=now()-make_interval(days=>greatest(coalesce(p_days,30),1))
  group by e.route
  order by count(*) desc,max(e.created_at) desc
  limit 12;
$$;

grant execute on function public.get_nexus_usage_summary_v1(integer) to authenticated,service_role;

create or replace function public.get_nexus_route_transitions_v1(p_days integer default 30)
returns table(from_route text,to_route text,transitions bigint,last_seen_at timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select e.previous_route,e.route,count(*)::bigint,max(e.created_at)
  from public.nexus_activity_events e
  where e.user_id=auth.uid()
    and e.action_kind='page_view'
    and e.previous_route is not null
    and e.previous_route<>e.route
    and e.created_at>=now()-make_interval(days=>greatest(coalesce(p_days,30),1))
  group by e.previous_route,e.route
  order by count(*) desc,max(e.created_at) desc
  limit 8;
$$;

grant execute on function public.get_nexus_route_transitions_v1(integer) to authenticated,service_role;

create or replace function public.update_nexus_signal_status_v1(
  p_signal_id uuid,p_action text,p_snooze_days integer default 3
)
returns public.nexus_signals
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_row public.nexus_signals%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para atualizar sinais do Nexus';
  end if;

  update public.nexus_signals
  set status=case lower(p_action)
      when 'resolve' then 'resolved'
      when 'dismiss' then 'dismissed'
      when 'snooze' then 'snoozed'
      when 'reopen' then 'open'
      else status end,
      snoozed_until=case when lower(p_action)='snooze'
        then now()+make_interval(days=>greatest(coalesce(p_snooze_days,3),1)) else null end,
      resolved_at=case when lower(p_action)='resolve' then now()
        when lower(p_action)='reopen' then null else resolved_at end,
      updated_at=now()
  where id=p_signal_id
  returning * into v_row;

  if not found then raise exception 'Sinal do Nexus não encontrado'; end if;
  return v_row;
end;
$$;

grant execute on function public.update_nexus_signal_status_v1(uuid,text,integer)
to authenticated,service_role;

alter table public.customer_relationships enable row level security;
alter table public.customer_partner_affiliations enable row level security;
alter table public.nexus_activity_events enable row level security;
alter table public.nexus_signals enable row level security;

create policy customer_relationships_read_v1 on public.customer_relationships
for select to authenticated using(true);
create policy customer_relationships_write_v1 on public.customer_relationships
for all to authenticated using(public.can_write()) with check(public.can_write());

create policy customer_partner_affiliations_read_v1 on public.customer_partner_affiliations
for select to authenticated using(true);
create policy customer_partner_affiliations_write_v1 on public.customer_partner_affiliations
for all to authenticated using(public.can_write()) with check(public.can_write());

create policy nexus_activity_insert_v1 on public.nexus_activity_events
for insert to authenticated with check(user_id=auth.uid());
create policy nexus_activity_read_own_v1 on public.nexus_activity_events
for select to authenticated using(
  user_id=auth.uid() or exists(
    select 1 from public.profiles p where p.id=auth.uid()
      and (p.role::text='admin' or coalesce(p.can_manage_users,false))
  )
);

create policy nexus_signals_read_v1 on public.nexus_signals
for select to authenticated using(true);
create policy nexus_signals_write_v1 on public.nexus_signals
for all to authenticated using(public.can_write()) with check(public.can_write());

commit;
