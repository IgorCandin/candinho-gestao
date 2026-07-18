create or replace function public.central_schedule_radar_followup(
  p_customer_id uuid,
  p_due_at timestamptz,
  p_priority text default 'normal',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_task_id uuid;
  v_contact_id uuid;
  v_customer_name text;
  v_existing uuid;
begin
  if not (public.current_user_role()='admin' or public.can_write()) then
    raise exception 'Acesso negado';
  end if;
  if p_customer_id is null or p_due_at is null then raise exception 'Cliente e data são obrigatórios'; end if;
  if coalesce(p_priority,'normal') not in ('normal','attention','urgent') then raise exception 'Prioridade inválida'; end if;

  select c.name into v_customer_name from public.customers c where c.id=p_customer_id and c.active=true;
  if v_customer_name is null then raise exception 'Cliente não encontrado'; end if;

  select cc.id into v_contact_id
  from public.central_contacts cc
  where cc.supplements_customer_id=p_customer_id
  order by cc.updated_at desc
  limit 1;

  select ot.id into v_existing
  from public.operational_tasks ot
  where ot.customer_id=p_customer_id
    and ot.category='radar_followup'
    and ot.status='pending'
    and ot.cancelled_at is null
    and ot.completed_at is null
  order by ot.due_at asc
  limit 1;

  if v_existing is not null then
    update public.operational_tasks
      set due_at=p_due_at,
          priority=coalesce(p_priority,'normal'),
          notes=coalesce(nullif(btrim(p_notes),''),notes),
          central_contact_id=coalesce(v_contact_id,central_contact_id),
          assigned_to=coalesce(assigned_to,auth.uid()),
          updated_at=now()
    where id=v_existing
    returning id into v_task_id;
  else
    insert into public.operational_tasks(
      title,category,due_at,status,priority,operation_scope,customer_id,central_contact_id,assigned_to,notes,created_by
    ) values (
      'Retomar contato · '||v_customer_name,
      'radar_followup',
      p_due_at,
      'pending',
      coalesce(p_priority,'normal'),
      'supplements',
      p_customer_id,
      v_contact_id,
      auth.uid(),
      nullif(btrim(p_notes),''),
      auth.uid()
    ) returning id into v_task_id;
  end if;

  return v_task_id;
end;
$function$;

revoke all on function public.central_schedule_radar_followup(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.central_schedule_radar_followup(uuid,timestamptz,text,text) to authenticated,service_role;
