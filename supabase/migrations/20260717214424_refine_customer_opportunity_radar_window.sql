create or replace view public.customer_opportunity_radar_v3
with (security_invoker=true) as
select
  r.*,
  case
    when r.radar_status in ('overdue_followup','due_today') or r.pending_followup_count>0 then 'Alta'
    when r.days_to_repurchase between -30 and 7 then 'Alta'
    when r.radar_status='lead_only' and coalesce(r.days_since_last_contact,999)>=15 then 'Alta'
    when r.days_to_repurchase between -60 and 14 then 'Média'
    when r.lead_count>0 or r.radar_status='pending_order' then 'Média'
    when r.radar_status='inactive' and r.purchase_count>=2 and coalesce(r.days_since_last_purchase,999)<=180 then 'Média'
    else 'Baixa'
  end opportunity_priority,
  case
    when r.radar_status='overdue_followup' then 'Retorno atrasado'
    when r.radar_status='due_today' then 'Retorno agendado para hoje'
    when r.pending_followup_count>0 then 'Retorno já priorizado no CRM'
    when r.days_to_repurchase between -30 and -1 then 'Recompra provável atrasada'
    when r.days_to_repurchase between 0 and 7 then 'Recompra provável nesta semana'
    when r.days_to_repurchase between 8 and 14 then 'Recompra provável em breve'
    when r.days_to_repurchase between -60 and -31 then 'Reativação pós-recompra'
    when r.radar_status='lead_only' then 'Lead esquecido / sem compra'
    when r.radar_status='pending_order' then 'Acompanhar pedido em aberto'
    when r.radar_status='inactive' and r.purchase_count>=2 and coalesce(r.days_since_last_purchase,999)<=180 then 'Reativação de cliente recorrente'
    when r.creatine_profile='Nunca comprou creatina' and r.purchase_count>0 then 'Oferta Creatina'
    else r.opportunity_type
  end opportunity_label,
  case
    when r.radar_status in ('overdue_followup','due_today','pending_order','lead_only') then true
    when r.pending_followup_count>0 then true
    when r.days_to_repurchase between -60 and 14 then true
    when r.radar_status='inactive' and r.purchase_count>=2 and coalesce(r.days_since_last_purchase,999)<=180 then true
    else false
  end is_priority_opportunity
from public.customer_opportunity_radar_v2 r;

create or replace view public.customer_opportunity_radar_summary_v3
with (security_invoker=true) as
select
  count(*) filter(where is_priority_opportunity)::integer possible_customers,
  count(*) filter(where is_priority_opportunity and opportunity_priority='Alta')::integer high_priority,
  count(*) filter(where is_priority_opportunity and opportunity_priority='Média')::integer medium_priority,
  count(*) filter(where is_priority_opportunity and opportunity_label like 'Recompra provável%')::integer likely_repurchase,
  count(*) filter(where is_priority_opportunity and opportunity_label='Lead esquecido / sem compra')::integer forgotten_leads,
  count(*) filter(where is_priority_opportunity and priority_source in ('CRM/AppSheet','Lead/AppSheet'))::integer appsheet_prioritized
from public.customer_opportunity_radar_v3;

revoke all on public.customer_opportunity_radar_v3 from public,anon;
revoke all on public.customer_opportunity_radar_summary_v3 from public,anon;
grant select on public.customer_opportunity_radar_v3 to authenticated,service_role;
grant select on public.customer_opportunity_radar_summary_v3 to authenticated,service_role;
