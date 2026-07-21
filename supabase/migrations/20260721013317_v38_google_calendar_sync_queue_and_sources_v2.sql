begin;

create or replace function public.central_google_calendar_status()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_connected record;
  v_has_connection boolean:=false;
  v_pending integer:=0;
  v_errors integer:=0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  select
    c.google_account_email,c.calendar_id,c.status,
    c.sync_post_sale,c.sync_strategic_agenda,
    c.last_sync_at,c.last_error
  into v_connected
  from public.central_google_calendar_connections c
  where c.status='connected'
  order by c.updated_at desc
  limit 1;

  v_has_connection:=found;

  select
    count(*) filter(where q.status='pending'),
    count(*) filter(where q.status='error')
  into v_pending,v_errors
  from public.central_calendar_sync_queue q;

  return jsonb_build_object(
    'configured',v_has_connection,
    'connected',v_has_connection,
    'email',case when v_has_connection then v_connected.google_account_email else null end,
    'calendar_id',case when v_has_connection then v_connected.calendar_id else null end,
    'status',case when v_has_connection then v_connected.status else 'disconnected' end,
    'sync_post_sale',case when v_has_connection then v_connected.sync_post_sale else true end,
    'sync_strategic_agenda',case when v_has_connection then v_connected.sync_strategic_agenda else true end,
    'last_sync_at',case when v_has_connection then v_connected.last_sync_at else null end,
    'last_error',case when v_has_connection then v_connected.last_error else null end,
    'pending_jobs',coalesce(v_pending,0),
    'error_jobs',coalesce(v_errors,0)
  );
end;
$function$;

alter table public.central_strategic_agenda_items
  add column if not exists scheduled_on date;

with ranked as (
  select
    i.id,
    row_number() over(
      partition by i.reference_month,i.week_number
      order by i.sort_order,i.created_at,i.id
    ) as rn
  from public.central_strategic_agenda_items i
  where i.scheduled_on is null
)
update public.central_strategic_agenda_items i
set scheduled_on=(
  i.reference_month
  + (((i.week_number-1)*7)+least(r.rn-1,6))::integer
)
from ranked r
where r.id=i.id
  and i.scheduled_on is null;

create or replace function public.central_generate_strategic_agenda_month(
  p_month date default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_month date := date_trunc(
    'month',
    coalesce(
      p_month,
      (now() at time zone 'America/Sao_Paulo')::date
    )::timestamp
  )::date;
  v_inserted integer := 0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  with ranked_templates as (
    select
      t.*,
      row_number() over(
        partition by t.week_number
        order by t.sort_order,t.code,t.id
      ) as rn
    from public.central_strategic_agenda_templates t
    where t.active
  )
  insert into public.central_strategic_agenda_items (
    reference_month,template_id,code,week_number,
    task,objective,priority,category,
    action_href,action_label,sort_order,
    scheduled_on,created_by,updated_by
  )
  select
    v_month,t.id,t.code,t.week_number,
    t.task,t.objective,t.priority,t.category,
    t.action_href,t.action_label,t.sort_order,
    v_month+(
      ((t.week_number-1)*7)+least(t.rn-1,6)
    )::integer,
    auth.uid(),auth.uid()
  from ranked_templates t
  on conflict(reference_month,template_id)
    where template_id is not null
  do nothing;

  get diagnostics v_inserted=row_count;
  return v_inserted;
end;
$function$;

create or replace view public.central_strategic_agenda_overview
with (security_invoker=true)
as
select
  i.id,i.reference_month,i.template_id,i.code,
  i.week_number,i.task,i.objective,i.priority,
  i.category,i.action_href,i.action_label,
  i.sort_order,i.status,i.completed_at,
  i.postponed_at,i.impact_note,i.notes,
  i.created_by,i.updated_by,i.created_at,i.updated_at,
  case i.priority
    when 'extreme' then 4
    when 'high' then 3
    when 'medium' then 2
    else 1
  end as priority_rank,
  i.scheduled_on
from public.central_strategic_agenda_items i;

create or replace function public.enqueue_google_calendar_sync(
  p_source_type text,
  p_source_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_source_type not in (
    'post_sale','strategic_agenda'
  ) then
    raise exception 'Tipo de origem inválido';
  end if;

  if p_action not in ('upsert','delete') then
    raise exception 'Ação inválida';
  end if;

  insert into public.central_calendar_sync_queue(
    source_type,source_id,action,status,
    attempts,last_error,updated_at,processed_at
  )
  values(
    p_source_type,p_source_id,p_action,
    'pending',0,null,now(),null
  )
  on conflict(source_type,source_id)
  do update set
    action=excluded.action,
    status='pending',
    attempts=0,
    last_error=null,
    updated_at=now(),
    processed_at=null;
end;
$function$;

revoke all on function
public.enqueue_google_calendar_sync(text,uuid,text)
from public,anon,authenticated;
grant execute on function
public.enqueue_google_calendar_sync(text,uuid,text)
to service_role;

create or replace function
public.queue_post_sale_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.enqueue_google_calendar_sync(
    'post_sale',
    new.id,
    case
      when new.status='planned'
        and new.completed_at is null
        and new.cancelled_at is null
      then 'upsert'
      else 'delete'
    end
  );
  return new;
end;
$function$;

drop trigger if exists
trg_post_sale_google_calendar_sync
on public.post_sale_batches;

create trigger trg_post_sale_google_calendar_sync
after insert or update of
due_on,status,notes,completed_at,cancelled_at
on public.post_sale_batches
for each row execute function
public.queue_post_sale_google_calendar_sync();

create or replace function
public.queue_strategic_agenda_google_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.enqueue_google_calendar_sync(
    'strategic_agenda',
    new.id,
    case
      when new.status='planned'
        and new.scheduled_on is not null
      then 'upsert'
      else 'delete'
    end
  );
  return new;
end;
$function$;

drop trigger if exists
trg_strategic_agenda_google_calendar_sync
on public.central_strategic_agenda_items;

create trigger
trg_strategic_agenda_google_calendar_sync
after insert or update of
scheduled_on,status,task,objective,
priority,category,week_number
on public.central_strategic_agenda_items
for each row execute function
public.queue_strategic_agenda_google_calendar_sync();

insert into public.central_calendar_sync_queue(
  source_type,source_id,action,status,attempts,updated_at
)
select
  'post_sale',
  b.id,
  case
    when b.status='planned'
      and b.completed_at is null
      and b.cancelled_at is null
    then 'upsert'
    else 'delete'
  end,
  'pending',0,now()
from public.post_sale_batches b
on conflict(source_type,source_id)
do update set
  action=excluded.action,
  status='pending',
  attempts=0,
  last_error=null,
  updated_at=now(),
  processed_at=null;

insert into public.central_calendar_sync_queue(
  source_type,source_id,action,status,attempts,updated_at
)
select
  'strategic_agenda',
  i.id,
  case
    when i.status='planned'
      and i.scheduled_on is not null
    then 'upsert'
    else 'delete'
  end,
  'pending',0,now()
from public.central_strategic_agenda_items i
on conflict(source_type,source_id)
do update set
  action=excluded.action,
  status='pending',
  attempts=0,
  last_error=null,
  updated_at=now(),
  processed_at=null;

grant select on
public.central_strategic_agenda_overview
to authenticated;

commit;
