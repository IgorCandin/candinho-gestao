-- One customer-level contact state shared by Company and the legacy queue.
create or replace view public.customer_commercial_contact_state_v1
with (security_invoker=true) as
with touches as (
  select customer_id,occurred_at as contacted_at from public.commercial_contact_attempts
  where action in ('contacted','responded') and customer_id is not null
  union all
  select customer_id,created_at from public.customer_sales_opportunity_feedback where feedback_status='contacted'
  union all
  select customer_id,coalesce(occurred_at,completed_at) from public.customer_interactions
  where status='completed' and coalesce(occurred_at,completed_at) is not null
    and interaction_type in ('follow_up','post_sale','contact')
), last_touch as (
  select customer_id,max(contacted_at) as last_contact_at from touches group by customer_id
), feedback as (
  select distinct on (customer_id) customer_id,feedback_status,next_action_on,created_at
  from public.customer_sales_opportunity_feedback order by customer_id,created_at desc,id desc
), attempts as (
  select distinct on (customer_id) customer_id,next_eligible_on from public.commercial_contact_attempts
  where action<>'skipped' order by customer_id,occurred_at desc,id desc
)
select c.id as customer_id,t.last_contact_at,
  greatest(
    (t.last_contact_at at time zone 'America/Sao_Paulo')::date+2,
    case when f.feedback_status in ('contacted','later','still_using') then
      coalesce(f.next_action_on,(f.created_at at time zone 'America/Sao_Paulo')::date+
        case when f.feedback_status='still_using' then 14 when f.feedback_status='later' then 7 else 2 end) end,
    a.next_eligible_on
  ) as pause_until
from public.customers c
left join last_touch t on t.customer_id=c.id
left join feedback f on f.customer_id=c.id
left join attempts a on a.customer_id=c.id;
revoke all on public.customer_commercial_contact_state_v1 from anon;
grant select on public.customer_commercial_contact_state_v1 to authenticated,service_role;

-- Count people, once per Brazil calendar day, regardless of where the contact was recorded.
create or replace view public.commercial_contact_days_v1 with (security_invoker=true) as
select distinct customer_id,(contacted_at at time zone 'America/Sao_Paulo')::date as contacted_on
from (
  select customer_id,occurred_at as contacted_at from public.commercial_contact_attempts where action in ('contacted','responded')
  union all select customer_id,created_at from public.customer_sales_opportunity_feedback where feedback_status='contacted'
  union all select customer_id,coalesce(occurred_at,completed_at) from public.customer_interactions
    where status='completed' and interaction_type in ('follow_up','post_sale','contact')
) t where customer_id is not null and contacted_at is not null;
revoke all on public.commercial_contact_days_v1 from anon;
grant select on public.commercial_contact_days_v1 to authenticated,service_role;

-- Internal trigger target: one urgent purchasing card per sale, with the actual shortage.
create or replace function public.sync_sale_purchase_task_v1(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_missing text; v_task uuid; v_name text;
begin
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found or v_sale.record_type<>'sale' then return; end if;
  select name into v_name from public.customers where id=v_sale.customer_id;
  select id into v_task from public.operational_tasks
    where sale_id=p_sale_id and notes like '[Venda sem estoque]%' order by created_at limit 1 for update;
  if v_sale.general_status<>'cancelled' and v_sale.delivery_status<>'delivered' then
    select string_agg(p.name||coalesce(' · '||f.name,'')||' ×'||(r.quantity_requested-r.quantity_reserved)::text,', ' order by p.name,r.id)
    into v_missing from public.stock_reservations r
    join public.products p on p.id=r.product_id
    left join public.product_flavors f on f.id=r.flavor_id
    where r.sale_id=p_sale_id and r.status in ('awaiting_stock','partial') and r.quantity_requested>r.quantity_reserved;
  end if;
  if v_missing is null then
    update public.operational_tasks set
      status=case when v_sale.general_status='cancelled' then 'cancelled' else 'completed' end,
      completed_at=case when v_sale.general_status<>'cancelled' then now() end,
      cancelled_at=case when v_sale.general_status='cancelled' then now() end
    where id=v_task and status='planned';
    return;
  end if;
  if v_task is null then
    insert into public.operational_tasks(title,category,due_at,status,priority,customer_id,sale_id,notes,operation_scope,created_by)
    values('Comprar com urgência · '||coalesce(v_name,'Cliente'),'supplier',
      (((now() at time zone 'America/Sao_Paulo')::date)::timestamp+interval '9 hours') at time zone 'America/Sao_Paulo',
      'planned','urgent',v_sale.customer_id,p_sale_id,
      '[Venda sem estoque] Venda '||p_sale_id::text||E'\nFalta comprar/reservar: '||v_missing||E'\nConferir fornecedor e prazo; nenhuma compra foi feita automaticamente.',
      'supplements',coalesce(auth.uid(),v_sale.created_by));
  else
    update public.operational_tasks set title='Comprar com urgência · '||coalesce(v_name,'Cliente'),
      status='planned',priority='urgent',completed_at=null,cancelled_at=null,
      notes='[Venda sem estoque] Venda '||p_sale_id::text||E'\nFalta comprar/reservar: '||v_missing||E'\nConferir fornecedor e prazo; nenhuma compra foi feita automaticamente.'
    where id=v_task;
  end if;
end; $$;
revoke all on function public.sync_sale_purchase_task_v1(uuid) from public,anon,authenticated;

create or replace function public.sync_sale_purchase_task_trigger_v1()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='stock_reservations' then
    if tg_op<>'DELETE' then perform public.sync_sale_purchase_task_v1(new.sale_id); end if;
    if tg_op='DELETE' or (tg_op='UPDATE' and old.sale_id is distinct from new.sale_id) then
      perform public.sync_sale_purchase_task_v1(old.sale_id);
    end if;
  else perform public.sync_sale_purchase_task_v1(new.id);
  end if;
  return null;
end; $$;
revoke all on function public.sync_sale_purchase_task_trigger_v1() from public,anon,authenticated;
create trigger stock_reservations_sync_purchase_task after insert or update or delete on public.stock_reservations
for each row execute function public.sync_sale_purchase_task_trigger_v1();
create trigger sales_sync_purchase_task after update of general_status,delivery_status on public.sales
for each row execute function public.sync_sale_purchase_task_trigger_v1();

-- End lead-only follow-ups at confirmation; preserve the lead and quote history.
create or replace function public.close_confirmed_quote_lead_v1()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='confirmed' and new.sale_id is not null and new.lead_id is not null then
    update public.sales set lead_status='Convertido',general_status='finalized'
      where id=new.lead_id and record_type='lead' and general_status<>'cancelled'
        and (lead_status is distinct from 'Convertido' or general_status<>'finalized');
    update public.customer_interactions set status='cancelled',updated_at=now()
      where status='planned' and (sale_id=new.lead_id or notes like '[Lead:'||new.lead_id::text||']%');
  end if;
  return null;
end; $$;
revoke all on function public.close_confirmed_quote_lead_v1() from public,anon,authenticated;
create trigger sales_quotes_close_converted_lead after insert or update of status,sale_id,lead_id on public.sales_quotes
for each row execute function public.close_confirmed_quote_lead_v1();

-- Repair only unambiguous same-day orphan conversions whose original interest is covered by the sale.
do $$
declare x record;
begin
  for x in
    with candidates as (
      select l.id as lead_id,q.id as quote_id,q.lead_id as generated_lead_id,q.sale_id,
        count(*) over(partition by l.id) as lead_matches,count(*) over(partition by q.id) as quote_matches
      from public.sales l join public.sales_quotes q on q.customer_id=l.customer_id
      join public.sales s on s.id=q.sale_id
      join public.sales g on g.id=q.lead_id and g.created_at=q.created_at
      where l.record_type='lead' and l.general_status='pending' and q.status='confirmed'
        and s.general_status<>'cancelled' and l.id<>q.lead_id and l.created_at<q.created_at
        and (l.created_at at time zone 'America/Sao_Paulo')::date=(q.created_at at time zone 'America/Sao_Paulo')::date
        and not exists(select 1 from public.sales_quotes linked where linked.lead_id=l.id)
        and exists(select 1 from public.sale_items where sale_id=l.id)
        and not exists(
          select 1 from public.sale_items li where li.sale_id=l.id and not exists(
            select 1 from public.sale_items si where si.sale_id=s.id and si.product_id=li.product_id
              and (li.flavor_id is null or li.flavor_id=si.flavor_id) and si.quantity>=li.quantity))
    ) select * from candidates where lead_matches=1 and quote_matches=1
  loop
    update public.sales_quotes set lead_id=x.lead_id where id=x.quote_id;
    insert into public.audit_events(entity_type,entity_id,action,details)
      values('lead',x.lead_id,'orphan_conversion_link_repaired',jsonb_build_object('quote_id',x.quote_id,'sale_id',x.sale_id,'previous_generated_lead_id',x.generated_lead_id));
  end loop;
  for x in select distinct sale_id from public.stock_reservations where status in ('awaiting_stock','partial') loop
    perform public.sync_sale_purchase_task_v1(x.sale_id);
  end loop;
end; $$;

CREATE OR REPLACE FUNCTION public.commercial_contact_queue_v1(p_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_goal integer := 12;
  v_limit integer := greatest(1,least(coalesce(p_limit,40),100));
  v_contacted integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_leads integer := 0;
  v_repurchase integer := 0;
begin
  if not public.can_write() then
    return jsonb_build_object(
      'today',v_today,
      'goal',v_goal,
      'contacted_today',0,
      'remaining',v_goal,
      'completed',false,
      'total_eligible',0,
      'lead_eligible',0,
      'repurchase_eligible',0,
      'items','[]'::jsonb,
      'skipped',true,
      'reason','no_write_permission'
    );
  end if;

  select count(*)::integer into v_contacted
  from public.commercial_contact_days_v1 where contacted_on=v_today;

  with latest_attempt as (
    select distinct on (a.source_type,a.source_id)
      a.source_type,
      a.source_id,
      a.action,
      a.occurred_at,
      a.next_eligible_on
    from public.commercial_contact_attempts a
    order by a.source_type,a.source_id,a.occurred_at desc,a.id desc
  ),
  repurchase as (
    select
      ('repurchase:'||r.id::text) as queue_key,
      'repurchase'::text as source_type,
      r.id as source_id,
      r.customer_id,
      c.name as customer_name,
      coalesce(c.phone,s0.phone) as phone,
      coalesce(c.city,s0.city) as city,
      r.product_id,
      p.name as product_name,
      coalesce(inv.available_quantity,0)::integer as stock_quantity,
      'Recompra'::text as reason,
      case
        when la.action='contacted' and coalesce(la.next_eligible_on,v_today)<=v_today
          then 'response_check'
        else 'contact'
      end::text as stage,
      6::integer as priority_rank,
      r.due_on as reference_on,
      coalesce(la.next_eligible_on,r.due_on) as eligible_on,
      la.action as last_action,
      la.occurred_at as last_attempt_at,
      s0.quoted_at::date as last_purchase_on,
      r.due_on as estimated_due_on,
      null::text as lead_status,
      null::text as reference,
      t.notes as source_notes,
      ('/clientes/'||r.customer_id::text)::text as href,
      t.created_at as source_created_at
    from public.sale_replenishment_reminders r
    join public.operational_tasks t on t.id=r.task_id
    join public.sales s0 on s0.id=r.sale_id
    join public.customers c on c.id=r.customer_id
    join public.products p on p.id=r.product_id
    left join public.inventory_control_overview inv on inv.product_id=r.product_id
    left join latest_attempt la
      on la.source_type='repurchase' and la.source_id=r.id
    where r.status='planned'
      and t.status='planned'
      and t.notes like '[Recompra automática]%'
      and r.due_on<=v_today
      and coalesce(inv.available_quantity,0)>0
      and coalesce(la.next_eligible_on,r.due_on)<=v_today
      and not exists (
        select 1
        from public.sales s2
        join public.sale_items si2 on si2.sale_id=s2.id
        where s2.record_type='sale'
          and s2.general_status<>'cancelled'
          and s2.customer_id=r.customer_id
          and si2.product_id=r.product_id
          and coalesce(s2.delivered_at,s2.quoted_at,s2.created_at)
              > coalesce(s0.delivered_at,s0.quoted_at,s0.created_at)
      )
  ),
  lead_items as (
    select
      l.id as lead_id,
      (array_agg(si.product_id order by si.id) filter (where si.product_id is not null))[1] as product_id,
      string_agg(
        p.name||case when si.quantity>1 then ' ×'||si.quantity::text else '' end,
        ', ' order by p.name
      ) filter (where p.name is not null) as product_summary
    from public.sales l
    left join public.sale_items si on si.sale_id=l.id
    left join public.products p on p.id=si.product_id
    where l.record_type='lead'
    group by l.id
  ),
  lead_due as (
    select
      l.id as lead_id,
      min(ci.due_at) filter (where ci.status='planned') as explicit_due_on
    from public.sales l
    left join public.customer_interactions ci
      on ci.sale_id=l.id
      or ci.notes like ('[Lead:'||l.id::text||']%')
    where l.record_type='lead'
    group by l.id
  ),
  leads as (
    select
      ('lead:'||l.id::text) as queue_key,
      'lead'::text as source_type,
      l.id as source_id,
      l.customer_id,
      coalesce(c.name,'Lead') as customer_name,
      coalesce(c.phone,l.phone) as phone,
      coalesce(c.city,l.city) as city,
      li.product_id,
      coalesce(li.product_summary,'Interesse sem produto definido') as product_name,
      coalesce(inv.available_quantity,0)::integer as stock_quantity,
      coalesce(l.lead_status,'Lead')::text as reason,
      case
        when la.action='contacted' and coalesce(la.next_eligible_on,v_today)<=v_today
          then 'response_check'
        else 'contact'
      end::text as stage,
      case
        when lower(coalesce(l.lead_status,'')) in ('está quase comprando','ta quase comprando') then 1
        when lower(coalesce(l.lead_status,''))='cotação' then 2
        when lower(coalesce(l.lead_status,''))='decidindo' then 3
        when lower(coalesce(l.lead_status,''))='perguntou sobre' then 4
        else 5
      end::integer as priority_rank,
      coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date) as reference_on,
      greatest(
        coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) as eligible_on,
      la.action as last_action,
      la.occurred_at as last_attempt_at,
      null::date as last_purchase_on,
      null::date as estimated_due_on,
      l.lead_status::text as lead_status,
      l.reference::text as reference,
      l.notes::text as source_notes,
      ('/leads/'||l.id::text)::text as href,
      l.created_at as source_created_at
    from public.sales l
    join public.customers c on c.id=l.customer_id
    left join lead_items li on li.lead_id=l.id
    left join lead_due ld on ld.lead_id=l.id
    left join public.inventory_control_overview inv on inv.product_id=li.product_id
    left join latest_attempt la
      on la.source_type='lead' and la.source_id=l.id
    where l.record_type='lead'
      and l.general_status='pending'
      and lower(coalesce(l.lead_status,'')) in (
        'está quase comprando','ta quase comprando','cotação','decidindo','perguntou sobre'
      )
      and coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date)<=v_today
      and coalesce(la.next_eligible_on,'1900-01-01'::date)<=v_today
      and not exists (
        select 1
        from public.lead_stock_watches w
        where w.lead_id=l.id
          and w.status in ('waiting_stock','ready_to_contact')
      )
  ),
  candidates as (
    select * from leads
    union all
    select * from repurchase
  ),
  ranked as (
    select *
    from candidates candidate
    where not exists(select 1 from public.customer_commercial_contact_state_v1 state
      where state.customer_id=candidate.customer_id and state.pause_until>v_today)
    order by
      case when stage='response_check' then 0 else priority_rank end,
      eligible_on asc,
      last_attempt_at asc nulls first,
      source_created_at asc,
      queue_key
  ),
  limited as (
    select * from ranked limit v_limit
  )
  select
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(l)
          order by
            case when l.stage='response_check' then 0 else l.priority_rank end,
            l.eligible_on,
            l.last_attempt_at asc nulls first,
            l.source_created_at,
            l.queue_key
        )
        from limited l
      ),
      '[]'::jsonb
    ),
    (select count(*)::integer from ranked),
    (select count(*)::integer from ranked where source_type='lead'),
    (select count(*)::integer from ranked where source_type='repurchase')
  into v_items,v_total,v_leads,v_repurchase;

  return jsonb_build_object(
    'today',v_today,
    'goal',v_goal,
    'contacted_today',v_contacted,
    'remaining',greatest(v_goal-v_contacted,0),
    'completed',v_contacted>=v_goal,
    'total_eligible',v_total,
    'lead_eligible',v_leads,
    'repurchase_eligible',v_repurchase,
    'items',v_items
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.commercial_contact_queue_people_v1(p_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_goal integer := 12;
  v_limit integer := greatest(1,least(coalesce(p_limit,40),100));
  v_raw jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_total_contexts integer := 0;
  v_leads integer := 0;
  v_repurchase integer := 0;
  v_contacted integer := 0;
begin
  v_raw := public.commercial_contact_queue_v1(100);

  if coalesce((v_raw->>'skipped')::boolean,false) then
    return v_raw;
  end if;

  select count(*)::integer into v_contacted
  from public.commercial_contact_days_v1 where contacted_on=v_today;

  with raw_items as (
    select
      x.item,
      x.item->>'customer_id' as customer_id,
      x.item->>'source_type' as source_type,
      coalesce(nullif(x.item->>'priority_rank','')::integer,99) as priority_rank,
      x.item->>'stage' as stage,
      nullif(x.item->>'eligible_on','')::date as eligible_on,
      nullif(x.item->>'last_attempt_at','')::timestamptz as last_attempt_at,
      nullif(x.item->>'source_created_at','')::timestamptz as source_created_at,
      x.item->>'queue_key' as queue_key
    from jsonb_array_elements(coalesce(v_raw->'items','[]'::jsonb)) as x(item)
    where nullif(x.item->>'customer_id','') is not null
  ),
  ranked as (
    select
      r.*,
      row_number() over (
        partition by r.customer_id
        order by
          case when r.stage='response_check' then 0 else r.priority_rank end,
          r.eligible_on asc nulls first,
          r.last_attempt_at asc nulls first,
          r.source_created_at asc nulls first,
          r.queue_key
      ) as rn
    from raw_items r
  ),
  grouped as (
    select
      r.customer_id,
      count(*)::integer as context_count,
      bool_or(r.source_type='lead') as has_lead,
      bool_or(r.source_type='repurchase') as has_repurchase,
      jsonb_agg(
        r.item
        order by
          case when r.stage='response_check' then 0 else r.priority_rank end,
          r.eligible_on asc nulls first,
          r.last_attempt_at asc nulls first,
          r.source_created_at asc nulls first,
          r.queue_key
      ) as contexts
    from ranked r
    group by r.customer_id
  ),
  people as (
    select
      (
        r.item || jsonb_build_object(
          'queue_key','customer:'||r.customer_id,
          'href','/clientes/'||r.customer_id,
          'context_count',g.context_count,
          'contexts',g.contexts,
          'product_name',case
            when g.context_count=1 then r.item->>'product_name'
            else g.context_count::text||' assuntos comerciais'
          end,
          'reason',case
            when g.context_count=1 then r.item->>'reason'
            else 'Múltiplos contextos'
          end
        )
      ) as person_item,
      r.customer_id,
      g.context_count,
      g.has_lead,
      g.has_repurchase,
      case when r.stage='response_check' then 0 else r.priority_rank end as sort_rank,
      r.eligible_on,
      r.last_attempt_at,
      r.source_created_at,
      r.queue_key
    from ranked r
    join grouped g on g.customer_id=r.customer_id
    where r.rn=1
  ),
  limited_people as (
    select *
    from people
    order by
      sort_rank,
      eligible_on asc nulls first,
      last_attempt_at asc nulls first,
      source_created_at asc nulls first,
      queue_key
    limit v_limit
  )
  select
    coalesce((select jsonb_agg(lp.person_item order by lp.sort_rank,lp.eligible_on asc nulls first,lp.last_attempt_at asc nulls first,lp.source_created_at asc nulls first,lp.queue_key) from limited_people lp),'[]'::jsonb),
    (select count(*)::integer from people),
    coalesce((select sum(context_count)::integer from people),0),
    (select count(*)::integer from people where has_lead),
    (select count(*)::integer from people where has_repurchase)
  into v_items,v_total,v_total_contexts,v_leads,v_repurchase;

  return jsonb_build_object(
    'today',v_today,
    'goal',v_goal,
    'contacted_today',v_contacted,
    'remaining',greatest(v_goal-v_contacted,0),
    'completed',v_contacted>=v_goal,
    'total_eligible',v_total,
    'total_contexts',v_total_contexts,
    'lead_eligible',v_leads,
    'repurchase_eligible',v_repurchase,
    'items',v_items
  );
end;
$function$;

create or replace view public.customer_sales_opportunities_actionable_v2 as
SELECT o.customer_id,
    o.customer_name,
    o.phone,
    o.city,
    o.opportunity_group,
    o.opportunity_subtype,
    o.recommended_product_id,
    o.recommended_product_name,
    o.recommended_product_price,
    o.source_product_name,
    o.last_relevant_purchase_at,
    o.expected_action_on,
    o.days_to_action,
    o.priority,
    o.confidence,
    o.opportunity_score,
    o.reason,
    o.recommended_action,
    f.feedback_status AS last_feedback_status,
    f.next_action_on AS feedback_next_action_on,
    f.created_at AS feedback_at
   FROM (customer_sales_opportunities_v1 o
     LEFT JOIN LATERAL ( SELECT x.feedback_status,
            x.next_action_on,
            x.created_at
           FROM customer_sales_opportunity_feedback x
          WHERE ((x.customer_id = o.customer_id) AND (NOT (x.recommended_product_id IS DISTINCT FROM o.recommended_product_id)) AND ((x.opportunity_group IS NULL) OR (x.opportunity_group = o.opportunity_group)))
          ORDER BY x.created_at DESC
         LIMIT 1) f ON (true))
  WHERE ((f.created_at IS NULL) OR
        CASE f.feedback_status
            WHEN 'not_interested'::text THEN (f.created_at < (now() - '60 days'::interval))
            WHEN 'bought_elsewhere'::text THEN (f.created_at < (now() - '30 days'::interval))
            WHEN 'still_using'::text THEN (COALESCE(f.next_action_on, (((f.created_at AT TIME ZONE 'America/Sao_Paulo'::text))::date + 14)) <= ((now() AT TIME ZONE 'America/Sao_Paulo'::text))::date)
            WHEN 'later'::text THEN (COALESCE(f.next_action_on, (((f.created_at AT TIME ZONE 'America/Sao_Paulo'::text))::date + 7)) <= ((now() AT TIME ZONE 'America/Sao_Paulo'::text))::date)
            WHEN 'sale_completed'::text THEN (f.created_at < (now() - '14 days'::interval))
            WHEN 'dismissed'::text THEN (f.created_at < (now() - '30 days'::interval))
            WHEN 'contacted'::text THEN (f.created_at < (now() - '2 days'::interval))
            ELSE true
        END) AND NOT EXISTS (
  select 1 from public.customer_commercial_contact_state_v1 cs
  where cs.customer_id=o.customer_id and cs.pause_until>(now() at time zone 'America/Sao_Paulo')::date
);
