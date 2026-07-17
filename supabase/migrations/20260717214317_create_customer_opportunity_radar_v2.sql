create or replace view public.customer_opportunity_radar_v2
with (security_invoker=true) as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date today
), valid_items as (
  select
    s.customer_id,
    s.id sale_id,
    coalesce(s.delivered_at,s.quoted_at,s.created_at) purchase_at,
    si.product_id,
    p.name product_name,
    p.category,
    p.duration_days,
    si.quantity,
    si.total_price
  from public.sales s
  join public.sale_items si on si.sale_id=s.id
  join public.products p on p.id=si.product_id
  where s.customer_id is not null
    and s.record_type='sale'
    and s.cancelled_at is null
    and s.general_status in ('active','finalized')
), product_history as (
  select
    customer_id,
    product_id,
    product_name,
    category,
    max(purchase_at) last_product_purchase_at,
    count(distinct sale_id)::integer product_purchase_count,
    sum(quantity)::integer units_bought,
    coalesce(sum(total_price),0)::numeric(12,2) product_spent,
    coalesce(max(duration_days),
      case
        when lower(product_name) like '%picolinato%' then 30
        when lower(product_name) like '%pré%' or lower(product_name) like '%pre workout%' or lower(product_name) like '%pre-workout%' then 30
        when lower(product_name) like '%whey%' or lower(product_name) like '%hipercal%' then 30
        when lower(product_name) like '%melaton%' then 60
        when lower(product_name) like '%magnés%' or lower(product_name) like '%magnes%' then 45
        when lower(product_name) like '%multivit%' or lower(product_name) like '%multi de a-z%' then 45
        when lower(product_name) like '%cafeína%' or lower(product_name) like '%cafeina%' or lower(product_name) like '%touro%' or lower(product_name) like '%ashwag%' or lower(product_name) like '%maca%' or lower(product_name) like '%moringa%' then 45
        when lower(product_name) like '%creatina%' then 90
        else 45
      end
    )::integer estimated_duration_days
  from valid_items
  group by customer_id,product_id,product_name,category
), latest_product as (
  select * from (
    select ph.*,row_number() over(partition by customer_id order by last_product_purchase_at desc,units_bought desc,product_name) rn
    from product_history ph
  ) x where rn=1
), favorite_product as (
  select * from (
    select ph.*,row_number() over(partition by customer_id order by units_bought desc,product_purchase_count desc,last_product_purchase_at desc,product_name) rn
    from product_history ph
  ) x where rn=1
), creatine_profile as (
  select
    customer_id,
    case
      when bool_or(lower(product_name) like '%creatina candinho%') then 'Comprou Creatina Candinho'
      when bool_or(lower(product_name) like '%creatina%') then 'Comprou outra creatina'
      else 'Nunca comprou creatina'
    end profile
  from valid_items
  group by customer_id
), base as (
  select
    c.id customer_id,
    c.name customer_name,
    c.phone,
    c.city,
    c.reference,
    c.tags,
    c.purchase_count,
    c.total_spent,
    c.last_purchase_at,
    c.days_since_last_purchase,
    c.days_since_last_contact,
    c.lead_count,
    c.pending_sales_count,
    c.pending_followup_count,
    c.next_followup_at,
    c.next_followup_notes,
    c.radar_status,
    c.next_action_label existing_next_action,
    c.care_alert,
    lp.product_id last_product_id,
    lp.product_name last_product_name,
    lp.estimated_duration_days,
    lp.last_product_purchase_at,
    fp.product_name most_purchased_product,
    coalesce(cp.profile,'Nunca comprou creatina') creatine_profile,
    case when lp.last_product_purchase_at is not null
      then (lp.last_product_purchase_at at time zone 'America/Sao_Paulo')::date + lp.estimated_duration_days
      else null end expected_repurchase_on
  from public.customer_crm_overview c
  left join latest_product lp on lp.customer_id=c.id
  left join favorite_product fp on fp.customer_id=c.id
  left join creatine_profile cp on cp.customer_id=c.id
  where c.active
), scored as (
  select b.*,
    case when expected_repurchase_on is null then null else expected_repurchase_on-(select today from brazil_today) end days_to_repurchase,
    case
      when radar_status in ('overdue_followup','due_today') or pending_followup_count>0 then 'CRM/AppSheet'
      when lead_count>0 then 'Lead/AppSheet'
      else 'Histórico automático'
    end priority_source,
    (
      case radar_status when 'overdue_followup' then 120 when 'due_today' then 110 when 'pending_order' then 90 when 'lead_only' then 85 when 'inactive' then 65 else 0 end
      + case when pending_followup_count>0 then 30 else 0 end
      + case when expected_repurchase_on is not null and expected_repurchase_on < (select today from brazil_today) then 90
             when expected_repurchase_on is not null and expected_repurchase_on <= (select today from brazil_today)+7 then 75
             when expected_repurchase_on is not null and expected_repurchase_on <= (select today from brazil_today)+14 then 55 else 0 end
      + case when purchase_count>=2 then 15 else 0 end
      + case when total_spent>=300 then 10 else 0 end
      + case when coalesce(days_since_last_contact,999)>=15 then 10 else 0 end
      + case when lead_count>0 then 15 else 0 end
    )::integer opportunity_score
  from base b
)
select
  s.*,
  case
    when radar_status in ('overdue_followup','due_today') then 'Alta'
    when pending_followup_count>0 then 'Alta'
    when days_to_repurchase is not null and days_to_repurchase<=7 then 'Alta'
    when radar_status='lead_only' and coalesce(days_since_last_contact,999)>=15 then 'Alta'
    when days_to_repurchase is not null and days_to_repurchase<=14 then 'Média'
    when lead_count>0 or radar_status in ('inactive','pending_order') then 'Média'
    else 'Baixa'
  end priority_level,
  case
    when radar_status='overdue_followup' then 'Retorno atrasado'
    when radar_status='due_today' then 'Retorno agendado para hoje'
    when pending_followup_count>0 then 'Retorno já priorizado no CRM'
    when days_to_repurchase is not null and days_to_repurchase<0 then 'Recompra provável atrasada'
    when days_to_repurchase is not null and days_to_repurchase<=7 then 'Recompra provável nesta semana'
    when days_to_repurchase is not null and days_to_repurchase<=14 then 'Recompra provável em breve'
    when radar_status='lead_only' then 'Lead esquecido / sem compra'
    when radar_status='inactive' then 'Reativação de cliente'
    when creatine_profile='Nunca comprou creatina' and purchase_count>0 then 'Oferta Creatina'
    else 'Relacionamento ativo'
  end opportunity_type,
  case
    when radar_status='overdue_followup' then 'Retomar o contato pendente antes de uma nova oferta.'
    when radar_status='due_today' then 'Fazer o retorno combinado hoje.'
    when pending_followup_count>0 then 'Seguir o retorno já registrado no CRM.'
    when days_to_repurchase is not null and days_to_repurchase<0 then 'Confirmar se o produto acabou e avaliar recompra.'
    when days_to_repurchase is not null and days_to_repurchase<=7 then 'Abordar de forma natural sobre continuidade do produto.'
    when radar_status='lead_only' then 'Retomar o objetivo original do lead sem pressionar.'
    when radar_status='inactive' then 'Reativar pela última necessidade ou produto comprado.'
    when creatine_profile='Nunca comprou creatina' and purchase_count>0 then 'Avaliar se creatina combina com o objetivo atual antes de oferecer.'
    else existing_next_action
  end recommended_action,
  (radar_status in ('overdue_followup','due_today','lead_only','inactive','pending_order')
    or pending_followup_count>0
    or (days_to_repurchase is not null and days_to_repurchase<=14)) is_possible_customer
from scored s;

create or replace view public.customer_opportunity_radar_summary
with (security_invoker=true) as
select
  count(*) filter(where is_possible_customer)::integer possible_customers,
  count(*) filter(where is_possible_customer and priority_level='Alta')::integer high_priority,
  count(*) filter(where is_possible_customer and priority_level='Média')::integer medium_priority,
  count(*) filter(where is_possible_customer and opportunity_type like 'Recompra provável%')::integer likely_repurchase,
  count(*) filter(where is_possible_customer and opportunity_type='Lead esquecido / sem compra')::integer forgotten_leads,
  count(*) filter(where is_possible_customer and priority_source in ('CRM/AppSheet','Lead/AppSheet'))::integer appsheet_prioritized
from public.customer_opportunity_radar_v2;

revoke all on public.customer_opportunity_radar_v2 from public,anon;
revoke all on public.customer_opportunity_radar_summary from public,anon;
grant select on public.customer_opportunity_radar_v2 to authenticated,service_role;
grant select on public.customer_opportunity_radar_summary to authenticated,service_role;
