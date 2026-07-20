begin;

-- Candinho Company · V38 · Pacotão 7
-- Parceiros: vínculo automático por ponto/local e calendário de relacionamento.
-- Migration já aplicada no Supabase de produção.

create or replace function public.assign_partner_from_linked_location()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_partner_id uuid;
  v_count integer;
begin
  if new.record_type='sale'
     and new.partner_id is null
     and new.location_id is not null
  then
    select
      (array_agg(p.id order by p.id))[1],
      count(*)::integer
    into v_partner_id,v_count
    from public.partners p
    where p.linked_location_id=new.location_id
      and lower(p.partner_type)<>'supplier'
      and coalesce(p.active,true)
      and coalesce(p.status,'Ativo')<>'Pausado';

    if v_count=1 then
      new.partner_id:=v_partner_id;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_sales_assign_partner_from_linked_location
on public.sales;

create trigger trg_sales_assign_partner_from_linked_location
before insert or update of location_id,partner_id,record_type
on public.sales
for each row
execute function public.assign_partner_from_linked_location();

-- Backfill sem IDs hardcoded:
-- associa vendas históricas sem partner_id quando o local pertence
-- a exatamente um parceiro ativo e não fornecedor.
with unique_partner_location as (
  select
    linked_location_id,
    (array_agg(id order by id))[1] as partner_id
  from public.partners
  where linked_location_id is not null
    and lower(partner_type)<>'supplier'
    and coalesce(active,true)
    and coalesce(status,'Ativo')<>'Pausado'
  group by linked_location_id
  having count(*)=1
)
update public.sales s
set
  partner_id=u.partner_id,
  updated_at=now()
from unique_partner_location u
where s.record_type='sale'
  and s.partner_id is null
  and s.location_id=u.linked_location_id;

create or replace view public.partner_network_overview
with (security_invoker = true)
as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
)
select
  pmo.id,
  pmo.name,
  pmo.partner_type,
  pmo.city,
  pmo.reference,
  pmo.contact_name,
  pmo.phone,
  pmo.status,
  pmo.start_date,
  pmo.end_date,
  pmo.partnership_model,
  pmo.settlement_rule,
  pmo.commission_pct,
  pmo.active,
  pmo.can_hold_stock,
  pmo.can_pickup,
  pmo.can_sell,
  pmo.can_deliver,
  pmo.notes,
  pmo.linked_location_id,
  pmo.linked_location_code,
  pmo.linked_location_name,
  pmo.reward_type,
  pmo.target_sales,
  pmo.reward_value,
  pmo.reward_description,
  pmo.settlement_frequency,
  pmo.settlement_day,
  pmo.coupon_code,
  pmo.counts_only_delivered,
  pmo.updated_at,
  pmo.all_time_sales_count,
  pmo.all_time_revenue,
  pmo.all_time_profit,
  pmo.last_sale_on,
  pmo.cycle_start,
  pmo.current_cycle_sales_count,
  pmo.current_cycle_revenue,
  pmo.current_cycle_profit,
  pmo.reward_units_due,
  pmo.progress_sales,
  pmo.progress_pct,
  pmo.estimated_reward_amount,
  pmo.last_settlement_on,
  pmo.last_settlement_period_end,
  pmo.linked_location_units,
  pmo.settlement_pending,
  rel.id as last_relationship_event_id,
  rel.event_type as last_relationship_event_type,
  rel.occurred_on as last_relationship_on,
  rel.outcome as last_relationship_outcome,
  rel.next_action,
  rel.next_action_on,
  coalesce(cnt.relationship_event_count,0::bigint)::integer
    as relationship_event_count,
  case
    when not coalesce(pmo.active,false)
      or pmo.status='Pausado'
      then 'paused'
    when rel.next_action_on is not null
      and rel.next_action_on<bt.today
      then 'overdue'
    when pmo.settlement_pending
      then 'settlement'
    when rel.next_action_on>=bt.today
      and rel.next_action_on<=bt.today+7
      then 'due_soon'
    when rel.id is null
      then 'no_followup'
    when rel.occurred_on<bt.today-45
      then 'stale'
    else 'healthy'
  end as relationship_health
from public.partner_management_overview pmo
cross join brazil_today bt
left join lateral (
  select
    e.id,
    e.partner_id,
    e.event_type,
    e.occurred_on,
    e.outcome,
    e.notes,
    e.next_action,
    e.next_action_on,
    e.created_by,
    e.created_at
  from public.partner_relationship_events e
  where e.partner_id=pmo.id
  order by e.occurred_on desc,e.created_at desc
  limit 1
) rel on true
left join lateral (
  select count(*) as relationship_event_count
  from public.partner_relationship_events e
  where e.partner_id=pmo.id
) cnt on true;

commit;
