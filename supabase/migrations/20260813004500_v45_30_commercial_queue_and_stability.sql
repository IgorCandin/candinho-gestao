-- V45.30 · fila comercial enxuta + estabilidade da Agenda/Google Calendar
-- Esta migration já foi aplicada no Supabase oficial em 12/08/2026.

-- Comercial voltou a ler a view criada na V45.28.
grant select on public.sales_history_v2 to authenticated, service_role;

-- A antiga função de "balanceamento" deixa de mover centenas de datas.
-- A fila comercial passa a ser uma entidade própria e esta RPC vira leitura leve.
create or replace function public.rebalance_flexible_commercial_contacts_v1(
  p_daily_cap integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cap integer := greatest(coalesce(p_daily_cap,12),1);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_repurchase integer := 0;
  v_leads integer := 0;
begin
  if not public.can_write() then
    return jsonb_build_object('skipped',true,'reason','no_write_permission');
  end if;

  select count(*)::integer into v_repurchase
  from public.operational_tasks t
  where t.status='planned'
    and t.operation_scope='supplements'
    and t.notes like '[Recompra automática]%';

  select count(*)::integer into v_leads
  from public.sales l
  where l.record_type='lead'
    and l.general_status<>'cancelled'
    and lower(coalesce(l.lead_status,''))<>'convertido';

  return jsonb_build_object(
    'daily_cap',v_cap,
    'today',v_today,
    'repurchase_pending',v_repurchase,
    'lead_pending',v_leads,
    'total_pending',v_repurchase+v_leads,
    'moved',0,
    'mode','read_only_queue'
  );
end;
$$;

-- Recompras automáticas NÃO viram centenas de eventos no Google Calendar.
-- Os demais eventos apenas entram na fila; o cron é responsável por despachar em lote.
create or replace function public.queue_operational_task_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_old_type text;
  v_new_type text;
begin
  if new.operation_scope='supplements'
     and new.notes like '[Recompra automática]%' then
    return new;
  end if;

  if tg_op='UPDATE' then
    v_old_type := case when old.operation_scope='marketing' then 'marketing_task' else 'operational_task' end;
    v_new_type := case when new.operation_scope='marketing' then 'marketing_task' else 'operational_task' end;
    if v_old_type<>v_new_type then
      perform public.enqueue_google_calendar_sync(v_old_type,old.id,'delete');
    end if;
  else
    v_new_type := case when new.operation_scope='marketing' then 'marketing_task' else 'operational_task' end;
  end if;

  if new.operation_scope in ('company','supplements','fitness','marketing') then
    perform public.enqueue_google_calendar_sync(
      v_new_type,
      new.id,
      case when new.status='planned' and new.due_at is not null then 'upsert' else 'delete' end
    );
  end if;
  return new;
end;
$$;

create or replace function public.queue_post_sale_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.enqueue_google_calendar_sync(
    'post_sale',new.id,
    case when new.status='planned' and new.completed_at is null and new.cancelled_at is null then 'upsert' else 'delete' end
  );
  return new;
end;
$$;

create or replace function public.queue_strategic_agenda_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.enqueue_google_calendar_sync(
    'strategic_agenda',new.id,
    case when new.status='planned' and new.scheduled_on is not null then 'upsert' else 'delete' end
  );
  return new;
end;
$$;

create or replace function public.queue_marketing_task_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.operation_scope='marketing' and new.operation_scope<>'marketing' then
    perform public.enqueue_google_calendar_sync('marketing_task',old.id,'delete');
    return new;
  end if;
  if new.operation_scope='marketing' then
    perform public.enqueue_google_calendar_sync(
      'marketing_task',new.id,
      case when new.status='planned' and new.due_at is not null then 'upsert' else 'delete' end
    );
  end if;
  return new;
end;
$$;

create or replace function public.claim_google_calendar_sync_jobs(p_limit integer default 4)
returns setof public.central_calendar_sync_queue
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with picked as (
    select q.id
    from public.central_calendar_sync_queue q
    left join public.operational_tasks t
      on q.source_type='operational_task' and q.source_id=t.id
    where (
      q.status='pending'
      or (q.status='error' and q.attempts<5 and q.updated_at>=now()-interval '7 days')
    )
      and not (
        q.source_type='operational_task'
        and t.notes like '[Recompra automática]%'
      )
    order by case when q.status='pending' then 0 else 1 end,q.updated_at asc
    for update of q skip locked
    limit least(greatest(coalesce(p_limit,4),1),4)
  )
  update public.central_calendar_sync_queue q
  set status='processing',updated_at=now()
  from picked
  where q.id=picked.id
  returning q.*;
end;
$$;

create or replace function public.dispatch_google_calendar_sync()
returns bigint
language plpgsql
security definer
set search_path='public','net'
as $$
declare
  v_endpoint text;
  v_secret text;
  v_request_id bigint;
begin
  select sync_endpoint,sync_secret into v_endpoint,v_secret
  from public.central_calendar_internal_config
  where singleton=true;
  if v_endpoint is null or v_secret is null then return null; end if;

  select net.http_post(
    url:=v_endpoint,
    headers:=jsonb_build_object('Content-Type','application/json','x-candinho-sync-secret',v_secret),
    body:='{"limit":4}'::jsonb,
    timeout_milliseconds:=8000
  ) into v_request_id;
  return v_request_id;
end;
$$;

-- Fila comercial executável.
create table if not exists public.commercial_contact_attempts (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('repurchase','lead')),
  source_id uuid not null,
  customer_id uuid references public.customers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  action text not null check (action in ('contacted','skipped','no_response','responded')),
  occurred_at timestamptz not null default now(),
  next_eligible_on date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists commercial_contact_attempts_source_idx
  on public.commercial_contact_attempts(source_type,source_id,occurred_at desc);
create index if not exists commercial_contact_attempts_day_idx
  on public.commercial_contact_attempts(occurred_at desc,action);
create index if not exists commercial_contact_attempts_customer_idx
  on public.commercial_contact_attempts(customer_id,occurred_at desc);

alter table public.commercial_contact_attempts enable row level security;
revoke all on public.commercial_contact_attempts from anon,authenticated;
grant select on public.commercial_contact_attempts to service_role;

create or replace function public.commercial_contact_queue_v1(p_limit integer default 40)
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
  v_contacted integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_leads integer := 0;
  v_repurchase integer := 0;
begin
  if not public.can_write() then
    return jsonb_build_object(
      'today',v_today,'goal',v_goal,'contacted_today',0,'remaining',v_goal,
      'completed',false,'total_eligible',0,'lead_eligible',0,'repurchase_eligible',0,
      'items','[]'::jsonb,'skipped',true,'reason','no_write_permission'
    );
  end if;

  select count(*)::integer into v_contacted
  from public.commercial_contact_attempts a
  where a.action='contacted'
    and (a.occurred_at at time zone 'America/Sao_Paulo')::date=v_today;

  with latest_attempt as (
    select distinct on (a.source_type,a.source_id)
      a.source_type,a.source_id,a.action,a.occurred_at,a.next_eligible_on
    from public.commercial_contact_attempts a
    order by a.source_type,a.source_id,a.occurred_at desc,a.id desc
  ),
  repurchase as (
    select
      ('repurchase:'||r.id::text) queue_key,'repurchase'::text source_type,r.id source_id,
      r.customer_id,c.name customer_name,coalesce(c.phone,s0.phone) phone,coalesce(c.city,s0.city) city,
      r.product_id,p.name product_name,coalesce(inv.available_quantity,0)::integer stock_quantity,
      'Recompra'::text reason,
      case when la.action='contacted' and coalesce(la.next_eligible_on,v_today)<=v_today then 'response_check' else 'contact' end::text stage,
      6::integer priority_rank,r.due_on reference_on,coalesce(la.next_eligible_on,r.due_on) eligible_on,
      la.action last_action,la.occurred_at last_attempt_at,s0.quoted_at::date last_purchase_on,
      r.due_on estimated_due_on,null::text lead_status,null::text reference,t.notes source_notes,
      ('/clientes/'||r.customer_id::text)::text href,t.created_at source_created_at
    from public.sale_replenishment_reminders r
    join public.operational_tasks t on t.id=r.task_id
    join public.sales s0 on s0.id=r.sale_id
    join public.customers c on c.id=r.customer_id
    join public.products p on p.id=r.product_id
    left join public.inventory_control_overview inv on inv.product_id=r.product_id
    left join latest_attempt la on la.source_type='repurchase' and la.source_id=r.id
    where r.status='planned' and t.status='planned' and t.notes like '[Recompra automática]%'
      and r.due_on<=v_today and coalesce(inv.available_quantity,0)>0
      and coalesce(la.next_eligible_on,r.due_on)<=v_today
      and not exists (
        select 1 from public.sales s2
        join public.sale_items si2 on si2.sale_id=s2.id
        where s2.record_type='sale' and s2.general_status<>'cancelled'
          and s2.customer_id=r.customer_id and si2.product_id=r.product_id
          and coalesce(s2.delivered_at,s2.quoted_at,s2.created_at)>coalesce(s0.delivered_at,s0.quoted_at,s0.created_at)
      )
  ),
  lead_items as (
    select l.id lead_id,
      (array_agg(si.product_id order by si.id) filter (where si.product_id is not null))[1] product_id,
      string_agg(p.name||case when si.quantity>1 then ' ×'||si.quantity::text else '' end,', ' order by p.name)
        filter (where p.name is not null) product_summary
    from public.sales l
    left join public.sale_items si on si.sale_id=l.id
    left join public.products p on p.id=si.product_id
    where l.record_type='lead'
    group by l.id
  ),
  lead_due as (
    select l.id lead_id,min(ci.due_at) filter (where ci.status='planned') explicit_due_on
    from public.sales l
    left join public.customer_interactions ci on ci.sale_id=l.id or ci.notes like ('[Lead:'||l.id::text||']%')
    where l.record_type='lead'
    group by l.id
  ),
  leads as (
    select
      ('lead:'||l.id::text) queue_key,'lead'::text source_type,l.id source_id,l.customer_id,
      coalesce(c.name,'Lead') customer_name,coalesce(c.phone,l.phone) phone,coalesce(c.city,l.city) city,
      li.product_id,coalesce(li.product_summary,'Interesse sem produto definido') product_name,
      coalesce(inv.available_quantity,0)::integer stock_quantity,coalesce(l.lead_status,'Lead')::text reason,
      case when la.action='contacted' and coalesce(la.next_eligible_on,v_today)<=v_today then 'response_check' else 'contact' end::text stage,
      case when lower(coalesce(l.lead_status,'')) in ('está quase comprando','ta quase comprando') then 1
           when lower(coalesce(l.lead_status,''))='cotação' then 2
           when lower(coalesce(l.lead_status,''))='decidindo' then 3
           when lower(coalesce(l.lead_status,''))='perguntou sobre' then 4 else 5 end::integer priority_rank,
      coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date) reference_on,
      greatest(coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date),coalesce(la.next_eligible_on,'1900-01-01'::date)) eligible_on,
      la.action last_action,la.occurred_at last_attempt_at,null::date last_purchase_on,null::date estimated_due_on,
      l.lead_status::text lead_status,l.reference::text reference,l.notes::text source_notes,
      ('/leads/'||l.id::text)::text href,l.created_at source_created_at
    from public.sales l
    join public.customers c on c.id=l.customer_id
    left join lead_items li on li.lead_id=l.id
    left join lead_due ld on ld.lead_id=l.id
    left join public.inventory_control_overview inv on inv.product_id=li.product_id
    left join latest_attempt la on la.source_type='lead' and la.source_id=l.id
    where l.record_type='lead' and l.general_status<>'cancelled'
      and lower(coalesce(l.lead_status,'')) in ('está quase comprando','ta quase comprando','cotação','decidindo','perguntou sobre')
      and coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date)<=v_today
      and coalesce(la.next_eligible_on,'1900-01-01'::date)<=v_today
      and not exists (
        select 1 from public.lead_stock_watches w
        where w.lead_id=l.id and w.status in ('waiting_stock','ready_to_contact')
      )
  ),
  candidates as (select * from leads union all select * from repurchase),
  ranked as (
    select * from candidates
    order by case when stage='response_check' then 0 else priority_rank end,
      eligible_on asc,last_attempt_at asc nulls first,source_created_at asc,queue_key
  ),
  limited as (select * from ranked limit v_limit)
  select
    coalesce((select jsonb_agg(to_jsonb(l) order by case when l.stage='response_check' then 0 else l.priority_rank end,l.eligible_on,l.last_attempt_at asc nulls first,l.source_created_at,l.queue_key) from limited l),'[]'::jsonb),
    (select count(*)::integer from ranked),
    (select count(*)::integer from ranked where source_type='lead'),
    (select count(*)::integer from ranked where source_type='repurchase')
  into v_items,v_total,v_leads,v_repurchase;

  return jsonb_build_object(
    'today',v_today,'goal',v_goal,'contacted_today',v_contacted,'remaining',greatest(v_goal-v_contacted,0),
    'completed',v_contacted>=v_goal,'total_eligible',v_total,'lead_eligible',v_leads,
    'repurchase_eligible',v_repurchase,'items',v_items
  );
end;
$$;

revoke all on function public.commercial_contact_queue_v1(integer) from public,anon;
grant execute on function public.commercial_contact_queue_v1(integer) to authenticated,service_role;

create or replace function public.commercial_contact_action_v1(
  p_source_type text,p_source_id uuid,p_action text,p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_customer_id uuid; v_product_id uuid; v_sale_id uuid;
  v_customer_name text; v_product_name text; v_next date; v_attempt_id uuid; v_interaction_note text;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para trabalhar a fila comercial'; end if;
  if p_source_type not in ('repurchase','lead') then raise exception 'Origem comercial inválida'; end if;
  if p_action not in ('contacted','skipped','no_response','responded') then raise exception 'Ação comercial inválida'; end if;

  if p_source_type='repurchase' then
    select r.customer_id,r.product_id,r.sale_id,c.name,p.name
    into v_customer_id,v_product_id,v_sale_id,v_customer_name,v_product_name
    from public.sale_replenishment_reminders r
    join public.customers c on c.id=r.customer_id
    join public.products p on p.id=r.product_id
    where r.id=p_source_id and r.status='planned';
  else
    select l.customer_id,
      (array_agg(si.product_id order by si.id) filter (where si.product_id is not null))[1],
      l.id,coalesce(c.name,'Lead'),
      coalesce(string_agg(p.name,', ' order by p.name) filter (where p.name is not null),'Interesse sem produto definido')
    into v_customer_id,v_product_id,v_sale_id,v_customer_name,v_product_name
    from public.sales l
    left join public.customers c on c.id=l.customer_id
    left join public.sale_items si on si.sale_id=l.id
    left join public.products p on p.id=si.product_id
    where l.id=p_source_id and l.record_type='lead' and l.general_status<>'cancelled'
    group by l.id,l.customer_id,c.name;
  end if;

  if v_customer_id is null then raise exception 'Contato comercial não encontrado ou já encerrado'; end if;

  v_next := case p_action
    when 'contacted' then v_today+2
    when 'skipped' then v_today
    when 'no_response' then v_today+7
    when 'responded' then v_today+3
  end;

  insert into public.commercial_contact_attempts(
    source_type,source_id,customer_id,product_id,action,next_eligible_on,notes,created_by
  ) values (
    p_source_type,p_source_id,v_customer_id,v_product_id,p_action,v_next,
    nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_attempt_id;

  if p_action<>'skipped' then
    v_interaction_note := concat_ws(E'\n',
      '[Fila Comercial] '||case p_source_type when 'repurchase' then 'Recompra' else 'Lead' end||
      ' · '||coalesce(v_product_name,'Produto não informado')||' · ação: '||p_action,
      nullif(btrim(coalesce(p_notes,'')),'')
    );
    insert into public.customer_interactions(
      customer_id,sale_id,interaction_type,status,channel,occurred_at,completed_at,outcome,notes,created_by
    ) values (
      v_customer_id,v_sale_id,'follow_up','completed','whatsapp',now(),now(),p_action,v_interaction_note,auth.uid()
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('commercial_contact',v_attempt_id,'queue_action',jsonb_build_object(
    'source_type',p_source_type,'source_id',p_source_id,'customer_id',v_customer_id,
    'customer_name',v_customer_name,'product_id',v_product_id,'product_name',v_product_name,
    'action',p_action,'next_eligible_on',v_next
  ));

  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'action',p_action,'customer_id',v_customer_id,'next_eligible_on',v_next);
end;
$$;

revoke all on function public.commercial_contact_action_v1(text,uuid,text,text) from public,anon;
grant execute on function public.commercial_contact_action_v1(text,uuid,text,text) to authenticated,service_role;

-- Nexus: centenas de recompras viram UM item de Fila Comercial.
create or replace function public.nexus_unified_queue_v1(p_limit integer default 80)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_raw jsonb; v_commercial jsonb; v_result jsonb;
  v_limit integer := greatest(1,least(coalesce(p_limit,80),200));
begin
  v_raw := public.nexus_unified_queue_base_v45_20(200);
  v_commercial := public.commercial_contact_queue_v1(1);

  with base_filtered as (
    select item from jsonb_array_elements(coalesce(v_raw->'items','[]'::jsonb)) x(item)
    where not (item->>'source_type'='bank_invoice' and coalesce(nullif(item->'metadata'->>'amount','')::numeric,0)<=0)
      and not (item->>'source_type'='bank_charge' and coalesce(nullif(item->'metadata'->>'remaining_amount','')::numeric,nullif(item->'metadata'->>'amount','')::numeric,0)<=0)
      and not (item->>'source_type'='operational_task' and coalesce(item->>'summary','') like '[Recompra automática]%')
  ),
  commercial_item as (
    select jsonb_build_object(
      'queue_id','commercial-queue:'||(v_commercial->>'today'),
      'source_id','commercial-queue','source_type','commercial_queue',
      'operation_scope','supplements','operation_label','Suplementos',
      'severity',case when coalesce((v_commercial->>'completed')::boolean,false) then 'info' else 'attention' end,
      'score',case when coalesce((v_commercial->>'completed')::boolean,false) then 48 else 84 end,
      'title','Fila comercial · '||coalesce(v_commercial->>'contacted_today','0')||'/'||coalesce(v_commercial->>'goal','12')||' hoje',
      'summary',case
        when coalesce((v_commercial->>'completed')::boolean,false) then 'Meta diária concluída. Você pode continuar a fila se quiser.'
        when jsonb_array_length(coalesce(v_commercial->'items','[]'::jsonb))>0 then
          'Próximo: '||coalesce(v_commercial->'items'->0->>'customer_name','Cliente')||' · '||coalesce(v_commercial->'items'->0->>'product_name','Contato comercial')
        else 'Nenhum contato comercial elegível agora.' end,
      'href','/suplementos/fila-comercial',
      'due_at',((v_commercial->>'today')::date::timestamp+interval '10 hours') at time zone 'America/Sao_Paulo',
      'action_mode','open','metadata',v_commercial
    ) item
    where coalesce((v_commercial->>'skipped')::boolean,false)=false
  ),
  filtered as (select item from base_filtered union all select item from commercial_item),
  limited as (
    select item from filtered
    order by coalesce(nullif(item->>'score','')::numeric,0) desc,
      nullif(item->>'due_at','')::timestamptz asc nulls last,item->>'title'
    limit v_limit
  ),
  op_counts as (select item->>'operation_scope' operation_scope,count(*)::integer total from filtered group by item->>'operation_scope'),
  severity_counts as (select item->>'severity' severity,count(*)::integer total from filtered group by item->>'severity')
  select jsonb_build_object(
    'generated_at',now(),
    'items',coalesce((select jsonb_agg(item order by coalesce(nullif(item->>'score','')::numeric,0) desc,nullif(item->>'due_at','')::timestamptz asc nulls last,item->>'title') from limited),'[]'::jsonb),
    'summary',jsonb_build_object(
      'total',(select count(*) from filtered),
      'urgent',(select count(*) from filtered where item->>'severity'='urgent'),
      'attention',(select count(*) from filtered where item->>'severity'='attention'),
      'opportunity',(select count(*) from filtered where item->>'severity'='opportunity'),
      'info',(select count(*) from filtered where item->>'severity'='info'),
      'by_operation',coalesce((select jsonb_object_agg(operation_scope,total) from op_counts),'{}'::jsonb),
      'by_severity',coalesce((select jsonb_object_agg(severity,total) from severity_counts),'{}'::jsonb)
    )
  ) into v_result;
  return v_result;
end;
$$;

grant execute on function public.nexus_unified_queue_v1(integer) to authenticated;

-- "Excluir parceiro" com preservação de histórico.
create or replace function public.archive_partner_v1(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_partner public.partners%rowtype;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para encerrar parceria'; end if;
  select * into v_partner from public.partners where id=p_partner_id for update;
  if not found then raise exception 'Parceiro não encontrado'; end if;
  if lower(coalesce(v_partner.partner_type,'')) in ('supplier','fornecedor') then
    raise exception 'Fornecedor deve ser gerenciado pelo fluxo de fornecedores';
  end if;

  update public.partners
  set active=false,status='Encerrado',end_date=coalesce(end_date,v_today),updated_at=now()
  where id=p_partner_id;

  update public.partner_user_links
  set active=false,updated_at=now()
  where partner_id=p_partner_id and active;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('partner',p_partner_id,'archived',jsonb_build_object(
    'name',v_partner.name,'ended_on',v_today,'history_preserved',true
  ));

  return jsonb_build_object('ok',true,'partner_id',p_partner_id,'name',v_partner.name,'status','Encerrado','history_preserved',true);
end;
$$;

revoke all on function public.archive_partner_v1(uuid) from public,anon;
grant execute on function public.archive_partner_v1(uuid) to authenticated,service_role;

-- Limpa a tempestade antiga de erros de recompra; não dispara novas requisições.
update public.central_calendar_sync_queue q
set status='done',processed_at=coalesce(processed_at,now()),last_error=null,updated_at=now()
from public.operational_tasks t
where q.source_type='operational_task' and q.source_id=t.id
  and t.notes like '[Recompra automática]%'
  and q.status in ('pending','processing','error');

update public.central_calendar_internal_config
set last_error=null,updated_at=now()
where singleton=true;
