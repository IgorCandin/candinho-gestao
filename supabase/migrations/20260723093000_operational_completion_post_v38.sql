begin;

-- Candinho Company · fechamento operacional pós-V38
-- Parceiros, isolamento do Portal Parceiro, integrações, calendário e patrocínios Physique.

-- -----------------------------------------------------------------------------
-- 1) RECOMPENSA ANTECIPADA DE PARCEIRO SEM DUPLICAR O PRÓXIMO CICLO
-- -----------------------------------------------------------------------------

alter table public.partnership_settlements
  add column if not exists cycle_closed_at timestamptz;

create table if not exists public.partnership_reward_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.partnership_settlements(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity integer not null check (quantity>0),
  product_name_snapshot text not null,
  flavor_name_snapshot text,
  unit_cost_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_partnership_reward_items_settlement
  on public.partnership_reward_items(settlement_id);
create index if not exists idx_partnership_reward_items_partner
  on public.partnership_reward_items(partner_id,created_at desc);

alter table public.partnership_reward_items enable row level security;
drop policy if exists partnership_reward_items_manage on public.partnership_reward_items;
create policy partnership_reward_items_manage
on public.partnership_reward_items
for all
to authenticated
using (public.can_write())
with check (public.can_write());
revoke all on public.partnership_reward_items from public,anon,authenticated;
grant select on public.partnership_reward_items to authenticated;

create or replace function public.register_partner_reward_delivery(
  p_partner_id uuid,
  p_delivered_on date default null,
  p_reward_units integer default 1,
  p_reward_description text default null,
  p_notes text default null,
  p_product_id uuid default null,
  p_flavor_id uuid default null,
  p_location_id uuid default null,
  p_product_quantity integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.partners%rowtype;
  v_product public.products%rowtype;
  v_location public.locations%rowtype;
  v_flavor_name text;
  v_id uuid;
  v_start_at timestamptz;
  v_closed_at timestamptz := now();
  v_count integer := 0;
  v_revenue numeric(12,2) := 0;
  v_profit numeric(12,2) := 0;
  v_units integer := greatest(coalesce(p_reward_units,1),1);
  v_product_quantity integer := greatest(coalesce(p_product_quantity,1),1);
  v_delivered_on date := coalesce(p_delivered_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_description text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar recompensas';
  end if;

  select * into v_partner
  from public.partners
  where id=p_partner_id
    and lower(partner_type)<>'supplier'
  for update;

  if not found then raise exception 'Parceiro não encontrado'; end if;
  if v_partner.reward_type<>'gift_per_sales' then
    raise exception 'Este parceiro não utiliza recompensa por meta de vendas';
  end if;

  if p_product_id is not null then
    if p_location_id is null then raise exception 'Selecione o estoque de origem do brinde'; end if;

    select * into v_product from public.products where id=p_product_id and active;
    if not found then raise exception 'Produto do brinde inválido ou inativo'; end if;

    select * into v_location from public.locations where id=p_location_id and active and tracks_inventory;
    if not found then raise exception 'Estoque de origem inválido ou inativo'; end if;

    if coalesce(v_product.flavor_tracking_enabled,false) then
      if p_flavor_id is null then raise exception 'Selecione o sabor de %',v_product.name; end if;
      select name into v_flavor_name
      from public.product_flavors
      where id=p_flavor_id and product_id=p_product_id and active;
      if not found then raise exception 'Sabor inválido para %',v_product.name; end if;
    else
      if p_flavor_id is not null then raise exception 'O produto % não utiliza controle por sabor',v_product.name; end if;
      v_flavor_name:=null;
    end if;
  elsif p_flavor_id is not null or p_location_id is not null then
    raise exception 'Selecione o produto do brinde antes do sabor ou estoque';
  end if;

  select coalesce(
    ps.cycle_closed_at,
    ((ps.period_end + 1)::timestamp at time zone 'America/Sao_Paulo'),
    (coalesce(v_partner.start_date,date '2000-01-01')::timestamp at time zone 'America/Sao_Paulo')
  )
  into v_start_at
  from public.partnership_settlements ps
  where ps.partner_id=p_partner_id
  order by
    coalesce(
      ps.cycle_closed_at,
      ((ps.period_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    ) desc,
    ps.created_at desc
  limit 1;

  v_start_at := coalesce(
    v_start_at,
    (coalesce(v_partner.start_date,date '2000-01-01')::timestamp at time zone 'America/Sao_Paulo')
  );

  select
    count(*)::integer,
    coalesce(sum(s.total_amount),0)::numeric(12,2),
    coalesce(sum(s.total_profit),0)::numeric(12,2)
  into v_count,v_revenue,v_profit
  from public.sales s
  where s.partner_id=p_partner_id
    and s.record_type='sale'
    and s.general_status<>'cancelled'
    and (not v_partner.counts_only_delivered or s.delivery_status='delivered')
    and coalesce(s.delivered_at,s.quoted_at)>=v_start_at
    and coalesce(s.delivered_at,s.quoted_at)<v_closed_at;

  if v_count<=0 then
    raise exception 'Não há vendas contabilizadas no ciclo atual para encerrar';
  end if;

  v_description:=coalesce(
    nullif(btrim(p_reward_description),''),
    case
      when p_product_id is not null then v_product_quantity::text||'× '||v_product.name||case when v_flavor_name is not null then ' · '||v_flavor_name else '' end
      else v_partner.reward_description
    end
  );

  insert into public.partnership_settlements(
    partner_id,settled_on,period_start,period_end,sale_count,gross_sales,gross_profit,
    reward_units,reward_amount,reward_description,notes,cycle_closed_at
  ) values (
    p_partner_id,
    v_delivered_on,
    (v_start_at at time zone 'America/Sao_Paulo')::date,
    (v_closed_at at time zone 'America/Sao_Paulo')::date,
    v_count,
    v_revenue,
    v_profit,
    v_units,
    0,
    v_description,
    nullif(btrim(p_notes),''),
    v_closed_at
  ) returning id into v_id;

  if p_product_id is not null then
    insert into public.partnership_reward_items(
      settlement_id,partner_id,product_id,flavor_id,location_id,quantity,
      product_name_snapshot,flavor_name_snapshot,unit_cost_snapshot
    ) values (
      v_id,p_partner_id,p_product_id,p_flavor_id,p_location_id,v_product_quantity,
      v_product.name,v_flavor_name,coalesce(v_product.cost_price,0)
    );

    insert into public.inventory_movements(
      product_id,location_id,flavor_id,movement_type,quantity_delta,notes,idempotency_key,created_by
    ) values (
      p_product_id,
      p_location_id,
      p_flavor_id,
      'adjustment',
      -v_product_quantity,
      'Recompensa de parceria · '||v_partner.name||' · '||coalesce(v_description,'Brinde'),
      'partner:reward:'||v_id::text||':product:'||p_product_id::text,
      auth.uid()
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'partner',p_partner_id,'partner_reward_delivered',
    jsonb_build_object(
      'settlement_id',v_id,
      'cycle_started_at',v_start_at,
      'cycle_closed_at',v_closed_at,
      'sale_count',v_count,
      'gross_sales',v_revenue,
      'reward_units',v_units,
      'delivered_on',v_delivered_on,
      'early_reward',coalesce(v_partner.target_sales,0)>v_count,
      'product_id',p_product_id,
      'flavor_id',p_flavor_id,
      'location_id',p_location_id,
      'product_quantity',case when p_product_id is null then 0 else v_product_quantity end
    )
  );

  return v_id;
end;
$$;

revoke all on function public.register_partner_reward_delivery(uuid,date,integer,text,text,uuid,uuid,uuid,integer) from public,anon;
grant execute on function public.register_partner_reward_delivery(uuid,date,integer,text,text,uuid,uuid,uuid,integer) to authenticated;

-- Mantém o contrato da view, mas usa o instante exato de fechamento quando a
-- recompensa é antecipada. Assim 78/80 pode ser encerrado hoje e a venda 79
-- passa a pertencer ao novo ciclo, sem gerar um brinde duplicado ao chegar a 80.
create or replace view public.partner_management_overview
with (security_invoker = true)
as
select
  p.id,p.name,p.partner_type,p.city,p.reference,p.contact_name,p.phone,p.status,p.start_date,p.end_date,
  p.partnership_model,p.settlement_rule,p.commission_pct,coalesce(p.active,true) as active,
  p.can_hold_stock,p.can_pickup,p.can_sell,p.can_deliver,p.notes,p.linked_location_id,
  l.code as linked_location_code,l.name as linked_location_name,
  p.reward_type,p.target_sales,p.reward_value,p.reward_description,p.settlement_frequency,p.settlement_day,
  p.coupon_code,p.counts_only_delivered,p.updated_at,
  coalesce(all_sales.sale_count,0)::integer as all_time_sales_count,
  coalesce(all_sales.revenue,0)::numeric(12,2) as all_time_revenue,
  coalesce(all_sales.profit,0)::numeric(12,2) as all_time_profit,
  all_sales.last_sale_on,
  (cycle.cycle_boundary at time zone 'America/Sao_Paulo')::date as cycle_start,
  coalesce(current_sales.sale_count,0)::integer as current_cycle_sales_count,
  coalesce(current_sales.revenue,0)::numeric(12,2) as current_cycle_revenue,
  coalesce(current_sales.profit,0)::numeric(12,2) as current_cycle_profit,
  case when p.reward_type='gift_per_sales' and coalesce(p.target_sales,0)>0
       then floor(coalesce(current_sales.sale_count,0)::numeric/p.target_sales)::integer else 0 end as reward_units_due,
  case when p.reward_type='gift_per_sales' and coalesce(p.target_sales,0)>0
       then mod(coalesce(current_sales.sale_count,0),p.target_sales) else coalesce(current_sales.sale_count,0) end as progress_sales,
  case when p.reward_type='gift_per_sales' and coalesce(p.target_sales,0)>0
       then least(100,round(coalesce(current_sales.sale_count,0)::numeric*100/p.target_sales,1))
       else case when coalesce(current_sales.sale_count,0)>0 then 100 else 0 end end as progress_pct,
  case when p.reward_type='fixed_per_sale' then round(coalesce(current_sales.sale_count,0)*coalesce(p.reward_value,0),2)
       when p.reward_type='percentage' then round(coalesce(current_sales.revenue,0)*coalesce(p.reward_value,0)/100,2)
       else 0 end::numeric(12,2) as estimated_reward_amount,
  last_settlement.settled_on as last_settlement_on,
  last_settlement.period_end as last_settlement_period_end,
  coalesce(stock.physical_units,0)::integer as linked_location_units,
  case
    when p.reward_type='gift_per_sales' then coalesce(current_sales.sale_count,0)>=coalesce(p.target_sales,2147483647)
    when p.reward_type in ('fixed_per_sale','percentage','manual') then coalesce(current_sales.sale_count,0)>0
    else false
  end as settlement_pending
from public.partners p
left join public.locations l on l.id=p.linked_location_id
left join lateral (
  select ps.settled_on,ps.period_end,ps.cycle_closed_at
  from public.partnership_settlements ps
  where ps.partner_id=p.id
  order by
    coalesce(
      ps.cycle_closed_at,
      ((ps.period_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    ) desc,
    ps.created_at desc
  limit 1
) last_settlement on true
left join lateral (
  select coalesce(
    last_settlement.cycle_closed_at,
    ((last_settlement.period_end + 1)::timestamp at time zone 'America/Sao_Paulo'),
    (coalesce(p.start_date,date '2000-01-01')::timestamp at time zone 'America/Sao_Paulo')
  ) as cycle_boundary
) cycle on true
left join lateral (
  select
    count(*)::integer as sale_count,
    coalesce(sum(s.total_amount),0) as revenue,
    coalesce(sum(s.total_profit),0) as profit,
    max(coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date)) as last_sale_on
  from public.sales s
  where s.partner_id=p.id
    and s.record_type='sale'
    and s.general_status<>'cancelled'
    and (not p.counts_only_delivered or s.delivery_status='delivered')
) all_sales on true
left join lateral (
  select
    count(*)::integer as sale_count,
    coalesce(sum(s.total_amount),0) as revenue,
    coalesce(sum(s.total_profit),0) as profit
  from public.sales s
  where s.partner_id=p.id
    and s.record_type='sale'
    and s.general_status<>'cancelled'
    and (not p.counts_only_delivered or s.delivery_status='delivered')
    and coalesce(s.delivered_at,s.quoted_at)>=cycle.cycle_boundary
) current_sales on true
left join lateral (
  select coalesce(sum(sb.quantity),0)::integer as physical_units
  from public.stock_balances sb
  where sb.location_id=p.linked_location_id
) stock on true
where lower(p.partner_type)<>'supplier';

-- -----------------------------------------------------------------------------
-- 2) PORTAL PARCEIRO SEM PERMISSÕES INTERNAS
-- -----------------------------------------------------------------------------

update public.profiles
set
  can_access_supplements=false,
  can_write_supplements=false,
  can_access_fitness=false,
  can_write_fitness=false,
  can_access_bank=false,
  can_write_bank=false,
  can_access_marketing=false,
  can_write_marketing=false,
  can_manage_users=false,
  updated_at=now()
where role='partner';

create or replace function public.enforce_partner_profile_isolation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role='partner' then
    new.can_access_supplements:=false;
    new.can_write_supplements:=false;
    new.can_access_fitness:=false;
    new.can_write_fitness:=false;
    new.can_access_bank:=false;
    new.can_write_bank:=false;
    new.can_access_marketing:=false;
    new.can_write_marketing:=false;
    new.can_manage_users:=false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_partner_isolation on public.profiles;
create trigger trg_profiles_partner_isolation
before insert or update on public.profiles
for each row execute function public.enforce_partner_profile_isolation();

-- -----------------------------------------------------------------------------
-- 3) GOOGLE CALENDAR: SERVICE ROLE PRECISA LER A AGENDA ESTRATÉGICA
-- -----------------------------------------------------------------------------

grant select on public.central_strategic_agenda_items to service_role;

-- -----------------------------------------------------------------------------
-- 4) INTEGRAÇÕES DE TESTE FICAM NO GERENCIAMENTO/HISTÓRICO, NÃO NA SAÚDE DIÁRIA
-- -----------------------------------------------------------------------------

create or replace function public.central_dashboard_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_contacts integer := 0;
  v_media integer := 0;
  v_ai integer := 0;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found then raise exception 'Perfil ativo não encontrado'; end if;
  if not (
    v_profile.role='admin'
    or v_profile.can_access_supplements
    or v_profile.can_access_fitness
    or coalesce(v_profile.can_access_marketing,false)
  ) then
    raise exception 'Acesso negado';
  end if;

  select count(*)::integer into v_contacts
  from public.central_contacts c
  where
    (v_profile.role='admin')
    or (v_profile.can_access_supplements and c.operation_scope='supplements')
    or (v_profile.can_access_fitness and c.operation_scope='fitness')
    or (coalesce(v_profile.can_access_marketing,false) and c.operation_scope='marketing')
    or c.operation_scope='company';

  select count(*)::integer into v_media
  from public.central_media_assets m
  where public.central_can_access_scope(m.operation_scope);

  select count(*)::integer into v_ai
  from public.central_ai_insights i
  where i.status='active' and public.central_can_access_scope(i.operation_scope);

  return jsonb_build_object(
    'unread',0,
    'open_conversations',0,
    'pending_conversations',0,
    'contacts',v_contacts,
    'media_assets',v_media,
    'active_ai_insights',v_ai,
    'integrations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider',provider,
        'scope',operation_scope,
        'account_name',account_name,
        'status',status
      ) order by provider,operation_scope)
      from public.central_integrations
      where status<>'disconnected'
        and lower(coalesce(account_name,'')) not like '%teste%'
    ),'[]'::jsonb)
  );
end;
$function$;

create or replace function public.central_governance_snapshot_v2(p_limit integer default 150)
returns jsonb
language plpgsql
stable security definer
set search_path=public
as $$
declare
  v_audit jsonb;
  v_integrations jsonb;
  v_flags jsonb;
  v_users jsonb;
  v_portal jsonb;
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb)
  into v_audit
  from (select * from public.central_governance_audit_feed(p_limit)) a;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.provider,i.operation_scope),'[]'::jsonb)
  into v_integrations
  from public.central_integration_health i
  where lower(coalesce(i.account_name,'')) not like '%teste%';

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',f.key,'enabled',f.enabled,'description',f.description,
    'updated_at',f.updated_at,'updated_by',f.updated_by
  ) order by f.key),'[]'::jsonb)
  into v_flags
  from public.ui_feature_flags f;

  select jsonb_build_object(
    'total',count(*),
    'active',count(*) filter(where active),
    'admins',count(*) filter(where active and role='admin'),
    'operators',count(*) filter(where active and role='operator'),
    'sales',count(*) filter(where active and role='sales'),
    'partners',count(*) filter(where active and role='partner'),
    'marketing_access',count(*) filter(where active and can_access_marketing)
  ) into v_users
  from public.profiles;

  select jsonb_build_object(
    'eligible',count(*),
    'active_portals',count(*) filter(where exists(select 1 from public.partner_user_links l where l.partner_id=p.id and l.active)),
    'without_portal',count(*) filter(where not exists(select 1 from public.partner_user_links l where l.partner_id=p.id and l.active))
  ) into v_portal
  from public.partners p
  where coalesce(p.active,true) and p.partner_type<>'supplier';

  return jsonb_build_object(
    'audit',v_audit,
    'integrations',v_integrations,
    'feature_flags',v_flags,
    'users',v_users,
    'partner_portal',v_portal
  );
end;
$$;

create or replace function public.central_daily_priorities_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_tasks jsonb:='[]'::jsonb;
  v_conversations jsonb:='[]'::jsonb;
  v_radar jsonb:='[]'::jsonb;
  v_inventory jsonb:='[]'::jsonb;
  v_partners jsonb:=jsonb_build_object('summary',jsonb_build_object('ready',0,'attention',0,'total',0),'items','[]'::jsonb);
  v_integrations jsonb:='[]'::jsonb;
  v_task_count integer:=0;
  v_conversation_count integer:=0;
  v_radar_count integer:=0;
  v_inventory_count integer:=0;
  v_partner_attention integer:=0;
  v_integration_attention integer:=0;
begin
  if not (public.central_can_access_scope('company') or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;

  select count(*)::integer into v_task_count
  from public.operational_tasks t
  where t.status='pending'
    and public.central_can_access_scope(t.operation_scope)
    and t.due_at<=now()+interval '7 days';

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_rank,x.due_at),'[]'::jsonb)
  into v_tasks
  from (
    select
      t.id,t.title,t.category,t.due_at,t.priority,t.status,t.operation_scope,t.central_contact_id,
      c.display_name as contact_name,coalesce(p.full_name,p.email) as assigned_name,
      case
        when t.due_at<now() then 0
        when (t.due_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date then 1
        else 2
      end sort_rank
    from public.operational_tasks t
    left join public.central_contacts c on c.id=t.central_contact_id
    left join public.profiles p on p.id=t.assigned_to
    where t.status='pending'
      and public.central_can_access_scope(t.operation_scope)
      and t.due_at<=now()+interval '7 days'
    order by sort_rank,t.due_at
    limit 20
  ) x;

  v_conversations:='[]'::jsonb;
  v_conversation_count:=0;

  if public.can_access_operation('supplements') then
    select count(*)::integer into v_radar_count
    from public.customer_opportunity_radar_v3
    where is_priority_opportunity;

    select coalesce(jsonb_agg(to_jsonb(x) order by case x.opportunity_priority when 'Alta' then 1 when 'Média' then 2 else 3 end,x.opportunity_score desc),'[]'::jsonb)
    into v_radar
    from (
      select customer_id,customer_name,phone,city,last_product_name,days_to_repurchase,opportunity_priority,opportunity_label,recommended_action,priority_source,opportunity_score
      from public.customer_opportunity_radar_v3
      where is_priority_opportunity
      order by case opportunity_priority when 'Alta' then 1 when 'Média' then 2 else 3 end,opportunity_score desc
      limit 20
    ) x;

    select count(*)::integer into v_inventory_count
    from public.inventory_workspace_attention;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.status,x.title),'[]'::jsonb)
    into v_inventory
    from (
      select attention_type,entity_id,title,status,details
      from public.inventory_workspace_attention
      order by status,title
      limit 20
    ) x;
  end if;

  if public.can_manage_users() or public.current_user_role()='admin' then
    v_partners:=public.partner_portal_health_snapshot();
    v_partner_attention:=coalesce((v_partners->'summary'->>'attention')::integer,0);

    select
      coalesce(jsonb_agg(to_jsonb(x) order by x.health_status,x.provider),'[]'::jsonb),
      count(*) filter(where health_status not in('healthy','connected'))::integer
    into v_integrations,v_integration_attention
    from (
      select provider,operation_scope,account_name,status,last_sync_at,last_error,health_status,failed_events,pending_events
      from public.central_integration_health
      where lower(coalesce(account_name,'')) not like '%teste%'
    ) x;
  end if;

  return jsonb_build_object(
    'generated_at',now(),
    'summary',jsonb_build_object(
      'tasks',v_task_count,
      'conversations',v_conversation_count,
      'radar',v_radar_count,
      'inventory',v_inventory_count,
      'partner_attention',v_partner_attention,
      'integration_attention',v_integration_attention,
      'total',v_task_count+v_conversation_count+v_radar_count+v_inventory_count+v_partner_attention+v_integration_attention
    ),
    'tasks',v_tasks,
    'conversations',v_conversations,
    'radar',v_radar,
    'inventory',v_inventory,
    'partners',v_partners,
    'integrations',v_integrations
  );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5) PHYSIQUE · PATROCÍNIOS POR ATLETA
-- -----------------------------------------------------------------------------

create table if not exists public.physique_sponsorships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.physique_athletes(id) on delete cascade,
  event_name text not null,
  event_type text,
  event_date date,
  event_location text,
  starts_on date,
  ends_on date,
  sponsorship_type text not null check (sponsorship_type in ('money','products','mixed')),
  cash_amount numeric(12,2) not null default 0 check (cash_amount>=0),
  objective text,
  consideration text,
  notes text,
  status text not null default 'planned' check (status in ('planned','approved','fulfilled','finalized','cancelled')),
  products_delivered_at timestamptz,
  cash_paid_at timestamptz,
  finalized_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physique_sponsorship_items (
  id uuid primary key default gen_random_uuid(),
  sponsorship_id uuid not null references public.physique_sponsorships(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity integer not null check (quantity>0),
  product_name_snapshot text not null,
  flavor_name_snapshot text,
  unit_cost_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_physique_sponsorships_athlete_event
  on public.physique_sponsorships(athlete_id,event_date desc,created_at desc);
create index if not exists idx_physique_sponsorships_status
  on public.physique_sponsorships(status);
create index if not exists idx_physique_sponsorship_items_sponsorship
  on public.physique_sponsorship_items(sponsorship_id);

alter table public.physique_sponsorships enable row level security;
alter table public.physique_sponsorship_items enable row level security;

drop policy if exists physique_sponsorships_manage on public.physique_sponsorships;
create policy physique_sponsorships_manage
on public.physique_sponsorships
for all
to authenticated
using (public.can_manage_physique())
with check (public.can_manage_physique());

drop policy if exists physique_sponsorship_items_manage on public.physique_sponsorship_items;
create policy physique_sponsorship_items_manage
on public.physique_sponsorship_items
for all
to authenticated
using (public.can_manage_physique())
with check (public.can_manage_physique());

grant select,insert,update,delete on public.physique_sponsorships to authenticated;
grant select,insert,update,delete on public.physique_sponsorship_items to authenticated;

create or replace function public.physique_sponsorship_snapshot(p_athlete_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path=public
as $$
declare
  v_sponsorships jsonb;
  v_items jsonb;
  v_products jsonb;
  v_flavors jsonb;
  v_locations jsonb;
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;
  if not exists(select 1 from public.physique_athletes where id=p_athlete_id) then raise exception 'Atleta não encontrado'; end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by coalesce(s.event_date,s.starts_on,s.created_at::date) desc,s.created_at desc),'[]'::jsonb)
  into v_sponsorships
  from public.physique_sponsorships s
  where s.athlete_id=p_athlete_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.id),'[]'::jsonb)
  into v_items
  from (
    select
      i.id,i.sponsorship_id,i.product_id,
      i.product_name_snapshot as product_name,
      i.flavor_id,i.flavor_name_snapshot as flavor_name,
      i.location_id,l.code as location_code,l.name as location_name,
      i.quantity,i.unit_cost_snapshot,i.created_at
    from public.physique_sponsorship_items i
    join public.physique_sponsorships s on s.id=i.sponsorship_id
    join public.locations l on l.id=i.location_id
    where s.athlete_id=p_athlete_id
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'name',p.name,
    'flavor_tracking_enabled',coalesce(p.flavor_tracking_enabled,false)
  ) order by p.name),'[]'::jsonb)
  into v_products
  from public.products p
  where p.active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'product_id',f.product_id,'name',f.name
  ) order by f.product_id,f.display_order,f.name),'[]'::jsonb)
  into v_flavors
  from public.product_flavors f
  where f.active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'code',l.code,'name',l.name
  ) order by l.code,l.name),'[]'::jsonb)
  into v_locations
  from public.locations l
  where l.active and l.tracks_inventory;

  return jsonb_build_object(
    'sponsorships',v_sponsorships,
    'items',v_items,
    'products',v_products,
    'flavors',v_flavors,
    'locations',v_locations
  );
end;
$$;

create or replace function public.create_physique_sponsorship(
  p_athlete_id uuid,
  p_event_name text,
  p_event_type text default null,
  p_event_date date default null,
  p_event_location text default null,
  p_starts_on date default null,
  p_ends_on date default null,
  p_sponsorship_type text default 'products',
  p_cash_amount numeric default 0,
  p_objective text default null,
  p_consideration text default null,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_flavor_name text;
  v_location public.locations%rowtype;
  v_product_id uuid;
  v_flavor_id uuid;
  v_location_id uuid;
  v_quantity integer;
  v_item_count integer := case when jsonb_typeof(coalesce(p_items,'[]'::jsonb))='array' then jsonb_array_length(coalesce(p_items,'[]'::jsonb)) else 0 end;
  v_event_name text := nullif(btrim(p_event_name),'');
  v_type text := coalesce(nullif(btrim(p_sponsorship_type),''),'products');
  v_cash numeric(12,2) := greatest(coalesce(p_cash_amount,0),0);
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;
  if not exists(select 1 from public.physique_athletes where id=p_athlete_id) then raise exception 'Atleta não encontrado'; end if;
  if v_event_name is null then raise exception 'Informe o nome do evento'; end if;
  if v_type not in ('money','products','mixed') then raise exception 'Tipo de patrocínio inválido'; end if;
  if p_ends_on is not null and p_starts_on is not null and p_ends_on<p_starts_on then raise exception 'A data final não pode ser anterior ao início do apoio'; end if;
  if v_type='money' and v_cash<=0 then raise exception 'Informe o valor do patrocínio em dinheiro'; end if;
  if v_type='products' and v_item_count<=0 then raise exception 'Adicione pelo menos um suplemento ao patrocínio'; end if;
  if v_type='mixed' and (v_cash<=0 or v_item_count<=0) then raise exception 'No patrocínio misto, informe dinheiro e pelo menos um suplemento'; end if;

  insert into public.physique_sponsorships(
    athlete_id,event_name,event_type,event_date,event_location,starts_on,ends_on,
    sponsorship_type,cash_amount,objective,consideration,notes,status,created_by
  ) values (
    p_athlete_id,v_event_name,nullif(btrim(p_event_type),''),p_event_date,
    nullif(btrim(p_event_location),''),p_starts_on,p_ends_on,v_type,v_cash,
    nullif(btrim(p_objective),''),nullif(btrim(p_consideration),''),nullif(btrim(p_notes),''),
    'planned',auth.uid()
  ) returning id into v_id;

  if v_type in ('products','mixed') then
    if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'Lista de produtos inválida'; end if;

    for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb))
    loop
      v_product_id:=nullif(v_item->>'product_id','')::uuid;
      v_flavor_id:=nullif(v_item->>'flavor_id','')::uuid;
      v_location_id:=nullif(v_item->>'location_id','')::uuid;
      v_quantity:=greatest(coalesce((v_item->>'quantity')::integer,0),0);

      if v_product_id is null or v_location_id is null or v_quantity<=0 then
        raise exception 'Produto, local e quantidade são obrigatórios no patrocínio';
      end if;

      select * into v_product from public.products where id=v_product_id and active;
      if not found then raise exception 'Produto inválido ou inativo'; end if;

      select * into v_location from public.locations where id=v_location_id and active and tracks_inventory;
      if not found then raise exception 'Local de estoque inválido ou inativo'; end if;

      if coalesce(v_product.flavor_tracking_enabled,false) then
        if v_flavor_id is null then raise exception 'Selecione o sabor de %',v_product.name; end if;
        select name into v_flavor_name
        from public.product_flavors
        where id=v_flavor_id and product_id=v_product_id and active;
        if not found then raise exception 'Sabor inválido para %',v_product.name; end if;
      else
        if v_flavor_id is not null then raise exception 'O produto % não utiliza controle por sabor',v_product.name; end if;
        v_flavor_name:=null;
      end if;

      insert into public.physique_sponsorship_items(
        sponsorship_id,product_id,flavor_id,location_id,quantity,
        product_name_snapshot,flavor_name_snapshot,unit_cost_snapshot
      ) values (
        v_id,v_product_id,v_flavor_id,v_location_id,v_quantity,
        v_product.name,v_flavor_name,
        coalesce(v_product.cost_price,0)
      );
    end loop;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('physique_sponsorship',v_id,'created',jsonb_build_object(
    'athlete_id',p_athlete_id,
    'event_name',v_event_name,
    'sponsorship_type',v_type,
    'cash_amount',v_cash,
    'product_lines',v_item_count
  ));

  return v_id;
end;
$$;

create or replace function public.physique_sponsorship_action(
  p_sponsorship_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_s public.physique_sponsorships%rowtype;
  v_item public.physique_sponsorship_items%rowtype;
  v_action text := lower(coalesce(nullif(btrim(p_action),''),''));
  v_needs_products boolean;
  v_needs_cash boolean;
  v_fulfilled boolean;
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;

  select * into v_s
  from public.physique_sponsorships
  where id=p_sponsorship_id
  for update;
  if not found then raise exception 'Patrocínio não encontrado'; end if;

  v_needs_products:=v_s.sponsorship_type in ('products','mixed');
  v_needs_cash:=v_s.sponsorship_type in ('money','mixed');

  if v_action='approve' then
    if v_s.status<>'planned' then raise exception 'Somente patrocínios planejados podem ser aprovados'; end if;
    update public.physique_sponsorships set status='approved',updated_at=now() where id=v_s.id;

  elsif v_action='cancel' then
    if v_s.status not in ('planned','approved') then raise exception 'Este patrocínio não pode mais ser cancelado'; end if;
    if v_s.products_delivered_at is not null or v_s.cash_paid_at is not null then
      raise exception 'Não é possível cancelar depois que dinheiro ou produtos já foram entregues';
    end if;
    update public.physique_sponsorships set status='cancelled',updated_at=now() where id=v_s.id;

  elsif v_action='deliver_products' then
    if v_s.status<>'approved' then raise exception 'Aprove o patrocínio antes de entregar os produtos'; end if;
    if not v_needs_products then raise exception 'Este patrocínio não possui suplementos'; end if;
    if v_s.products_delivered_at is not null then raise exception 'Os suplementos deste patrocínio já foram entregues'; end if;

    if not exists(select 1 from public.physique_sponsorship_items where sponsorship_id=v_s.id) then
      raise exception 'Nenhum suplemento foi vinculado a este patrocínio';
    end if;

    for v_item in
      select * from public.physique_sponsorship_items where sponsorship_id=v_s.id order by created_at,id
    loop
      insert into public.inventory_movements(
        product_id,location_id,flavor_id,movement_type,quantity_delta,notes,idempotency_key,created_by
      ) values (
        v_item.product_id,
        v_item.location_id,
        v_item.flavor_id,
        'adjustment',
        -v_item.quantity,
        'Patrocínio Physique · '||v_s.event_name,
        'physique:sponsorship:'||v_s.id::text||':item:'||v_item.id::text||':delivery',
        auth.uid()
      ) on conflict(idempotency_key) do nothing;
    end loop;

    update public.physique_sponsorships set products_delivered_at=now(),updated_at=now() where id=v_s.id;

  elsif v_action='mark_cash_paid' then
    if v_s.status<>'approved' then raise exception 'Aprove o patrocínio antes de confirmar o pagamento'; end if;
    if not v_needs_cash then raise exception 'Este patrocínio não possui valor em dinheiro'; end if;
    if v_s.cash_paid_at is not null then raise exception 'O pagamento deste patrocínio já foi confirmado'; end if;
    update public.physique_sponsorships set cash_paid_at=now(),updated_at=now() where id=v_s.id;

  elsif v_action='finalize' then
    if v_s.status<>'fulfilled' then raise exception 'Conclua as entregas e pagamentos antes de finalizar'; end if;
    update public.physique_sponsorships set status='finalized',finalized_at=now(),updated_at=now() where id=v_s.id;

  else
    raise exception 'Ação de patrocínio inválida';
  end if;

  select * into v_s from public.physique_sponsorships where id=p_sponsorship_id;

  if v_s.status='approved' then
    v_fulfilled:=
      (not v_needs_products or v_s.products_delivered_at is not null)
      and (not v_needs_cash or v_s.cash_paid_at is not null);
    if v_fulfilled then
      update public.physique_sponsorships set status='fulfilled',updated_at=now() where id=v_s.id;
      select * into v_s from public.physique_sponsorships where id=p_sponsorship_id;
    end if;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('physique_sponsorship',v_s.id,'sponsorship_'||v_action,jsonb_build_object(
    'status',v_s.status,
    'products_delivered_at',v_s.products_delivered_at,
    'cash_paid_at',v_s.cash_paid_at,
    'finalized_at',v_s.finalized_at
  ));

  return to_jsonb(v_s);
end;
$$;

revoke all on function public.physique_sponsorship_snapshot(uuid) from public,anon;
revoke all on function public.create_physique_sponsorship(uuid,text,text,date,text,date,date,text,numeric,text,text,text,jsonb) from public,anon;
revoke all on function public.physique_sponsorship_action(uuid,text) from public,anon;

grant execute on function public.physique_sponsorship_snapshot(uuid) to authenticated;
grant execute on function public.create_physique_sponsorship(uuid,text,text,date,text,date,date,text,numeric,text,text,text,jsonb) to authenticated;
grant execute on function public.physique_sponsorship_action(uuid,text) to authenticated;

commit;
