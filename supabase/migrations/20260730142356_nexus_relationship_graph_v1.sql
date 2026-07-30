begin;

create or replace function public.get_nexus_relationship_graph_v1(p_limit integer default 250)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_relationships jsonb;
  v_affiliations jsonb;
  v_limit integer:=least(greatest(coalesce(p_limit,250),1),500);
begin
  if not exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
      and (p.role::text='admin' or coalesce(p.can_access_supplements,false))
  ) then
    raise exception 'Usuário sem acesso ao relacionamento da operação';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.customer_name,x.related_name),'[]'::jsonb)
  into v_relationships
  from (
    select
      r.id,r.customer_id,c.name customer_name,
      r.related_customer_id,rc.name related_name,
      r.relation_type,r.relation_label,r.notes
    from public.customer_relationships r
    join public.customers c on c.id=r.customer_id
    join public.customers rc on rc.id=r.related_customer_id
    where r.active and c.active and rc.active
    order by r.updated_at desc,r.created_at desc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.partner_name,x.customer_name),'[]'::jsonb)
  into v_affiliations
  from (
    select
      a.id,a.customer_id,c.name customer_name,
      a.partner_id,p.name partner_name,p.partner_type,
      a.relation_type,a.relation_label,a.counts_for_partnership,
      a.auto_attribute_sales,a.is_primary,a.priority,
      a.valid_from,a.valid_until,a.notes
    from public.customer_partner_affiliations a
    join public.customers c on c.id=a.customer_id
    join public.partners p on p.id=a.partner_id
    where a.active and c.active and coalesce(p.active,true)
    order by a.is_primary desc,a.priority desc,a.updated_at desc
    limit v_limit
  ) x;

  return jsonb_build_object(
    'relationships',coalesce(v_relationships,'[]'::jsonb),
    'partner_affiliations',coalesce(v_affiliations,'[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_nexus_relationship_graph_v1(integer)
to authenticated,service_role;

commit;
