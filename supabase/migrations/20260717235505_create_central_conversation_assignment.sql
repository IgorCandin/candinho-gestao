create or replace function public.central_assign_conversation(p_conversation_id uuid, p_assigned_to uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_scope text;
  v_target_ok boolean := true;
begin
  select operation_scope into v_scope from public.central_conversations where id=p_conversation_id;
  if v_scope is null then raise exception 'Conversa não encontrada'; end if;
  if not public.central_can_write_scope(v_scope) then raise exception 'Acesso negado'; end if;
  if p_assigned_to is not null then
    select exists(
      select 1 from public.profiles p
      where p.id=p_assigned_to and p.active and p.role <> 'partner'
        and case lower(v_scope)
          when 'supplements' then p.can_access_supplements
          when 'fitness' then p.can_access_fitness
          when 'marketing' then p.can_access_marketing
          when 'company' then p.can_access_supplements or p.can_access_fitness or p.can_access_marketing or p.role='admin'
          else false end
    ) into v_target_ok;
    if not v_target_ok then raise exception 'Responsável sem acesso à operação'; end if;
  end if;
  update public.central_conversations set assigned_to=p_assigned_to, updated_at=now() where id=p_conversation_id;
end;
$function$;

create or replace function public.central_team_members(p_scope text default null)
returns table(id uuid, full_name text, email text, role text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id,p.full_name,p.email,p.role::text
  from public.profiles p
  where p.active and p.role <> 'partner'
    and public.central_can_access_scope(coalesce(p_scope,'company'))
    and case lower(coalesce(p_scope,'company'))
      when 'supplements' then p.can_access_supplements
      when 'fitness' then p.can_access_fitness
      when 'marketing' then p.can_access_marketing
      when 'company' then p.can_access_supplements or p.can_access_fitness or p.can_access_marketing or p.role='admin'
      else false end
  order by p.full_name;
$function$;

revoke all on function public.central_assign_conversation(uuid,uuid) from public,anon;
revoke all on function public.central_team_members(text) from public,anon;
grant execute on function public.central_assign_conversation(uuid,uuid) to authenticated,service_role;
grant execute on function public.central_team_members(text) to authenticated,service_role;
