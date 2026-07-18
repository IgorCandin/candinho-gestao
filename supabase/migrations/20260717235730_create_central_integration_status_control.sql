create or replace function public.central_set_integration_status(p_integration_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_status text := lower(coalesce(p_status,''));
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  if v_status not in ('connected','disconnected','error') then raise exception 'Status inválido'; end if;
  update public.central_integrations set status=v_status,last_error=case when v_status='connected' then null else last_error end,updated_at=now() where id=p_integration_id;
  if not found then raise exception 'Integração não encontrada'; end if;
end;
$function$;
revoke all on function public.central_set_integration_status(uuid,text) from public,anon;
grant execute on function public.central_set_integration_status(uuid,text) to authenticated,service_role;
