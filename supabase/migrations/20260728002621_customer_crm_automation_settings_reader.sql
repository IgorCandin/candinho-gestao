create or replace function public.get_customer_crm_automation(p_customer_id uuid)
returns table(crm_automation_enabled boolean, crm_exclusion_reason text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar clientes';
  end if;

  return query
  select c.crm_automation_enabled, c.crm_exclusion_reason
  from public.customers c
  where c.id = p_customer_id;
end;
$function$;

grant execute on function public.get_customer_crm_automation(uuid) to authenticated, service_role;
