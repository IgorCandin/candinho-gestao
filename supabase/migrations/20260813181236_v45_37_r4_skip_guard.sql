create or replace function public.commercial_skip_next_day_guard_v1()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.action='skipped' then
    new.next_eligible_on := greatest(
      coalesce(new.next_eligible_on,(now() at time zone 'America/Sao_Paulo')::date),
      (now() at time zone 'America/Sao_Paulo')::date + 1
    );
  end if;
  return new;
end;
$$;

drop trigger if exists commercial_skip_next_day_guard_v1 on public.commercial_contact_attempts;
create trigger commercial_skip_next_day_guard_v1
before insert or update of action,next_eligible_on on public.commercial_contact_attempts
for each row execute function public.commercial_skip_next_day_guard_v1();
