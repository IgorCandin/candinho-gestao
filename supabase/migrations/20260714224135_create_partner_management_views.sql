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
  cycle.cycle_start,
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
  select ps.settled_on,ps.period_end from public.partnership_settlements ps
  where ps.partner_id=p.id order by ps.period_end desc,ps.created_at desc limit 1
) last_settlement on true
left join lateral (
  select coalesce(last_settlement.period_end+1,p.start_date,date '2000-01-01')::date as cycle_start
) cycle on true
left join lateral (
  select count(*)::integer as sale_count,coalesce(sum(s.total_amount),0) as revenue,coalesce(sum(s.total_profit),0) as profit,
    max(coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date)) as last_sale_on
  from public.sales s where s.partner_id=p.id and s.record_type='sale' and s.general_status<>'cancelled'
    and (not p.counts_only_delivered or s.delivery_status='delivered')
) all_sales on true
left join lateral (
  select count(*)::integer as sale_count,coalesce(sum(s.total_amount),0) as revenue,coalesce(sum(s.total_profit),0) as profit
  from public.sales s where s.partner_id=p.id and s.record_type='sale' and s.general_status<>'cancelled'
    and (not p.counts_only_delivered or s.delivery_status='delivered')
    and coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date)>=cycle.cycle_start
) current_sales on true
left join lateral (
  select coalesce(sum(sb.quantity),0)::integer as physical_units
  from public.stock_balances sb where sb.location_id=p.linked_location_id
) stock on true
where lower(p.partner_type)<>'supplier';

create or replace view public.partner_sales_history
with (security_invoker = true)
as
select s.id,s.partner_id,p.name as partner_name,s.customer_id,c.name as customer_name,
  coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date) as sale_date,
  s.quoted_at,s.delivered_at,s.payment_status,s.delivery_status,s.general_status,s.total_amount,s.total_profit,
  l.code as location_code,l.name as location_name,items.product_summary,items.total_items
from public.sales s
join public.partners p on p.id=s.partner_id
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=s.location_id
left join lateral (
  select string_agg(pr.name||' ×'||si.quantity::text,', ' order by pr.name) as product_summary,
         coalesce(sum(si.quantity),0)::integer as total_items
  from public.sale_items si join public.products pr on pr.id=si.product_id where si.sale_id=s.id
) items on true
where s.record_type='sale';

create or replace view public.unassigned_partnership_sales
with (security_invoker = true)
as
select s.id,s.customer_id,c.name as customer_name,
  coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date) as sale_date,
  s.total_amount,s.delivery_status,s.payment_status,l.id as location_id,l.code as location_code,l.name as location_name,
  items.product_summary,items.total_items,
  suggested.id as suggested_partner_id,suggested.name as suggested_partner_name
from public.sales s
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=s.location_id
left join lateral (
  select string_agg(pr.name||' ×'||si.quantity::text,', ' order by pr.name) as product_summary,
         coalesce(sum(si.quantity),0)::integer as total_items
  from public.sale_items si join public.products pr on pr.id=si.product_id where si.sale_id=s.id
) items on true
left join public.partners suggested on suggested.linked_location_id=s.location_id and lower(suggested.partner_type)<>'supplier'
where s.record_type='sale' and s.partner_id is null and s.general_status<>'cancelled'
  and lower(coalesce(s.partnership,''))='true';

create or replace view public.sale_partner_options
with (security_invoker = true)
as
select id,name,partner_type,city,partnership_model,settlement_rule,commission_pct,
  reward_type,target_sales,reward_value,reward_description,coupon_code
from public.partners
where lower(partner_type)<>'supplier' and coalesce(active,true) and coalesce(status,'Ativo')<>'Pausado'
order by name;

revoke all on public.partner_management_overview from public,anon;
revoke all on public.partner_sales_history from public,anon;
revoke all on public.unassigned_partnership_sales from public,anon;
revoke all on public.sale_partner_options from public,anon;
grant select on public.partner_management_overview,public.partner_sales_history,public.unassigned_partnership_sales,public.sale_partner_options to authenticated,service_role;
