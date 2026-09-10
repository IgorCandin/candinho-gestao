create or replace function public.archive_previous_active_physique_training_plan()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'active' then
    update public.physique_training_plans
       set status = 'archived',
           updated_at = now()
     where athlete_id = new.athlete_id
       and status = 'active'
       and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists physique_training_plan_single_active on public.physique_training_plans;
create trigger physique_training_plan_single_active
before insert or update of status, athlete_id
on public.physique_training_plans
for each row
execute function public.archive_previous_active_physique_training_plan();

create unique index if not exists physique_training_plans_one_active_per_athlete
on public.physique_training_plans (athlete_id)
where status = 'active';
