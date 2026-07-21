create or replace function public.central_generate_strategic_agenda_month(
  p_month date default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_month date := date_trunc(
    'month',
    coalesce(p_month,(now() at time zone 'America/Sao_Paulo')::date)::timestamp
  )::date;
  v_inserted integer := 0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  insert into public.central_strategic_agenda_items (
    reference_month,template_id,code,week_number,task,objective,priority,category,
    action_href,action_label,sort_order,created_by,updated_by
  )
  select
    v_month,t.id,t.code,t.week_number,t.task,t.objective,t.priority,t.category,
    t.action_href,t.action_label,t.sort_order,auth.uid(),auth.uid()
  from public.central_strategic_agenda_templates t
  where t.active
  on conflict(reference_month,template_id)
    where template_id is not null
  do nothing;

  get diagnostics v_inserted=row_count;
  return v_inserted;
end;
$function$;

create or replace view public.central_strategic_agenda_overview
with (security_invoker=true)
as
select
  i.*,
  case i.priority
    when 'extreme' then 4
    when 'high' then 3
    when 'medium' then 2
    else 1
  end as priority_rank
from public.central_strategic_agenda_items i;

grant select on public.central_strategic_agenda_overview to authenticated;
revoke all on public.central_strategic_agenda_overview from anon;
grant execute on function public.central_generate_strategic_agenda_month(date) to authenticated,service_role;
revoke all on function public.central_generate_strategic_agenda_month(date) from anon;
