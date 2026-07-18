create or replace function public.central_daily_priorities_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_tasks jsonb := '[]'::jsonb;
  v_conversations jsonb := '[]'::jsonb;
  v_radar jsonb := '[]'::jsonb;
  v_inventory jsonb := '[]'::jsonb;
  v_partners jsonb := jsonb_build_object('summary',jsonb_build_object('ready',0,'attention',0,'total',0),'items','[]'::jsonb);
  v_integrations jsonb := '[]'::jsonb;
  v_task_count integer := 0;
  v_conversation_count integer := 0;
  v_radar_count integer := 0;
  v_inventory_count integer := 0;
  v_partner_attention integer := 0;
  v_integration_attention integer := 0;
begin
  if not (public.central_can_access_scope('company') or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_rank,x.due_at),'[]'::jsonb),count(*)::integer into v_tasks,v_task_count from (
    select t.id,t.title,t.category,t.due_at,t.priority,t.status,t.operation_scope,t.central_contact_id,c.display_name as contact_name,coalesce(p.full_name,p.email) as assigned_name,
      case when t.due_at < now() then 0 when t.due_at::date=(now() at time zone 'America/Sao_Paulo')::date then 1 else 2 end sort_rank
    from public.operational_tasks t left join public.central_contacts c on c.id=t.central_contact_id left join public.profiles p on p.id=t.assigned_to
    where t.status='pending' and public.central_can_access_scope(t.operation_scope) and t.due_at <= now()+interval '7 days'
    order by sort_rank,t.due_at limit 20
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.unread_count desc,x.last_message_at desc),'[]'::jsonb),count(*)::integer into v_conversations,v_conversation_count from (
    select conversation_id,operation_scope,provider,contact_name,status,assigned_to_name,last_message_at,unread_count,last_message_body
    from public.central_inbox_overview where status <> 'closed' and public.central_can_access_scope(operation_scope) and (unread_count>0 or status='pending')
    order by unread_count desc,last_message_at desc limit 20
  ) x;
  if public.can_access_operation('supplements') then
    select coalesce(jsonb_agg(to_jsonb(x) order by case x.opportunity_priority when 'Alta' then 1 when 'Média' then 2 else 3 end,x.opportunity_score desc),'[]'::jsonb),count(*)::integer into v_radar,v_radar_count from (
      select customer_id,customer_name,phone,city,last_product_name,days_to_repurchase,opportunity_priority,opportunity_label,recommended_action,priority_source,opportunity_score
      from public.customer_opportunity_radar_v3 where is_priority_opportunity order by case opportunity_priority when 'Alta' then 1 when 'Média' then 2 else 3 end,opportunity_score desc limit 20
    ) x;
    select coalesce(jsonb_agg(to_jsonb(x) order by x.status,x.title),'[]'::jsonb),count(*)::integer into v_inventory,v_inventory_count from (
      select attention_type,entity_id,title,status,details from public.inventory_workspace_attention limit 20
    ) x;
  end if;
  if public.can_manage_users() or public.current_user_role()='admin' then
    v_partners := public.partner_portal_health_snapshot();
    v_partner_attention := coalesce((v_partners->'summary'->>'attention')::integer,0);
    select coalesce(jsonb_agg(to_jsonb(x) order by x.health_status,x.provider),'[]'::jsonb),count(*) filter(where health_status not in ('healthy','connected'))::integer into v_integrations,v_integration_attention from (
      select provider,operation_scope,account_name,status,last_sync_at,last_error,health_status,failed_events,pending_events from public.central_integration_health
    ) x;
  end if;
  return jsonb_build_object('generated_at',now(),'summary',jsonb_build_object('tasks',v_task_count,'conversations',v_conversation_count,'radar',v_radar_count,'inventory',v_inventory_count,'partner_attention',v_partner_attention,'integration_attention',v_integration_attention,'total',v_task_count+v_conversation_count+v_radar_count+v_inventory_count+v_partner_attention+v_integration_attention),'tasks',v_tasks,'conversations',v_conversations,'radar',v_radar,'inventory',v_inventory,'partners',v_partners,'integrations',v_integrations);
end;
$function$;
revoke all on function public.central_daily_priorities_snapshot() from public,anon;
grant execute on function public.central_daily_priorities_snapshot() to authenticated,service_role;
