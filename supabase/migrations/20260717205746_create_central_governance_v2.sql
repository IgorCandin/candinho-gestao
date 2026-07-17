create or replace function public.central_governance_snapshot_v2(p_limit integer default 150) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_audit jsonb;v_integrations jsonb;v_flags jsonb;v_users jsonb;v_portal jsonb;
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) into v_audit from (select * from public.central_governance_audit_feed(p_limit)) a;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.provider,i.operation_scope),'[]'::jsonb) into v_integrations from public.central_integration_health i;
  select coalesce(jsonb_agg(jsonb_build_object('key',f.key,'enabled',f.enabled,'description',f.description,'updated_at',f.updated_at,'updated_by',f.updated_by) order by f.key),'[]'::jsonb) into v_flags from public.ui_feature_flags f;
  select jsonb_build_object('total',count(*),'active',count(*) filter(where active),'admins',count(*) filter(where active and role='admin'),'operators',count(*) filter(where active and role='operator'),'sales',count(*) filter(where active and role='sales'),'partners',count(*) filter(where active and role='partner'),'marketing_access',count(*) filter(where active and can_access_marketing)) into v_users from public.profiles;
  select jsonb_build_object('eligible',count(*),'active_portals',count(*) filter(where exists(select 1 from public.partner_user_links l where l.partner_id=p.id and l.active)),'without_portal',count(*) filter(where not exists(select 1 from public.partner_user_links l where l.partner_id=p.id and l.active))) into v_portal from public.partners p where coalesce(p.active,true) and p.partner_type<>'supplier';
  return jsonb_build_object('audit',v_audit,'integrations',v_integrations,'feature_flags',v_flags,'users',v_users,'partner_portal',v_portal);
end;$$;
revoke all on function public.central_governance_snapshot_v2(integer) from public,anon;
grant execute on function public.central_governance_snapshot_v2(integer) to authenticated;
create or replace function public.central_set_feature_flag(p_key text,p_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not (public.can_manage_users() or public.current_user_role()='admin') then raise exception 'Acesso negado'; end if;
  if p_key not in ('central_enabled','company_home_v2','inventory_v2_enabled','marketing_enabled','partner_portal_enabled','test_lab_visible') then raise exception 'Feature flag não reconhecida'; end if;
  if not exists(select 1 from public.ui_feature_flags where key=p_key) then raise exception 'Feature flag não encontrada'; end if;
  update public.ui_feature_flags set enabled=coalesce(p_enabled,false),updated_at=now(),updated_by=auth.uid() where key=p_key;
end;$$;
revoke all on function public.central_set_feature_flag(text,boolean) from public,anon;
grant execute on function public.central_set_feature_flag(text,boolean) to authenticated;
