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
  if p_operation_scope not in ('company','supplements','fitness','marketing') then raise exception 'Operação inválida'; end if;
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
      or (p_operation_scope='marketing' and p.can_access_marketing)
      or (p_operation_scope='company' and (p.can_access_supplements or p.can_access_fitness or p.can_access_marketing))
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
