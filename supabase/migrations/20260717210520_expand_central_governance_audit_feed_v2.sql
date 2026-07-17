create or replace function public.central_governance_audit_feed(p_limit integer default 100)
returns table(id bigint,entity_type text,entity_id uuid,action text,details jsonb,created_by uuid,created_by_name text,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  return query select ae.id,ae.entity_type,ae.entity_id,ae.action,ae.details,ae.created_by,p.full_name,ae.created_at from public.audit_events ae left join public.profiles p on p.id=ae.created_by where ae.entity_type in ('partner_user_link','central_integration','ui_feature_flag','partner_portal_invite','inventory_reconciliation') order by ae.created_at desc limit least(greatest(coalesce(p_limit,100),1),500);
end;$$;
revoke all on function public.central_governance_audit_feed(integer) from public,anon;
grant execute on function public.central_governance_audit_feed(integer) to authenticated;
