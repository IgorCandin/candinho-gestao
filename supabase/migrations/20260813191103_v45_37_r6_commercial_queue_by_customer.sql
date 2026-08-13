-- V45.37.R6 · Fila Comercial por pessoa
-- Já aplicada no Supabase oficial em 13/08/2026.
-- Mantém a fila bruta V45.30 para compatibilidade e cria uma camada agrupada por cliente.

create or replace function public.commercial_contact_queue_people_v1(p_limit integer default 40)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
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

  select count(distinct a.customer_id)::integer
  into v_contacted
  from public.commercial_contact_attempts a
  where a.action='contacted'
    and a.customer_id is not null
    and (a.occurred_at at time zone 'America/Sao_Paulo')::date=v_today;

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
$$;

revoke all on function public.commercial_contact_queue_people_v1(integer) from public,anon;
grant execute on function public.commercial_contact_queue_people_v1(integer) to authenticated,service_role;

create or replace function public.commercial_contact_customer_action_v1(
  p_customer_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_next date;
  v_snapshot jsonb;
  v_person jsonb;
  v_context jsonb;
  v_contexts jsonb;
  v_source_type text;
  v_source_id uuid;
  v_product_id uuid;
  v_sale_id uuid;
  v_attempt_id uuid;
  v_first_attempt_id uuid;
  v_attempt_ids jsonb := '[]'::jsonb;
  v_context_count integer := 0;
  v_customer_name text;
  v_context_lines text := null;
  v_interaction_note text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para trabalhar a fila comercial';
  end if;
  if p_action not in ('contacted','skipped','no_response','responded') then
    raise exception 'Ação comercial inválida';
  end if;

  v_snapshot := public.commercial_contact_queue_people_v1(100);

  select x.item
  into v_person
  from jsonb_array_elements(coalesce(v_snapshot->'items','[]'::jsonb)) as x(item)
  where x.item->>'customer_id'=p_customer_id::text
  limit 1;

  if v_person is null then
    raise exception 'Cliente não está mais elegível na fila comercial';
  end if;

  v_contexts := coalesce(v_person->'contexts',jsonb_build_array(v_person));
  v_context_count := jsonb_array_length(v_contexts);

  v_next := case p_action
    when 'contacted' then v_today+2
    when 'skipped' then v_today+1
    when 'no_response' then v_today+7
    when 'responded' then v_today+3
  end;

  select c.name into v_customer_name
  from public.customers c
  where c.id=p_customer_id;

  for v_context in
    select x.item from jsonb_array_elements(v_contexts) as x(item)
  loop
    v_source_type := v_context->>'source_type';
    v_source_id := (v_context->>'source_id')::uuid;
    v_product_id := nullif(v_context->>'product_id','')::uuid;

    if v_sale_id is null and v_source_type='lead' then
      v_sale_id := v_source_id;
    elsif v_sale_id is null and v_source_type='repurchase' then
      select r.sale_id into v_sale_id
      from public.sale_replenishment_reminders r
      where r.id=v_source_id;
    end if;

    insert into public.commercial_contact_attempts(
      source_type,source_id,customer_id,product_id,action,next_eligible_on,notes,created_by
    ) values (
      v_source_type,v_source_id,p_customer_id,v_product_id,p_action,v_next,
      nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
    ) returning id into v_attempt_id;

    if v_first_attempt_id is null then
      v_first_attempt_id := v_attempt_id;
    end if;

    v_attempt_ids := v_attempt_ids || jsonb_build_array(v_attempt_id);
    v_context_lines := concat_ws(
      E'\n',
      v_context_lines,
      '• '||case v_source_type when 'repurchase' then 'Recompra' else 'Lead' end||
      ' · '||coalesce(v_context->>'product_name','Produto não informado')||
      case when nullif(v_context->>'reason','') is not null then ' · '||(v_context->>'reason') else '' end
    );
  end loop;

  if p_action<>'skipped' then
    v_interaction_note := concat_ws(
      E'\n',
      '[Fila Comercial] '||v_context_count::text||' contexto(s) · ação: '||p_action,
      v_context_lines,
      nullif(btrim(coalesce(p_notes,'')),'')
    );

    insert into public.customer_interactions(
      customer_id,sale_id,interaction_type,status,channel,occurred_at,completed_at,outcome,notes,created_by
    ) values (
      p_customer_id,v_sale_id,'follow_up','completed','WhatsApp',now(),now(),p_action,v_interaction_note,auth.uid()
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'commercial_contact',
    coalesce(v_first_attempt_id,p_customer_id),
    'customer_queue_action',
    jsonb_build_object(
      'customer_id',p_customer_id,
      'customer_name',v_customer_name,
      'action',p_action,
      'context_count',v_context_count,
      'attempt_ids',v_attempt_ids,
      'next_eligible_on',v_next
    )
  );

  return jsonb_build_object(
    'ok',true,
    'customer_id',p_customer_id,
    'action',p_action,
    'context_count',v_context_count,
    'attempt_ids',v_attempt_ids,
    'next_eligible_on',v_next
  );
end;
$$;

revoke all on function public.commercial_contact_customer_action_v1(uuid,text,text) from public,anon;
grant execute on function public.commercial_contact_customer_action_v1(uuid,text,text) to authenticated,service_role;
