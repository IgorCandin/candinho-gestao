create or replace function public.central_set_integration_status(p_integration_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text := lower(coalesce(p_status,''));
  v_provider text;
  v_account_id text;
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  if v_status not in ('connected','paused','disconnected','error') then raise exception 'Status inválido'; end if;
  update public.central_integrations set status=v_status,last_error=case when v_status='connected' then null else last_error end,updated_at=now()
  where id=p_integration_id returning provider,account_external_id into v_provider,v_account_id;
  if v_provider is null then raise exception 'Integração não encontrada'; end if;
  update public.central_channels set active=(v_status='connected'),updated_at=now() where provider=v_provider and account_external_id=v_account_id;
end;
$function$;
