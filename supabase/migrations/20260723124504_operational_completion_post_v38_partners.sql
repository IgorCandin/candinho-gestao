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
