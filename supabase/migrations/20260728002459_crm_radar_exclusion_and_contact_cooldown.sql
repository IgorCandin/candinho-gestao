begin;

alter table public.customers
  add column if not exists crm_automation_enabled boolean not null default true,
  add column if not exists crm_exclusion_reason text null;

alter table public.customers
  drop constraint if exists customers_crm_exclusion_reason_check;

alter table public.customers
  add constraint customers_crm_exclusion_reason_check
  check (
    crm_exclusion_reason is null
    or crm_exclusion_reason in ('internal','test','do_not_contact','other')
  );

create or replace function public.update_customer_crm_automation(
  p_customer_id uuid,
  p_enabled boolean,
  p_exclusion_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_enabled boolean := coalesce(p_enabled, true);
  v_reason text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar clientes';
  end if;

  if not exists(select 1 from public.customers where id = p_customer_id) then
    raise exception 'Cliente não encontrado';
  end if;

  v_reason := case
    when v_enabled then null
    else coalesce(nullif(btrim(p_exclusion_reason), ''), 'other')
  end;

  if v_reason is not null and v_reason not in ('internal','test','do_not_contact','other') then
    raise exception 'Motivo de exclusão do CRM inválido';
  end if;

  update public.customers
  set crm_automation_enabled = v_enabled,
      crm_exclusion_reason = v_reason,
      updated_at = now()
  where id = p_customer_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'customer',
    p_customer_id,
    'crm_automation_updated',
    jsonb_build_object(
      'crm_automation_enabled', v_enabled,
      'crm_exclusion_reason', v_reason
    )
  );

  return p_customer_id;
end;
$function$;

do $block$
begin
  if to_regclass('public.customer_opportunity_radar_v3_base') is null then
    alter view public.customer_opportunity_radar_v3 rename to customer_opportunity_radar_v3_base;
  end if;
end;
$block$;

create or replace view public.customer_opportunity_radar_v3
with (security_invoker = true)
as
select r.*
from public.customer_opportunity_radar_v3_base r
join public.customers c on c.id = r.customer_id
cross join lateral (
  select (now() at time zone 'America/Sao_Paulo')::date as today
) d
where coalesce(c.crm_automation_enabled, true)
  and (
    r.radar_status in ('overdue_followup','due_today')
    or (
      coalesce(r.pending_followup_count, 0) = 0
      and r.next_followup_at is null
      and coalesce(r.days_since_last_contact, 999999) >= 7
    )
    or (
      r.next_followup_at is not null
      and (r.next_followup_at at time zone 'America/Sao_Paulo')::date <= d.today
    )
  );

create or replace view public.customer_opportunity_radar_summary_v3
with (security_invoker = true)
as
select
  count(*) filter (where is_priority_opportunity)::integer as possible_customers,
  count(*) filter (where is_priority_opportunity and opportunity_priority = 'Alta')::integer as high_priority,
  count(*) filter (where is_priority_opportunity and opportunity_priority = 'Média')::integer as medium_priority,
  count(*) filter (where is_priority_opportunity and opportunity_label like 'Recompra provável%')::integer as likely_repurchase,
  count(*) filter (where is_priority_opportunity and opportunity_label = 'Lead esquecido / sem compra')::integer as forgotten_leads,
  count(*) filter (where is_priority_opportunity and priority_source = any(array['CRM/AppSheet'::text,'Lead/AppSheet'::text]))::integer as appsheet_prioritized
from public.customer_opportunity_radar_v3;

grant select on public.customer_opportunity_radar_v3 to authenticated, service_role;
grant select on public.customer_opportunity_radar_summary_v3 to authenticated, service_role;
grant execute on function public.update_customer_crm_automation(uuid,boolean,text) to authenticated, service_role;

commit;
