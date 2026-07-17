alter table public.operational_tasks
  add column if not exists operation_scope text not null default 'supplements';

alter table public.operational_tasks
  add column if not exists central_contact_id uuid references public.central_contacts(id) on delete set null;

alter table public.operational_tasks
  drop constraint if exists operational_tasks_operation_scope_check;

alter table public.operational_tasks
  add constraint operational_tasks_operation_scope_check
  check (operation_scope in ('company','supplements','fitness'));

create index if not exists operational_tasks_scope_status_due_idx
  on public.operational_tasks(operation_scope,status,due_at);
create index if not exists operational_tasks_central_contact_idx
  on public.operational_tasks(central_contact_id) where central_contact_id is not null;

alter table public.operational_tasks enable row level security;

drop policy if exists operational_tasks_read on public.operational_tasks;
drop policy if exists operational_tasks_write on public.operational_tasks;
drop policy if exists operational_tasks_insert on public.operational_tasks;
drop policy if exists operational_tasks_update on public.operational_tasks;
drop policy if exists operational_tasks_delete on public.operational_tasks;

create policy operational_tasks_read on public.operational_tasks
for select to authenticated
using (public.central_can_access_scope(operation_scope));

create policy operational_tasks_insert on public.operational_tasks
for insert to authenticated
with check (public.central_can_write_scope(operation_scope));

create policy operational_tasks_update on public.operational_tasks
for update to authenticated
using (public.central_can_write_scope(operation_scope))
with check (public.central_can_write_scope(operation_scope));

create policy operational_tasks_delete on public.operational_tasks
for delete to authenticated
using (public.central_can_write_scope(operation_scope));

create or replace function public.central_create_operational_task(
  p_title text,
  p_category text,
  p_due_at timestamptz,
  p_priority text default 'normal',
  p_operation_scope text default 'company',
  p_central_contact_id uuid default null,
  p_assigned_to uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if p_operation_scope not in ('company','supplements','fitness') then raise exception 'Operação inválida'; end if;
  if not public.central_can_write_scope(p_operation_scope) then raise exception 'Acesso negado'; end if;
  if p_title is null or length(btrim(p_title)) < 2 then raise exception 'Informe o título da tarefa'; end if;
  if p_category not in ('task','delivery','payment','follow_up','post_sale','supplier','other') then raise exception 'Categoria inválida'; end if;
  if p_priority not in ('normal','attention','urgent') then raise exception 'Prioridade inválida'; end if;
  if p_due_at is null then raise exception 'Informe a data da tarefa'; end if;
  if p_central_contact_id is not null and not exists(
    select 1 from public.central_contacts c
    where c.id=p_central_contact_id and public.central_can_access_scope(c.operation_scope)
  ) then raise exception 'Contato não encontrado ou sem acesso'; end if;
  if p_assigned_to is not null and not exists(
    select 1 from public.profiles p
    where p.id=p_assigned_to and p.active and (
      p.role='admin'
      or (p_operation_scope='supplements' and p.can_access_supplements)
      or (p_operation_scope='fitness' and p.can_access_fitness)
      or (p_operation_scope='company' and (p.can_access_supplements or p.can_access_fitness))
    )
  ) then raise exception 'Responsável inválido'; end if;
  insert into public.operational_tasks(
    title,category,due_at,priority,operation_scope,central_contact_id,assigned_to,notes,created_by
  ) values(
    btrim(p_title),p_category,p_due_at,p_priority,p_operation_scope,p_central_contact_id,p_assigned_to,nullif(btrim(p_notes),''),auth.uid()
  ) returning id into v_id;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by)
  values('central_operational_task',v_id,'created',jsonb_build_object(
    'category',p_category,'due_at',p_due_at,'operation_scope',p_operation_scope,'central_contact_id',p_central_contact_id,'assigned_to',p_assigned_to
  ),auth.uid());
  return v_id;
end;
$$;

create or replace function public.central_update_operational_task_status(p_task_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_scope text;
begin
  if p_status not in ('planned','completed','cancelled') then raise exception 'Status inválido'; end if;
  select operation_scope into v_scope from public.operational_tasks where id=p_task_id;
  if v_scope is null then raise exception 'Tarefa não encontrada'; end if;
  if not public.central_can_write_scope(v_scope) then raise exception 'Acesso negado'; end if;
  update public.operational_tasks
  set status=p_status,
      completed_at=case when p_status='completed' then now() else null end,
      cancelled_at=case when p_status='cancelled' then now() else null end,
      updated_at=now()
  where id=p_task_id;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by)
  values('central_operational_task',p_task_id,p_status,jsonb_build_object('operation_scope',v_scope),auth.uid());
end;
$$;

create or replace view public.central_operational_tasks_overview
with (security_invoker=true)
as
select
  t.id,t.title,t.category,t.due_at,t.due_at::date as due_date,t.status,t.priority,t.operation_scope,
  t.central_contact_id,cc.display_name as contact_name,cc.phone as contact_phone,t.assigned_to,
  pr.full_name as assigned_name,t.notes,t.completed_at,t.cancelled_at,t.created_by,t.created_at,t.updated_at
from public.operational_tasks t
left join public.central_contacts cc on cc.id=t.central_contact_id
left join public.profiles pr on pr.id=t.assigned_to;

grant select on public.central_operational_tasks_overview to authenticated;

create or replace function public.central_agenda_snapshot(
  p_from date default null,p_to date default null,p_status text default null,p_scope text default null,p_limit integer default 300
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_items jsonb;
  v_today_count integer := 0;
  v_overdue_count integer := 0;
  v_next_seven integer := 0;
  v_completed_month integer := 0;
  v_pending integer := 0;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found or not (v_profile.role='admin' or v_profile.can_access_supplements or v_profile.can_access_fitness) then raise exception 'Acesso negado'; end if;
  if p_scope is not null and p_scope not in ('company','supplements','fitness') then raise exception 'Operação inválida'; end if;
  if p_status is not null and p_status not in ('planned','completed','cancelled') then raise exception 'Status inválido'; end if;
  select
    count(*) filter(where t.status='planned' and t.due_at::date=v_today)::integer,
    count(*) filter(where t.status='planned' and t.due_at::date<v_today)::integer,
    count(*) filter(where t.status='planned' and t.due_at::date>v_today and t.due_at::date<=v_today+7)::integer,
    count(*) filter(where t.status='completed' and date_trunc('month',t.completed_at at time zone 'America/Sao_Paulo')=date_trunc('month',v_today::timestamp))::integer,
    count(*) filter(where t.status='planned')::integer
  into v_today_count,v_overdue_count,v_next_seven,v_completed_month,v_pending
  from public.operational_tasks t
  where public.central_can_access_scope(t.operation_scope) and (p_scope is null or t.operation_scope=p_scope);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at asc),'[]'::jsonb) into v_items
  from (
    select * from public.central_operational_tasks_overview t
    where public.central_can_access_scope(t.operation_scope)
      and (p_scope is null or t.operation_scope=p_scope)
      and (p_status is null or t.status=p_status)
      and (p_from is null or t.due_at::date>=p_from)
      and (p_to is null or t.due_at::date<=p_to)
    order by t.due_at asc
    limit least(greatest(coalesce(p_limit,300),1),1000)
  ) x;
  return jsonb_build_object('summary',jsonb_build_object(
    'today_count',v_today_count,'overdue_count',v_overdue_count,'next_seven_days_count',v_next_seven,
    'completed_month_count',v_completed_month,'pending_count',v_pending
  ),'items',v_items);
end;
$$;

revoke all on function public.central_create_operational_task(text,text,timestamptz,text,text,uuid,uuid,text) from public,anon;
revoke all on function public.central_update_operational_task_status(uuid,text) from public,anon;
revoke all on function public.central_agenda_snapshot(date,date,text,text,integer) from public,anon;
grant execute on function public.central_create_operational_task(text,text,timestamptz,text,text,uuid,uuid,text) to authenticated;
grant execute on function public.central_update_operational_task_status(uuid,text) to authenticated;
grant execute on function public.central_agenda_snapshot(date,date,text,text,integer) to authenticated;
