begin;

drop policy if exists customer_relationships_read_v1 on public.customer_relationships;
create policy customer_relationships_read_v1
on public.customer_relationships
for select to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
      and (p.role::text='admin' or coalesce(p.can_access_supplements,false))
  )
);

drop policy if exists customer_partner_affiliations_read_v1 on public.customer_partner_affiliations;
create policy customer_partner_affiliations_read_v1
on public.customer_partner_affiliations
for select to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
      and (p.role::text='admin' or coalesce(p.can_access_supplements,false))
  )
);

drop policy if exists nexus_signals_read_v1 on public.nexus_signals;
create policy nexus_signals_read_v1
on public.nexus_signals
for select to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
      and (p.role::text='admin' or coalesce(p.can_access_supplements,false))
  )
);

commit;
