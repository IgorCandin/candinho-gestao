-- V45.22 · Agenda Global + tarefas por operação + Google Calendar
begin;

-- -----------------------------------------------------------------------------
-- 1. Edição segura das tarefas compartilhadas da Agenda Global
-- -----------------------------------------------------------------------------

create or replace function public.central_reschedule_operational_task(
  p_task_id uuid,
  p_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_scope text;
begin
  if p_due_at is null then
    raise exception 'Informe a nova data';
  end if;

  select operation_scope
  into v_scope
  from public.operational_tasks
  where id=p_task_id;

  if v_scope is null then
    raise exception 'Tarefa não encontrada';
  end if;

  if not public.central_can_write_scope(v_scope) then
    raise exception 'Acesso negado';
  end if;

  update public.operational_tasks
  set due_at=p_due_at,
      status='planned',
      completed_at=null,
      cancelled_at=null,
      updated_at=now()
  where id=p_task_id;

  insert into public.audit_events(
    entity_type,entity_id,action,details,created_by
  ) values(
    'central_operational_task',
    p_task_id,
    'rescheduled',
    jsonb_build_object(
      'operation_scope',v_scope,
      'due_at',p_due_at
    ),
    auth.uid()
  );
end;
$$;

create or replace function public.central_append_operational_task_note(
  p_task_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_scope text;
  v_note text;
begin
  v_note := nullif(btrim(p_note),'');
  if v_note is null then
    raise exception 'Digite uma observação';
  end if;

  select operation_scope
  into v_scope
  from public.operational_tasks
  where id=p_task_id;

  if v_scope is null then
    raise exception 'Tarefa não encontrada';
  end if;

  if not public.central_can_write_scope(v_scope) then
    raise exception 'Acesso negado';
  end if;

  v_note :=
    to_char(
      now() at time zone 'America/Sao_Paulo',
      'DD/MM/YYYY HH24:MI'
    ) || ' · ' || v_note;

  update public.operational_tasks
  set notes=concat_ws(E'\n',notes,v_note),
      updated_at=now()
  where id=p_task_id;
end;
$$;

revoke all on function public.central_reschedule_operational_task(uuid,timestamptz)
  from public,anon;
revoke all on function public.central_append_operational_task_note(uuid,text)
  from public,anon;

grant execute on function public.central_reschedule_operational_task(uuid,timestamptz)
  to authenticated;
grant execute on function public.central_append_operational_task_note(uuid,text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Google Calendar: tarefas manuais Company/Suplementos/Fitness
--    Marketing mantém o source_type histórico para não duplicar eventos.
-- -----------------------------------------------------------------------------

alter table public.central_calendar_sync_queue
  drop constraint if exists central_calendar_sync_queue_source_type_check;

alter table public.central_calendar_sync_queue
  add constraint central_calendar_sync_queue_source_type_check
  check (
    source_type in (
      'post_sale',
      'strategic_agenda',
      'marketing_task',
      'operational_task'
    )
  );

create or replace function public.enqueue_google_calendar_sync(
  p_source_type text,
  p_source_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_source_type not in (
    'post_sale',
    'strategic_agenda',
    'marketing_task',
    'operational_task'
  ) then
    raise exception 'Tipo de origem inválido';
  end if;

  if p_action not in ('upsert','delete') then
    raise exception 'Ação inválida';
  end if;

  insert into public.central_calendar_sync_queue(
    source_type,
    source_id,
    action,
    status,
    attempts,
    last_error,
    updated_at,
    processed_at
  ) values(
    p_source_type,
    p_source_id,
    p_action,
    'pending',
    0,
    null,
    now(),
    null
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
  if tg_op='UPDATE' then
    v_old_type :=
      case
        when old.operation_scope='marketing'
          then 'marketing_task'
        else 'operational_task'
      end;

    v_new_type :=
      case
        when new.operation_scope='marketing'
          then 'marketing_task'
        else 'operational_task'
      end;

    if v_old_type<>v_new_type then
      perform public.enqueue_google_calendar_sync(
        v_old_type,
        old.id,
        'delete'
      );
    end if;
  else
    v_new_type :=
      case
        when new.operation_scope='marketing'
          then 'marketing_task'
        else 'operational_task'
      end;
  end if;

  if new.operation_scope in (
    'company',
    'supplements',
    'fitness',
    'marketing'
  ) then
    perform public.enqueue_google_calendar_sync(
      v_new_type,
      new.id,
      case
        when new.status='planned' and new.due_at is not null
          then 'upsert'
        else 'delete'
      end
    );

    perform public.dispatch_google_calendar_sync();
  end if;

  return new;
end;
$$;

drop trigger if exists operational_tasks_google_calendar_sync
  on public.operational_tasks;

create trigger operational_tasks_google_calendar_sync
after insert or update of
  title,
  category,
  due_at,
  status,
  priority,
  operation_scope,
  notes
on public.operational_tasks
for each row
execute function public.queue_operational_task_google_calendar_sync();

-- Coloca tarefas já existentes na fila sem criar um segundo identificador
-- para Marketing, que continua usando marketing_task.
select public.enqueue_google_calendar_sync(
  case
    when operation_scope='marketing' then 'marketing_task'
    else 'operational_task'
  end,
  id,
  case
    when status='planned' and due_at is not null then 'upsert'
    else 'delete'
  end
)
from public.operational_tasks
where operation_scope in (
  'company',
  'supplements',
  'fitness',
  'marketing'
);

create or replace function public.central_google_calendar_status()
returns jsonb
language plpgsql
stable
security definer
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

  select
    c.apps_script_url,
    c.last_sync_at,
    c.last_error
  into v_config
  from public.central_calendar_internal_config c
  where c.singleton=true;

  v_has_bridge :=
    found
    and nullif(btrim(coalesce(v_config.apps_script_url,'')),'') is not null
    and exists (
      select 1
      from public.central_calendar_internal_config c
      where c.singleton=true
        and nullif(
          btrim(coalesce(c.apps_script_secret,'')),
          ''
        ) is not null
    );

  select
    count(*) filter(where q.status='pending')::integer,
    count(*) filter(where q.status='error')::integer,
    count(*) filter(where q.status='done')::integer
  into
    v_pending,
    v_errors,
    v_done
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
    'sync_operational_tasks',true,
    'last_sync_at',case when found then v_config.last_sync_at else null end,
    'last_error',case when found then v_config.last_error else null end,
    'pending_jobs',coalesce(v_pending,0),
    'error_jobs',coalesce(v_errors,0),
    'done_jobs',coalesce(v_done,0)
  );
end;
$$;

commit;
