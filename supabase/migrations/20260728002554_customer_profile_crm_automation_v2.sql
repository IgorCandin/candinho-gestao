create or replace function public.update_customer_profile_v2(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_city text default null,
  p_reference text default null,
  p_email text default null,
  p_notes text default null,
  p_sensitive_to_caffeine boolean default false,
  p_anxiety_or_insomnia boolean default false,
  p_prohibited_products text default null,
  p_approach_preferences text default null,
  p_tags text default null,
  p_active boolean default true,
  p_crm_automation_enabled boolean default true,
  p_crm_exclusion_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text := nullif(btrim(p_name), '');
  v_old public.customers%rowtype;
  v_crm_enabled boolean := coalesce(p_crm_automation_enabled, true);
  v_reason text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar clientes';
  end if;

  if v_name is null then
    raise exception 'Informe o nome do cliente';
  end if;

  v_reason := case
    when v_crm_enabled then null
    else coalesce(nullif(btrim(p_crm_exclusion_reason), ''), 'other')
  end;

  if v_reason is not null and v_reason not in ('internal','test','do_not_contact','other') then
    raise exception 'Motivo de exclusão do CRM inválido';
  end if;

  select * into v_old
  from public.customers
  where id = p_customer_id
  for update;

  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  update public.customers
  set name = v_name,
      phone = nullif(btrim(p_phone), ''),
      city = nullif(btrim(p_city), ''),
      reference = nullif(btrim(p_reference), ''),
      email = nullif(btrim(p_email), ''),
      notes = nullif(btrim(p_notes), ''),
      sensitive_to_caffeine = coalesce(p_sensitive_to_caffeine, false),
      anxiety_or_insomnia = coalesce(p_anxiety_or_insomnia, false),
      prohibited_products = nullif(btrim(p_prohibited_products), ''),
      approach_preferences = nullif(btrim(p_approach_preferences), ''),
      tags = nullif(btrim(p_tags), ''),
      active = coalesce(p_active, true),
      crm_automation_enabled = v_crm_enabled,
      crm_exclusion_reason = v_reason,
      updated_at = now()
  where id = p_customer_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'customer',
    p_customer_id,
    'profile_updated',
    jsonb_build_object(
      'old_name', v_old.name,
      'new_name', v_name,
      'sensitive_to_caffeine', coalesce(p_sensitive_to_caffeine, false),
      'anxiety_or_insomnia', coalesce(p_anxiety_or_insomnia, false),
      'active', coalesce(p_active, true),
      'crm_automation_enabled', v_crm_enabled,
      'crm_exclusion_reason', v_reason
    )
  );

  return p_customer_id;
end;
$function$;

grant execute on function public.update_customer_profile_v2(uuid,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean,boolean,text) to authenticated, service_role;
