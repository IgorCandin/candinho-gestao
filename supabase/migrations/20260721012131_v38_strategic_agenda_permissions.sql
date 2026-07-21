create or replace function public.central_can_manage_strategic_agenda()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(public.current_user_role()='admin',false)
    or coalesce(public.can_write(),false)
    or coalesce(public.can_write_fitness(),false)
    or coalesce(public.can_write_marketing(),false);
$function$;

alter table public.central_strategic_agenda_templates enable row level security;
alter table public.central_strategic_agenda_items enable row level security;

drop policy if exists central_strategic_agenda_templates_select on public.central_strategic_agenda_templates;
create policy central_strategic_agenda_templates_select
on public.central_strategic_agenda_templates
for select to authenticated
using (public.central_can_manage_strategic_agenda());

drop policy if exists central_strategic_agenda_items_select on public.central_strategic_agenda_items;
create policy central_strategic_agenda_items_select
on public.central_strategic_agenda_items
for select to authenticated
using (public.central_can_manage_strategic_agenda());

drop policy if exists central_strategic_agenda_items_write on public.central_strategic_agenda_items;
create policy central_strategic_agenda_items_write
on public.central_strategic_agenda_items
for all to authenticated
using (public.central_can_manage_strategic_agenda())
with check (public.central_can_manage_strategic_agenda());

grant select on public.central_strategic_agenda_templates to authenticated;
grant select,insert,update,delete on public.central_strategic_agenda_items to authenticated;
revoke all on public.central_strategic_agenda_templates from anon;
revoke all on public.central_strategic_agenda_items from anon;
grant execute on function public.central_can_manage_strategic_agenda() to authenticated,service_role;
revoke all on function public.central_can_manage_strategic_agenda() from anon;
