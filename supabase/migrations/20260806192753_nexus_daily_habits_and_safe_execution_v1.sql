create table if not exists public.nexus_action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  operation_scope text not null default 'supplements',
  action_kind text not null check (action_kind in ('signal_status','schedule_customer_followup','create_operational_task')),
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  preview jsonb not null default '{}'::jsonb,
  source_route text,
  status text not null default 'preview' check (status in ('preview','executed','cancelled','expired','failed')),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  executed_at timestamptz,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nexus_action_plans_user_created
  on public.nexus_action_plans(user_id, created_at desc);
create index if not exists idx_nexus_action_plans_status_expiry
  on public.nexus_action_plans(status, expires_at);

alter table public.nexus_action_plans enable row level security;

drop policy if exists nexus_action_plans_read_own on public.nexus_action_plans;
create policy nexus_action_plans_read_own
  on public.nexus_action_plans
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.nexus_action_plans from authenticated;
grant select on public.nexus_action_plans to authenticated;

create or replace function public.normalize_nexus_route_v1(p_route text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          split_part(split_part(coalesce(p_route,''),'?',1),'#',1),
          '/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}',
          '/:id',
          'g'
        ),
        '/[0-9]+/',
        '/:id/',
        'g'
      ),
      '/[0-9]+$',
      '/:id'
    ),
    280
  );
$$;

create or replace function public.nexus_daily_snapshot_v1(p_route text default '/suplementos')
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_route text;
  v_queue jsonb := '[]'::jsonb;
  v_next jsonb := null;
  v_shortcuts jsonb := '[]'::jsonb;
  v_workflows jsonb := '[]'::jsonb;
  v_usage jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_event_count integer := 0;
  v_active_days integer := 0;
  v_routes integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão inválida';
  end if;

  v_route := public.normalize_nexus_route_v1(coalesce(p_route,'/suplementos'));

  select coalesce(jsonb_agg(row_obj order by score desc, last_seen_at desc),'[]'::jsonb)
  into v_queue
  from (
    select
      jsonb_build_object(
        'id', s.id,
        'signal_type', s.signal_type,
        'severity', s.severity,
        'title', s.title,
        'summary', s.summary,
        'recommended_action', s.recommended_action,
        'action_label', s.action_label,
        'action_href', s.action_href,
        'score', s.score,
        'customer_id', s.customer_id,
        'product_id', s.product_id,
        'partner_id', s.partner_id,
        'metadata', s.metadata
      ) as row_obj,
      s.score,
      s.last_seen_at
    from public.nexus_signals s
    where s.operation_scope='supplements'
      and s.status='open'
    order by s.score desc, s.last_seen_at desc
    limit 8
  ) q;

  if jsonb_array_length(v_queue) > 0 then
    v_next := v_queue->0;
  end if;

  with grouped as (
    select
      e.target_route,
      count(*)::integer as transitions_30d,
      count(*) filter(where e.created_at >= now()-interval '7 days')::integer as transitions_7d,
      count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)::integer as distinct_days,
      max(e.created_at) as last_seen_at
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind='navigation_click'
      and e.created_at >= now()-interval '30 days'
      and e.route=v_route
      and e.target_route is not null
      and e.target_route<>v_route
    group by e.target_route
  ), total as (
    select coalesce(sum(transitions_30d),0)::numeric as total_transitions from grouped
  ), ranked as (
    select
      g.*,
      round((100*g.transitions_30d/nullif(t.total_transitions,0))::numeric,1) as confidence
    from grouped g cross join total t
    order by g.transitions_30d desc, g.last_seen_at desc
    limit 6
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'from_route', v_route,
    'to_route', target_route,
    'transitions_30d', transitions_30d,
    'transitions_7d', transitions_7d,
    'distinct_days', distinct_days,
    'confidence', confidence,
    'last_seen_at', last_seen_at
  ) order by transitions_30d desc, last_seen_at desc),'[]'::jsonb)
  into v_shortcuts
  from ranked;

  with ordered as (
    select
      e.session_id,
      e.route as step1,
      e.target_route as step2,
      lead(e.route) over(partition by e.session_id order by e.created_at,e.id) as next_route,
      lead(e.target_route) over(partition by e.session_id order by e.created_at,e.id) as step3,
      e.created_at
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind='navigation_click'
      and e.created_at >= now()-interval '30 days'
      and e.session_id is not null
      and e.target_route is not null
  ), grouped as (
    select
      step1, step2, step3,
      count(*)::integer as repetitions,
      count(distinct (created_at at time zone 'America/Sao_Paulo')::date)::integer as distinct_days,
      max(created_at) as last_seen_at
    from ordered
    where next_route=step2
      and step3 is not null
      and step1<>step2
    group by step1,step2,step3
    having count(*)>=2
    order by count(*) desc, max(created_at) desc
    limit 8
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'step1',step1,
    'step2',step2,
    'step3',step3,
    'repetitions',repetitions,
    'distinct_days',distinct_days,
    'last_seen_at',last_seen_at
  ) order by repetitions desc,last_seen_at desc),'[]'::jsonb)
  into v_workflows
  from grouped;

  with dwell as (
    select
      route,
      avg(greatest(0,least(1800000,coalesce((metadata->>'duration_ms')::integer,0))))::numeric as avg_duration_ms
    from public.nexus_activity_events
    where user_id=v_user
      and action_kind='route_exit'
      and created_at >= now()-interval '30 days'
      and metadata ? 'duration_ms'
    group by route
  ), usage_rows as (
    select
      e.route,
      max(e.operation_scope) as operation_scope,
      count(*)::integer as visits_30d,
      count(*) filter(where e.created_at >= now()-interval '7 days')::integer as visits_7d,
      count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)::integer as distinct_days,
      max(e.created_at) as last_seen_at,
      coalesce(d.avg_duration_ms,0) as avg_duration_ms
    from public.nexus_activity_events e
    left join dwell d on d.route=e.route
    where e.user_id=v_user
      and e.action_kind='page_view'
      and e.created_at >= now()-interval '30 days'
    group by e.route,d.avg_duration_ms
    order by count(*) desc,max(e.created_at) desc
    limit 12
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'route',route,
    'operation_scope',operation_scope,
    'visits_30d',visits_30d,
    'visits_7d',visits_7d,
    'distinct_days',distinct_days,
    'last_seen_at',last_seen_at,
    'avg_duration_seconds',round((avg_duration_ms/1000)::numeric,1)
  ) order by visits_30d desc,last_seen_at desc),'[]'::jsonb)
  into v_usage
  from usage_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,
    'action_kind',action_kind,
    'title',title,
    'summary',summary,
    'status',status,
    'source_route',source_route,
    'created_at',created_at,
    'executed_at',executed_at,
    'result',result
  ) order by created_at desc),'[]'::jsonb)
  into v_history
  from (
    select *
    from public.nexus_action_plans
    where user_id=v_user
    order by created_at desc
    limit 10
  ) h;

  select
    count(*)::integer,
    count(distinct (created_at at time zone 'America/Sao_Paulo')::date)::integer,
    count(distinct route) filter(where action_kind='page_view')::integer
  into v_event_count,v_active_days,v_routes
  from public.nexus_activity_events
  where user_id=v_user
    and created_at >= now()-interval '30 days';

  return jsonb_build_object(
    'generated_at',now(),
    'route',v_route,
    'next_action',v_next,
    'queue',v_queue,
    'shortcuts',v_shortcuts,
    'workflows',v_workflows,
    'usage',v_usage,
    'action_history',v_history,
    'stats',jsonb_build_object(
      'events_30d',coalesce(v_event_count,0),
      'active_days_30d',coalesce(v_active_days,0),
      'learned_routes',coalesce(v_routes,0),
      'repeated_workflows',jsonb_array_length(v_workflows),
      'contextual_shortcuts',jsonb_array_length(v_shortcuts)
    )
  );
end;
$$;

grant execute on function public.nexus_daily_snapshot_v1(text) to authenticated;

create or replace function public.nexus_prepare_action_v1(
  p_action_kind text,
  p_payload jsonb default '{}'::jsonb,
  p_source_route text default null
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_plan_id uuid;
  v_title text;
  v_summary text;
  v_preview jsonb;
  v_signal public.nexus_signals%rowtype;
  v_customer_name text;
  v_action text;
  v_days integer;
  v_due_at timestamptz;
  v_priority text;
  v_category text;
  v_scope text;
begin
  if v_user is null or not public.can_write() then
    raise exception 'Usuário sem permissão para preparar ações do Nexus';
  end if;

  if p_action_kind not in ('signal_status','schedule_customer_followup','create_operational_task') then
    raise exception 'Tipo de ação não suportado';
  end if;

  if p_action_kind='signal_status' then
    select * into v_signal
    from public.nexus_signals
    where id=nullif(p_payload->>'signal_id','')::uuid;

    if not found then raise exception 'Sinal do Nexus não encontrado'; end if;

    v_action:=lower(coalesce(p_payload->>'action','snooze'));
    if v_action not in ('snooze','resolve','dismiss') then
      raise exception 'Ação de sinal inválida';
    end if;

    v_days:=greatest(1,least(coalesce((p_payload->>'snooze_days')::integer,3),30));
    v_title:=case v_action
      when 'resolve' then 'Concluir sinal do Nexus'
      when 'dismiss' then 'Ignorar este sinal'
      else 'Adiar sinal do Nexus'
    end;
    v_summary:=v_signal.title;
    v_preview:=jsonb_build_object(
      'headline',v_title,
      'description',v_signal.title,
      'changes',jsonb_build_array(
        case v_action
          when 'resolve' then 'O sinal sai da fila como resolvido.'
          when 'dismiss' then 'O sinal sai da fila como ignorado.'
          else 'O sinal sai da fila por '||v_days||' dia(s).'
        end,
        'O registro original do ERP não será apagado.'
      ),
      'reversible',true,
      'expires_in_minutes',20
    );

  elsif p_action_kind='schedule_customer_followup' then
    select name into v_customer_name
    from public.customers
    where id=nullif(p_payload->>'customer_id','')::uuid
      and active;

    if v_customer_name is null then raise exception 'Cliente não encontrado'; end if;

    v_due_at:=nullif(p_payload->>'due_at','')::timestamptz;
    if v_due_at is null then raise exception 'Informe a data do retorno'; end if;

    v_priority:=coalesce(nullif(p_payload->>'priority',''),'normal');
    if v_priority not in ('normal','attention','urgent') then
      raise exception 'Prioridade inválida';
    end if;

    v_title:='Agendar retorno · '||v_customer_name;
    v_summary:='O Nexus criará ou atualizará o retorno pendente deste cliente.';
    v_preview:=jsonb_build_object(
      'headline',v_title,
      'description','Retorno em '||to_char(v_due_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),
      'changes',jsonb_build_array(
        'Cliente: '||v_customer_name,
        'Prioridade: '||v_priority,
        'Se já existir um retorno do Radar, ele será atualizado em vez de duplicado.'
      ),
      'reversible',true,
      'expires_in_minutes',20
    );

  else
    if length(btrim(coalesce(p_payload->>'title','')))<2 then
      raise exception 'Informe o título da tarefa';
    end if;

    v_due_at:=nullif(p_payload->>'due_at','')::timestamptz;
    if v_due_at is null then raise exception 'Informe a data da tarefa'; end if;

    v_category:=coalesce(nullif(p_payload->>'category',''),'task');
    if v_category not in ('task','delivery','payment','follow_up','post_sale','supplier','other') then
      raise exception 'Categoria inválida';
    end if;

    v_priority:=coalesce(nullif(p_payload->>'priority',''),'normal');
    if v_priority not in ('normal','attention','urgent') then
      raise exception 'Prioridade inválida';
    end if;

    v_scope:=coalesce(nullif(p_payload->>'operation_scope',''),'supplements');
    if v_scope not in ('company','supplements','fitness','marketing') then
      raise exception 'Operação inválida';
    end if;

    v_title:='Criar tarefa · '||btrim(p_payload->>'title');
    v_summary:='O Nexus criará uma tarefa operacional oficial.';
    v_preview:=jsonb_build_object(
      'headline',v_title,
      'description','Prazo em '||to_char(v_due_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),
      'changes',jsonb_build_array(
        'Categoria: '||v_category,
        'Prioridade: '||v_priority,
        'Operação: '||v_scope
      ),
      'reversible',true,
      'expires_in_minutes',20
    );
  end if;

  insert into public.nexus_action_plans(
    user_id,operation_scope,action_kind,title,summary,payload,preview,source_route,status,expires_at
  ) values(
    v_user,
    coalesce(v_scope,'supplements'),
    p_action_kind,
    v_title,
    v_summary,
    coalesce(p_payload,'{}'::jsonb),
    v_preview,
    public.normalize_nexus_route_v1(p_source_route),
    'preview',
    now()+interval '20 minutes'
  ) returning id into v_plan_id;

  return jsonb_build_object(
    'plan_id',v_plan_id,
    'status','preview',
    'action_kind',p_action_kind,
    'title',v_title,
    'summary',v_summary,
    'preview',v_preview,
    'expires_at',now()+interval '20 minutes'
  );
end;
$$;

grant execute on function public.nexus_prepare_action_v1(text,jsonb,text) to authenticated;

create or replace function public.nexus_execute_action_v1(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_plan public.nexus_action_plans%rowtype;
  v_entity_id uuid;
  v_result jsonb:='{}'::jsonb;
  v_signal jsonb;
  v_due_at timestamptz;
  v_days integer;
begin
  if v_user is null or not public.can_write() then
    raise exception 'Usuário sem permissão para executar ações do Nexus';
  end if;

  select * into v_plan
  from public.nexus_action_plans
  where id=p_plan_id and user_id=v_user
  for update;

  if not found then raise exception 'Plano de ação não encontrado'; end if;
  if v_plan.status<>'preview' then raise exception 'Este plano já foi finalizado'; end if;

  if v_plan.expires_at<now() then
    update public.nexus_action_plans
    set status='expired',updated_at=now()
    where id=p_plan_id;
    raise exception 'O preview expirou. Gere uma nova confirmação.';
  end if;

  begin
    if v_plan.action_kind='signal_status' then
      v_days:=greatest(1,least(coalesce((v_plan.payload->>'snooze_days')::integer,3),30));
      select to_jsonb(x) into v_signal
      from public.update_nexus_signal_status_v1(
        nullif(v_plan.payload->>'signal_id','')::uuid,
        lower(coalesce(v_plan.payload->>'action','snooze')),
        v_days
      ) x;
      v_result:=jsonb_build_object('signal',v_signal);

    elsif v_plan.action_kind='schedule_customer_followup' then
      v_due_at:=nullif(v_plan.payload->>'due_at','')::timestamptz;
      v_entity_id:=public.central_schedule_radar_followup(
        nullif(v_plan.payload->>'customer_id','')::uuid,
        v_due_at,
        coalesce(nullif(v_plan.payload->>'priority',''),'normal'),
        nullif(v_plan.payload->>'notes','')
      );
      v_result:=jsonb_build_object('task_id',v_entity_id);

    elsif v_plan.action_kind='create_operational_task' then
      v_due_at:=nullif(v_plan.payload->>'due_at','')::timestamptz;
      v_entity_id:=public.central_create_operational_task(
        p_title=>btrim(v_plan.payload->>'title'),
        p_category=>coalesce(nullif(v_plan.payload->>'category',''),'task'),
        p_due_at=>v_due_at,
        p_priority=>coalesce(nullif(v_plan.payload->>'priority',''),'normal'),
        p_operation_scope=>coalesce(nullif(v_plan.payload->>'operation_scope',''),'supplements'),
        p_central_contact_id=>null,
        p_assigned_to=>v_user,
        p_notes=>nullif(v_plan.payload->>'notes','')
      );
      v_result:=jsonb_build_object('task_id',v_entity_id);
    else
      raise exception 'Ação não suportada';
    end if;

    update public.nexus_action_plans
    set status='executed',executed_at=now(),result=v_result,updated_at=now()
    where id=p_plan_id;

    insert into public.audit_events(entity_type,entity_id,action,details)
    values('nexus_action_plan',p_plan_id,'executed',jsonb_build_object(
      'action_kind',v_plan.action_kind,
      'source_route',v_plan.source_route,
      'result',v_result
    ));

    return jsonb_build_object(
      'plan_id',p_plan_id,
      'status','executed',
      'action_kind',v_plan.action_kind,
      'title',v_plan.title,
      'result',v_result
    );
  exception when others then
    update public.nexus_action_plans
    set status='failed',error_message=sqlerrm,updated_at=now()
    where id=p_plan_id;
    raise;
  end;
end;
$$;

grant execute on function public.nexus_execute_action_v1(uuid) to authenticated;
