-- Sincronização bidirecional operacional Marketing -> Google Agenda.
-- O site Candinho segue sendo a fonte de verdade:
-- planned -> upsert no Google; completed/cancelled -> delete no Google.
-- O registro local permanece no histórico de operational_tasks.

alter table public.central_calendar_sync_queue
  drop constraint if exists central_calendar_sync_queue_source_type_check;

alter table public.central_calendar_sync_queue
  add constraint central_calendar_sync_queue_source_type_check
  check (source_type in ('post_sale','strategic_agenda','marketing_task'));

create or replace function public.enqueue_google_calendar_sync(
  p_source_type text,
  p_source_id uuid,
  p_action text
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_source_type not in ('post_sale','strategic_agenda','marketing_task') then
    raise exception 'Tipo de origem inválido';
  end if;
  if p_action not in ('upsert','delete') then
    raise exception 'Ação inválida';
  end if;

  insert into public.central_calendar_sync_queue(
    source_type,source_id,action,status,attempts,last_error,updated_at,processed_at
  ) values(
    p_source_type,p_source_id,p_action,'pending',0,null,now(),null
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
    perform public.dispatch_google_calendar_sync();
    return new;
  end if;

  if new.operation_scope='marketing' then
    perform public.enqueue_google_calendar_sync(
      'marketing_task',
      new.id,
      case when new.status='planned' and new.due_at is not null then 'upsert' else 'delete' end
    );
    perform public.dispatch_google_calendar_sync();
  end if;

  return new;
end;
$$;

drop trigger if exists operational_tasks_google_calendar_sync on public.operational_tasks;
create trigger operational_tasks_google_calendar_sync
after insert or update of title,category,due_at,status,priority,operation_scope,notes
on public.operational_tasks
for each row execute function public.queue_marketing_task_google_calendar_sync();

-- A Edge Function usa service_role para ler a tarefa que originou o job.
grant select on table public.operational_tasks to service_role;

create or replace function public.central_google_calendar_status()
returns jsonb
language plpgsql
stable security definer
set search_path=public
as $$
declare
  v_config record;
  v_has_bridge boolean := false;
  v_pending integer := 0;
  v_errors integer := 0;
  v_done integer := 0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  select c.apps_script_url,c.last_sync_at,c.last_error
  into v_config
  from public.central_calendar_internal_config c
  where c.singleton=true;

  v_has_bridge := found
    and nullif(btrim(coalesce(v_config.apps_script_url,'')),'') is not null
    and exists (
      select 1 from public.central_calendar_internal_config c
      where c.singleton=true
        and nullif(btrim(coalesce(c.apps_script_secret,'')),'') is not null
    );

  select
    count(*) filter(where q.status='pending')::integer,
    count(*) filter(where q.status='error')::integer,
    count(*) filter(where q.status='done')::integer
  into v_pending,v_errors,v_done
  from public.central_calendar_sync_queue q;

  return jsonb_build_object(
    'configured',v_has_bridge,
    'connected',v_has_bridge,
    'provider','apps_script',
    'email',null,
    'calendar_id','primary',
    'status',case when v_has_bridge then 'connected' else 'disconnected' end,
    'sync_post_sale',true,
    'sync_strategic_agenda',true,
    'sync_marketing_tasks',true,
    'last_sync_at',case when found then v_config.last_sync_at else null end,
    'last_error',case when found then v_config.last_error else null end,
    'pending_jobs',coalesce(v_pending,0),
    'error_jobs',coalesce(v_errors,0),
    'done_jobs',coalesce(v_done,0)
  );
end;
$$;
