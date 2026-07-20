begin;

-- Candinho Company · V38 · Pacotão 7
-- Central: Agenda/Marketing e calendário operacional do Brasil.
-- Migration já aplicada no Supabase de produção.

create or replace view public.central_operational_tasks_overview
with (security_invoker = true)
as
select
  t.id,
  t.title,
  t.category,
  t.due_at,
  (t.due_at at time zone 'America/Sao_Paulo')::date as due_date,
  t.status,
  t.priority,
  t.operation_scope,
  t.central_contact_id,
  cc.display_name as contact_name,
  cc.phone as contact_phone,
  t.assigned_to,
  pr.full_name as assigned_name,
  t.notes,
  t.completed_at,
  t.cancelled_at,
  t.created_by,
  t.created_at,
  t.updated_at
from public.operational_tasks t
left join public.central_contacts cc on cc.id=t.central_contact_id
left join public.profiles pr on pr.id=t.assigned_to;

create or replace function public.central_agenda_snapshot(
  p_from date default null,
  p_to date default null,
  p_status text default null,
  p_scope text default null,
  p_limit integer default 300
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_items jsonb;
  v_today_count integer := 0;
  v_overdue_count integer := 0;
  v_next_seven integer := 0;
  v_completed_month integer := 0;
  v_pending integer := 0;
begin
  select * into v_profile
  from public.profiles
  where id=auth.uid() and active=true;

  if not found or not public.central_can_access_scope('company') then
    raise exception 'Acesso negado';
  end if;

  if p_scope is not null and p_scope not in ('company','supplements','fitness','marketing') then
    raise exception 'Operação inválida';
  end if;

  if p_status is not null and p_status not in ('planned','completed','cancelled') then
    raise exception 'Status inválido';
  end if;

  select
    count(*) filter(
      where t.status='planned'
        and (t.due_at at time zone 'America/Sao_Paulo')::date=v_today
    )::integer,
    count(*) filter(
      where t.status='planned'
        and (t.due_at at time zone 'America/Sao_Paulo')::date<v_today
    )::integer,
    count(*) filter(
      where t.status='planned'
        and (t.due_at at time zone 'America/Sao_Paulo')::date>v_today
        and (t.due_at at time zone 'America/Sao_Paulo')::date<=v_today+7
    )::integer,
    count(*) filter(
      where t.status='completed'
        and date_trunc('month',t.completed_at at time zone 'America/Sao_Paulo')
          =date_trunc('month',v_today::timestamp)
    )::integer,
    count(*) filter(where t.status='planned')::integer
  into v_today_count,v_overdue_count,v_next_seven,v_completed_month,v_pending
  from public.operational_tasks t
  where public.central_can_access_scope(t.operation_scope)
    and (p_scope is null or t.operation_scope=p_scope);

  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.due_at asc),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from public.central_operational_tasks_overview t
    where public.central_can_access_scope(t.operation_scope)
      and (p_scope is null or t.operation_scope=p_scope)
      and (p_status is null or t.status=p_status)
      and (p_from is null or t.due_date>=p_from)
      and (p_to is null or t.due_date<=p_to)
    order by t.due_at asc
    limit least(greatest(coalesce(p_limit,300),1),1000)
  ) x;

  return jsonb_build_object(
    'summary',jsonb_build_object(
      'today_count',v_today_count,
      'overdue_count',v_overdue_count,
      'next_seven_days_count',v_next_seven,
      'completed_month_count',v_completed_month,
      'pending_count',v_pending
    ),
    'items',v_items
  );
end;
$function$;

create or replace function public.central_inbox_snapshot(
  p_provider text default null,
  p_status text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_items jsonb;
begin
  select * into v_profile
  from public.profiles
  where id=auth.uid() and active=true;

  if not found or not (
    v_profile.role='admin'
    or v_profile.can_access_supplements
    or v_profile.can_access_fitness
    or coalesce(v_profile.can_access_marketing,false)
  ) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(x) order by last_message_at desc nulls last),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from public.central_inbox_overview i
    where (
      v_profile.role='admin'
      or (v_profile.can_access_supplements and i.operation_scope='supplements')
      or (v_profile.can_access_fitness and i.operation_scope='fitness')
      or (coalesce(v_profile.can_access_marketing,false) and i.operation_scope='marketing')
      or i.operation_scope='company'
    )
      and (p_provider is null or i.provider=p_provider)
      and (p_status is null or i.status=p_status)
    limit least(greatest(coalesce(p_limit,50),1),200)
  ) x;

  return jsonb_build_object('items',v_items);
end;
$function$;

commit;
