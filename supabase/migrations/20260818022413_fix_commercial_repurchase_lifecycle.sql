-- A contact attempt must also settle or reschedule its repurchase reminder.
-- Contact history remains in commercial_contact_attempts and audit_events.

create or replace function public.apply_repurchase_attempt_lifecycle_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
begin
  if new.source_type <> 'repurchase' then
    return new;
  end if;

  select r.task_id
  into v_task_id
  from public.sale_replenishment_reminders r
  where r.id = new.source_id;

  if new.action in ('contacted', 'responded') then
    update public.sale_replenishment_reminders
    set status = 'completed', updated_at = now()
    where id = new.source_id
      and status = 'planned';

    update public.operational_tasks
    set
      status = 'completed',
      completed_at = coalesce(completed_at, new.occurred_at),
      cancelled_at = null,
      updated_at = now()
    where id = v_task_id
      and status = 'planned';
  elsif new.action in ('skipped', 'no_response')
    and new.next_eligible_on is not null then
    update public.sale_replenishment_reminders
    set
      status = 'planned',
      due_on = new.next_eligible_on,
      updated_at = now()
    where id = new.source_id;

    update public.operational_tasks
    set
      status = 'planned',
      due_at = (new.next_eligible_on + time '10:00')
        at time zone 'America/Sao_Paulo',
      queue_not_before_on = new.next_eligible_on,
      completed_at = null,
      cancelled_at = null,
      updated_at = now()
    where id = v_task_id;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_repurchase_attempt_lifecycle_v1()
from public, anon, authenticated;

drop trigger if exists apply_repurchase_attempt_lifecycle_v1
on public.commercial_contact_attempts;

create trigger apply_repurchase_attempt_lifecycle_v1
after insert on public.commercial_contact_attempts
for each row
execute function public.apply_repurchase_attempt_lifecycle_v1();

-- Backfill only reminders whose latest recorded action has deterministic
-- semantics. No reminders or contact attempts are deleted.
with latest as (
  select distinct on (a.source_id)
    a.source_id,
    a.action,
    a.occurred_at,
    a.next_eligible_on
  from public.commercial_contact_attempts a
  where a.source_type = 'repurchase'
  order by a.source_id, a.occurred_at desc, a.id desc
)
insert into public.audit_events(entity_type, entity_id, action, details)
select
  'sale_replenishment_reminder',
  r.id,
  'repurchase_lifecycle_backfill',
  jsonb_build_object(
    'status_before', r.status,
    'due_on_before', r.due_on,
    'task_id', r.task_id,
    'task_status_before', t.status,
    'task_due_at_before', t.due_at,
    'latest_action', l.action,
    'latest_occurred_at', l.occurred_at,
    'next_eligible_on', l.next_eligible_on,
    'migration', '20260818022413_fix_commercial_repurchase_lifecycle'
  )
from latest l
join public.sale_replenishment_reminders r on r.id = l.source_id
left join public.operational_tasks t on t.id = r.task_id
where r.status = 'planned'
  and (
    l.action in ('contacted', 'responded')
    or (
      l.action in ('skipped', 'no_response')
      and l.next_eligible_on is not null
      and r.due_on is distinct from l.next_eligible_on
    )
  );

with latest as (
  select distinct on (a.source_id)
    a.source_id, a.action, a.occurred_at
  from public.commercial_contact_attempts a
  where a.source_type = 'repurchase'
  order by a.source_id, a.occurred_at desc, a.id desc
), settled as (
  update public.sale_replenishment_reminders r
  set status = 'completed', updated_at = now()
  from latest l
  where r.id = l.source_id
    and r.status = 'planned'
    and l.action in ('contacted', 'responded')
  returning r.task_id, l.occurred_at
)
update public.operational_tasks t
set
  status = 'completed',
  completed_at = coalesce(t.completed_at, s.occurred_at),
  cancelled_at = null,
  updated_at = now()
from settled s
where t.id = s.task_id
  and t.status = 'planned';

with latest as (
  select distinct on (a.source_id)
    a.source_id, a.action, a.next_eligible_on
  from public.commercial_contact_attempts a
  where a.source_type = 'repurchase'
  order by a.source_id, a.occurred_at desc, a.id desc
), rescheduled as (
  update public.sale_replenishment_reminders r
  set due_on = l.next_eligible_on, updated_at = now()
  from latest l
  where r.id = l.source_id
    and r.status = 'planned'
    and l.action in ('skipped', 'no_response')
    and l.next_eligible_on is not null
  returning r.task_id, l.next_eligible_on
)
update public.operational_tasks t
set
  status = 'planned',
  due_at = (r.next_eligible_on + time '10:00')
    at time zone 'America/Sao_Paulo',
  queue_not_before_on = r.next_eligible_on,
  completed_at = null,
  cancelled_at = null,
  updated_at = now()
from rescheduled r
where t.id = r.task_id;

do $verification$
begin
  if exists (
    with latest as (
      select distinct on (a.source_id) a.source_id, a.action
      from public.commercial_contact_attempts a
      where a.source_type = 'repurchase'
      order by a.source_id, a.occurred_at desc, a.id desc
    )
    select 1
    from latest l
    join public.sale_replenishment_reminders r on r.id = l.source_id
    where r.status = 'planned'
      and l.action in ('contacted', 'responded')
  ) then
    raise exception 'Repurchase lifecycle verification failed';
  end if;
end
$verification$;
