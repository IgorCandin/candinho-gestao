create or replace function public.central_create_conversation_followup(
  p_conversation_id uuid,
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
  v_conversation public.central_conversations%rowtype;
  v_contact_name text;
  v_task_id uuid;
begin
  select * into v_conversation from public.central_conversations where id=p_conversation_id;
  if v_conversation.id is null then raise exception 'Conversa não encontrada'; end if;
  if not public.central_can_write_scope(v_conversation.operation_scope) then raise exception 'Acesso negado'; end if;
  if p_due_at is null then raise exception 'Data do retorno obrigatória'; end if;
  if lower(coalesce(p_priority,'normal')) not in ('normal','attention','urgent') then raise exception 'Prioridade inválida'; end if;
  select display_name into v_contact_name from public.central_contacts where id=v_conversation.contact_id;
  insert into public.operational_tasks(title,category,due_at,priority,status,operation_scope,central_contact_id,assigned_to,notes,created_by)
  values ('Retornar: ' || coalesce(v_contact_name,'Contato'),'Atendimento',p_due_at,lower(coalesce(p_priority,'normal')),'pending',v_conversation.operation_scope,v_conversation.contact_id,coalesce(v_conversation.assigned_to,auth.uid()),nullif(btrim(p_notes),''),auth.uid())
  returning id into v_task_id;
  update public.central_conversations set status='pending', assigned_to=coalesce(assigned_to,auth.uid()), updated_at=now() where id=p_conversation_id;
  return v_task_id;
end;
$function$;
revoke all on function public.central_create_conversation_followup(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.central_create_conversation_followup(uuid,timestamptz,text,text) to authenticated,service_role;
