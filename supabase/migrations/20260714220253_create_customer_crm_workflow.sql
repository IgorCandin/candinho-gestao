alter table public.customers
  add column if not exists crm_status text not null default 'active',
  add column if not exists next_contact_at date,
  add column if not exists last_contact_at timestamptz,
  add column if not exists last_contact_outcome text,
  add column if not exists contact_lost boolean not null default false,
  add column if not exists tags text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_crm_status_valid'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_crm_status_valid
      check (crm_status in ('active','follow_up','post_sale','inactive','lost'));
  end if;
end $$;

create table if not exists public.customer_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  interaction_type text not null,
  status text not null default 'completed',
  channel text,
  occurred_at timestamptz,
  due_at date,
  completed_at timestamptz,
  outcome text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_interactions_type_valid check (
    interaction_type in ('contact','follow_up','post_sale','note','lost')
  ),
  constraint customer_interactions_status_valid check (
    status in ('planned','completed','cancelled')
  ),
  constraint customer_interactions_channel_valid check (
    channel is null or channel in ('WhatsApp','Ligação','Instagram','Presencial','Outro')
  ),
  constraint customer_interactions_planned_due check (
    status <> 'planned' or due_at is not null
  )
);

create index if not exists customer_interactions_customer_idx
  on public.customer_interactions(customer_id, created_at desc);
create index if not exists customer_interactions_due_idx
  on public.customer_interactions(status, due_at)
  where status = 'planned';
create index if not exists customer_interactions_sale_idx
  on public.customer_interactions(sale_id)
  where sale_id is not null;

create or replace function public.set_customer_interaction_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists customer_interactions_set_updated_at on public.customer_interactions;
create trigger customer_interactions_set_updated_at
before update on public.customer_interactions
for each row execute function public.set_customer_interaction_updated_at();

alter table public.customer_interactions enable row level security;
drop policy if exists customer_interactions_read on public.customer_interactions;
create policy customer_interactions_read on public.customer_interactions
for select to authenticated using (auth.uid() is not null);
drop policy if exists customer_interactions_write on public.customer_interactions;
create policy customer_interactions_write on public.customer_interactions
for all to authenticated using (public.can_write()) with check (public.can_write());

grant select, insert, update, delete on public.customer_interactions to authenticated;
grant select, insert, update, delete on public.customer_interactions to service_role;

create or replace function public.update_customer_profile(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_city text default null,
  p_reference text default null,
  p_email text default null,
  p_notes text default null,
  p_sensitive_to_caffeine boolean default false,
  p_anxiety_or_insomnia boolean default false,
  p_prohibited_products text default null,
  p_approach_preferences text default null,
  p_tags text default null,
  p_active boolean default true
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_name text := nullif(btrim(p_name), '');
  v_old public.customers%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar clientes';
  end if;
  if v_name is null then
    raise exception 'Informe o nome do cliente';
  end if;

  select * into v_old from public.customers where id = p_customer_id for update;
  if not found then raise exception 'Cliente não encontrado'; end if;

  update public.customers
  set name = v_name,
      phone = nullif(btrim(p_phone), ''),
      city = nullif(btrim(p_city), ''),
      reference = nullif(btrim(p_reference), ''),
      email = nullif(btrim(p_email), ''),
      notes = nullif(btrim(p_notes), ''),
      sensitive_to_caffeine = coalesce(p_sensitive_to_caffeine, false),
      anxiety_or_insomnia = coalesce(p_anxiety_or_insomnia, false),
      prohibited_products = nullif(btrim(p_prohibited_products), ''),
      approach_preferences = nullif(btrim(p_approach_preferences), ''),
      tags = nullif(btrim(p_tags), ''),
      active = coalesce(p_active, true),
      updated_at = now()
  where id = p_customer_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('customer', p_customer_id, 'profile_updated', jsonb_build_object(
    'old_name', v_old.name,
    'new_name', v_name,
    'sensitive_to_caffeine', coalesce(p_sensitive_to_caffeine, false),
    'anxiety_or_insomnia', coalesce(p_anxiety_or_insomnia, false),
    'active', coalesce(p_active, true)
  ));

  return p_customer_id;
end; $$;

create or replace function public.schedule_customer_followup(
  p_customer_id uuid,
  p_due_on date,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para agendar retornos';
  end if;
  if p_due_on is null then raise exception 'Informe a data do retorno'; end if;
  if not exists(select 1 from public.customers where id=p_customer_id and active) then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  insert into public.customer_interactions(
    customer_id, interaction_type, status, due_at, notes
  ) values (
    p_customer_id, 'follow_up', 'planned', p_due_on, nullif(btrim(p_notes),'')
  ) returning id into v_id;

  update public.customers
  set crm_status='follow_up', next_contact_at=p_due_on, contact_lost=false, updated_at=now()
  where id=p_customer_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('customer',p_customer_id,'followup_scheduled',jsonb_build_object('interaction_id',v_id,'due_on',p_due_on));
  return v_id;
end; $$;

create or replace function public.register_customer_interaction(
  p_customer_id uuid,
  p_interaction_type text,
  p_contact_on date default null,
  p_channel text default null,
  p_outcome text default null,
  p_notes text default null,
  p_sale_id uuid default null,
  p_next_contact_on date default null,
  p_followup_id uuid default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_id uuid;
  v_at timestamptz;
  v_next_id uuid;
  v_allowed_types constant text[] := array['contact','post_sale','note','lost'];
  v_allowed_channels constant text[] := array['WhatsApp','Ligação','Instagram','Presencial','Outro'];
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar contatos';
  end if;
  if p_interaction_type is null or not (p_interaction_type = any(v_allowed_types)) then
    raise exception 'Tipo de interação inválido';
  end if;
  if p_channel is not null and not (p_channel = any(v_allowed_channels)) then
    raise exception 'Canal de contato inválido';
  end if;
  if not exists(select 1 from public.customers where id=p_customer_id) then
    raise exception 'Cliente não encontrado';
  end if;
  if p_sale_id is not null and not exists(
    select 1 from public.sales where id=p_sale_id and customer_id=p_customer_id
  ) then
    raise exception 'Venda não pertence a este cliente';
  end if;

  v_at := ((coalesce(p_contact_on,(now() at time zone 'America/Sao_Paulo')::date))::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  if p_followup_id is not null then
    update public.customer_interactions
    set status='completed', completed_at=v_at, occurred_at=coalesce(occurred_at,v_at),
        outcome=coalesce(nullif(btrim(p_outcome),''),outcome),
        notes=coalesce(nullif(btrim(p_notes),''),notes)
    where id=p_followup_id and customer_id=p_customer_id and status='planned';
    if not found then raise exception 'Retorno pendente não encontrado'; end if;
  end if;

  insert into public.customer_interactions(
    customer_id,sale_id,interaction_type,status,channel,occurred_at,completed_at,outcome,notes
  ) values (
    p_customer_id,p_sale_id,p_interaction_type,'completed',p_channel,v_at,v_at,
    nullif(btrim(p_outcome),''),nullif(btrim(p_notes),'')
  ) returning id into v_id;

  if p_next_contact_on is not null then
    insert into public.customer_interactions(customer_id,interaction_type,status,due_at,notes)
    values(p_customer_id,'follow_up','planned',p_next_contact_on,'Retorno agendado após contato')
    returning id into v_next_id;
  end if;

  update public.customers
  set last_contact_at=v_at,
      last_contact_outcome=coalesce(nullif(btrim(p_outcome),''),last_contact_outcome),
      next_contact_at=p_next_contact_on,
      contact_lost=(p_interaction_type='lost'),
      crm_status=case
        when p_interaction_type='lost' then 'lost'
        when p_next_contact_on is not null then 'follow_up'
        when p_interaction_type='post_sale' then 'post_sale'
        else 'active'
      end,
      updated_at=now()
  where id=p_customer_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('customer',p_customer_id,'interaction_registered',jsonb_build_object(
    'interaction_id',v_id,
    'type',p_interaction_type,
    'channel',p_channel,
    'contact_on',coalesce(p_contact_on,(now() at time zone 'America/Sao_Paulo')::date),
    'next_contact_on',p_next_contact_on,
    'sale_id',p_sale_id,
    'completed_followup_id',p_followup_id,
    'next_followup_id',v_next_id
  ));
  return v_id;
end; $$;

revoke all on function public.update_customer_profile(uuid,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean) from public,anon;
revoke all on function public.schedule_customer_followup(uuid,date,text) from public,anon;
revoke all on function public.register_customer_interaction(uuid,text,date,text,text,text,uuid,date,uuid) from public,anon;
grant execute on function public.update_customer_profile(uuid,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean) to authenticated,service_role;
grant execute on function public.schedule_customer_followup(uuid,date,text) to authenticated,service_role;
grant execute on function public.register_customer_interaction(uuid,text,date,text,text,text,uuid,date,uuid) to authenticated,service_role;

create or replace view public.customer_interaction_history
with (security_invoker=true) as
select
  ci.id,
  ci.customer_id,
  ci.sale_id,
  ci.interaction_type,
  ci.status,
  ci.channel,
  ci.occurred_at,
  ci.due_at,
  ci.completed_at,
  ci.outcome,
  ci.notes,
  ci.created_at,
  p.full_name created_by_name,
  s.total_amount sale_total,
  coalesce(items.product_summary, null) sale_product_summary
from public.customer_interactions ci
left join public.profiles p on p.id=ci.created_by
left join public.sales s on s.id=ci.sale_id
left join lateral(
  select string_agg(pr.name||' ×'||si.quantity::text,', ' order by pr.name) product_summary
  from public.sale_items si join public.products pr on pr.id=si.product_id
  where si.sale_id=ci.sale_id
) items on true;

create or replace view public.customer_crm_overview
with (security_invoker=true) as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date today
),
next_followup as (
  select distinct on (customer_id)
    customer_id,id interaction_id,due_at,notes
  from public.customer_interactions
  where status='planned'
  order by customer_id,due_at asc,created_at asc
),
interaction_totals as (
  select customer_id,
    count(*) filter(where status='completed')::integer interaction_count,
    count(*) filter(where status='planned')::integer pending_followup_count
  from public.customer_interactions
  group by customer_id
)
select
  cd.*,
  c.crm_status,
  c.next_contact_at,
  c.last_contact_at,
  c.last_contact_outcome,
  c.contact_lost,
  c.tags,
  nf.interaction_id next_followup_id,
  coalesce(nf.due_at,c.next_contact_at) next_followup_at,
  nf.notes next_followup_notes,
  coalesce(it.interaction_count,0) interaction_count,
  coalesce(it.pending_followup_count,0) pending_followup_count,
  case when cd.last_purchase_at is null then null else ((select today from brazil_today) - (cd.last_purchase_at at time zone 'America/Sao_Paulo')::date) end days_since_last_purchase,
  case when c.last_contact_at is null then null else ((select today from brazil_today) - (c.last_contact_at at time zone 'America/Sao_Paulo')::date) end days_since_last_contact,
  (c.sensitive_to_caffeine or c.anxiety_or_insomnia or c.prohibited_products is not null) care_alert,
  case
    when c.contact_lost or c.crm_status='lost' then 'lost'
    when coalesce(nf.due_at,c.next_contact_at) < (select today from brazil_today) then 'overdue_followup'
    when coalesce(nf.due_at,c.next_contact_at) = (select today from brazil_today) then 'due_today'
    when cd.pending_sales_count > 0 then 'pending_order'
    when cd.purchase_count = 0 and cd.lead_count > 0 then 'lead_only'
    when cd.last_purchase_at is not null and (cd.last_purchase_at at time zone 'America/Sao_Paulo')::date <= (select today from brazil_today)-45 then 'inactive'
    when c.sensitive_to_caffeine or c.anxiety_or_insomnia or c.prohibited_products is not null then 'care'
    else 'active'
  end radar_status,
  case
    when c.contact_lost or c.crm_status='lost' then 7
    when coalesce(nf.due_at,c.next_contact_at) < (select today from brazil_today) then 1
    when coalesce(nf.due_at,c.next_contact_at) = (select today from brazil_today) then 2
    when cd.pending_sales_count > 0 then 3
    when cd.purchase_count = 0 and cd.lead_count > 0 then 4
    when cd.last_purchase_at is not null and (cd.last_purchase_at at time zone 'America/Sao_Paulo')::date <= (select today from brazil_today)-45 then 5
    when c.sensitive_to_caffeine or c.anxiety_or_insomnia or c.prohibited_products is not null then 6
    else 8
  end radar_rank,
  case
    when c.contact_lost or c.crm_status='lost' then 'Contato perdido'
    when coalesce(nf.due_at,c.next_contact_at) < (select today from brazil_today) then 'Retorno atrasado'
    when coalesce(nf.due_at,c.next_contact_at) = (select today from brazil_today) then 'Retornar hoje'
    when cd.pending_sales_count > 0 then 'Acompanhar pedido'
    when cd.purchase_count = 0 and cd.lead_count > 0 then 'Converter lead'
    when cd.last_purchase_at is not null and (cd.last_purchase_at at time zone 'America/Sao_Paulo')::date <= (select today from brazil_today)-45 then 'Reativar cliente'
    when c.sensitive_to_caffeine or c.anxiety_or_insomnia or c.prohibited_products is not null then 'Atendimento com cuidado'
    else 'Relacionamento ativo'
  end next_action_label
from public.customer_details cd
join public.customers c on c.id=cd.id
left join next_followup nf on nf.customer_id=cd.id
left join interaction_totals it on it.customer_id=cd.id;

create or replace view public.customer_crm_summary
with (security_invoker=true) as
select
  count(*) filter(where active)::integer total_active_customers,
  count(*) filter(where radar_status='due_today')::integer followups_today,
  count(*) filter(where radar_status='overdue_followup')::integer overdue_followups,
  count(*) filter(where radar_status='inactive')::integer inactive_customers,
  count(*) filter(where radar_status='lead_only')::integer lead_only_customers,
  count(*) filter(where care_alert)::integer care_customers,
  count(*) filter(where pending_sales_count>0)::integer customers_with_pending_orders,
  coalesce(sum(total_spent),0)::numeric(12,2) total_customer_value
from public.customer_crm_overview;

revoke all on public.customer_interaction_history from public,anon;
revoke all on public.customer_crm_overview from public,anon;
revoke all on public.customer_crm_summary from public,anon;
grant select on public.customer_interaction_history to authenticated,service_role;
grant select on public.customer_crm_overview to authenticated,service_role;
grant select on public.customer_crm_summary to authenticated,service_role;
