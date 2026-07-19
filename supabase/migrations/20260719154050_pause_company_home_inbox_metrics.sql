create or replace function public.company_home_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_supp jsonb := null;
  v_fit jsonb := null;
  v_bank jsonb := null;
  v_marketing jsonb := null;
  v_partner jsonb := null;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found then raise exception 'Perfil ativo não encontrado'; end if;

  if v_profile.role='admin' or v_profile.can_access_supplements then
    select to_jsonb(x) into v_supp from (select * from public.dashboard_operational_summary limit 1) x;
  end if;
  if v_profile.role='admin' or v_profile.can_access_fitness then
    select to_jsonb(x) into v_fit from (select * from public.fitness_dashboard_summary_v2 limit 1) x;
  end if;
  if v_profile.role='admin' or v_profile.can_access_bank then
    select to_jsonb(x) into v_bank from (select * from public.bank_dashboard_summary limit 1) x;
  end if;
  if v_profile.role='admin' or v_profile.can_access_marketing then
    v_marketing := jsonb_build_object('status','foundation_ready','data_mode','awaiting_definition');
  end if;
  if v_profile.role='partner' and public.current_partner_id() is not null then
    select to_jsonb(x) into v_partner from (select * from public.partner_portal_get_summary(null,null) limit 1) x;
  end if;

  return jsonb_build_object(
    'user',jsonb_build_object('id',v_profile.id,'name',v_profile.full_name,'role',v_profile.role::text,'is_partner',v_profile.role='partner'),
    'navigation',jsonb_build_array(
      jsonb_build_object('key','central','visible',(v_profile.role='admin' or v_profile.can_access_supplements or v_profile.can_access_fitness or v_profile.can_access_marketing),'href','/central','badge',0),
      jsonb_build_object('key','supplements','visible',(v_profile.role='admin' or v_profile.can_access_supplements),'href','/suplementos'),
      jsonb_build_object('key','fitness','visible',(v_profile.role='admin' or v_profile.can_access_fitness),'href','/fitness'),
      jsonb_build_object('key','bank','visible',(v_profile.role='admin' or v_profile.can_access_bank),'href','/bank'),
      jsonb_build_object('key','marketing','visible',(v_profile.role='admin' or v_profile.can_access_marketing),'href','/marketing'),
      jsonb_build_object('key','partner','visible',(v_profile.role='partner' and public.current_partner_id() is not null),'href','/parceiro')
    ),
    'central',jsonb_build_object('unread',0,'open_conversations',0,'inbox_paused',true),
    'supplements',v_supp,
    'fitness',v_fit,
    'bank',v_bank,
    'marketing',v_marketing,
    'partner',v_partner
  );
end;
$function$;
