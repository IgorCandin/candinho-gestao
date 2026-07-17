create or replace function public.partner_portal_health_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','auth'
as $function$
declare
  v_items jsonb;
  v_ready integer := 0;
  v_attention integer := 0;
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then
    raise exception 'Acesso negado';
  end if;

  with health as (
    select
      p.id as partner_id,
      p.name as partner_name,
      p.contact_name,
      p.active as partner_active,
      pul.profile_id,
      pul.active as portal_access_active,
      pr.full_name as portal_user_name,
      pr.username as portal_username,
      coalesce(pr.email,u.email) as portal_user_email,
      pr.active as profile_active,
      pr.role::text as profile_role,
      u.last_sign_in_at,
      case
        when pul.profile_id is null then 'no_login'
        when not coalesce(pul.active,false) then 'paused'
        when pr.id is null then 'missing_profile'
        when not coalesce(pr.active,false) then 'profile_inactive'
        when pr.role::text <> 'partner' then 'invalid_role'
        when coalesce(pr.can_access_supplements,false) or coalesce(pr.can_write_supplements,false)
          or coalesce(pr.can_access_fitness,false) or coalesce(pr.can_write_fitness,false)
          or coalesce(pr.can_access_bank,false) or coalesce(pr.can_write_bank,false)
          or coalesce(pr.can_access_marketing,false) or coalesce(pr.can_write_marketing,false)
          or coalesce(pr.can_manage_users,false) then 'permission_leak'
        else 'ready'
      end as health_status
    from public.partners p
    left join public.partner_user_links pul on pul.partner_id=p.id
    left join public.profiles pr on pr.id=pul.profile_id
    left join auth.users u on u.id=pul.profile_id
    where coalesce(p.active,true)=true and p.partner_type <> 'supplier'
  )
  select
    coalesce(jsonb_agg(to_jsonb(h) order by case h.health_status when 'ready' then 1 when 'paused' then 2 when 'no_login' then 3 else 4 end,h.partner_name),'[]'::jsonb),
    count(*) filter(where health_status='ready')::integer,
    count(*) filter(where health_status<>'ready')::integer
  into v_items,v_ready,v_attention
  from health h;

  return jsonb_build_object(
    'summary',jsonb_build_object('ready',v_ready,'attention',v_attention,'total',v_ready+v_attention),
    'items',v_items
  );
end;
$function$;

revoke all on function public.partner_portal_health_snapshot() from public,anon;
grant execute on function public.partner_portal_health_snapshot() to authenticated,service_role;
