create or replace function public.company_home_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_profile public.profiles%rowtype;
  v_supp jsonb := null;
  v_fit jsonb := null;
  v_bank jsonb := null;
  v_marketing jsonb := null;
  v_partner jsonb := null;
  v_central jsonb := null;
  v_active_projects integer := 0;
  v_ready_projects integer := 0;
  v_published_projects integer := 0;
  v_configured_integrations integer := 0;
  v_contacts integer := 0;
  v_media_assets integer := 0;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and active = true;

  if not found then
    raise exception 'Perfil ativo não encontrado';
  end if;

  if v_profile.role = 'admin' or v_profile.can_access_supplements then
    select to_jsonb(x)
    into v_supp
    from (select * from public.dashboard_operational_summary limit 1) x;
  end if;

  if v_profile.role = 'admin' or v_profile.can_access_fitness then
    select to_jsonb(x)
    into v_fit
    from (select * from public.fitness_dashboard_summary_v2 limit 1) x;
  end if;

  if v_profile.role = 'admin' or v_profile.can_access_bank then
    select to_jsonb(x)
    into v_bank
    from (select * from public.bank_dashboard_summary limit 1) x;
  end if;

  if v_profile.role = 'admin' or coalesce(v_profile.can_access_marketing, false) then
    select
      count(*) filter (where status <> 'archived')::integer,
      count(*) filter (where processing_status = 'ready')::integer,
      count(*) filter (where status = 'published')::integer
    into v_active_projects, v_ready_projects, v_published_projects
    from public.marketing_projects;

    v_marketing := jsonb_build_object(
      'active_projects', v_active_projects,
      'ready_projects', v_ready_projects,
      'published_projects', v_published_projects
    );
  end if;

  if (
    v_profile.role = 'admin'
    or v_profile.can_manage_users
    or v_profile.can_access_supplements
    or v_profile.can_access_fitness
    or coalesce(v_profile.can_access_marketing, false)
  ) then
    select
      count(*) filter (where source = 'integration')::integer,
      count(*) filter (where source = 'contact')::integer,
      count(*) filter (where source = 'media')::integer
    into v_configured_integrations, v_contacts, v_media_assets
    from (
      select 'integration'::text as source
      from public.central_integrations i
      where i.status <> 'disconnected'
        and (
          v_profile.role = 'admin'
          or i.operation_scope = 'company'
          or (v_profile.can_access_supplements and i.operation_scope = 'supplements')
          or (v_profile.can_access_fitness and i.operation_scope = 'fitness')
          or (coalesce(v_profile.can_access_marketing, false) and i.operation_scope = 'marketing')
        )

      union all

      select 'contact'::text as source
      from public.central_contacts c
      where
        v_profile.role = 'admin'
        or c.operation_scope = 'company'
        or (v_profile.can_access_supplements and c.operation_scope = 'supplements')
        or (v_profile.can_access_fitness and c.operation_scope = 'fitness')
        or (coalesce(v_profile.can_access_marketing, false) and c.operation_scope = 'marketing')

      union all

      select 'media'::text as source
      from public.central_media_assets m
      where
        v_profile.role = 'admin'
        or m.operation_scope = 'company'
        or (v_profile.can_access_supplements and m.operation_scope = 'supplements')
        or (v_profile.can_access_fitness and m.operation_scope = 'fitness')
        or (coalesce(v_profile.can_access_marketing, false) and m.operation_scope = 'marketing')
    ) central_metrics;

    v_central := jsonb_build_object(
      'unread', 0,
      'open_conversations', 0,
      'inbox_paused', true,
      'configured_integrations', v_configured_integrations,
      'contacts', v_contacts,
      'media_assets', v_media_assets
    );
  end if;

  if v_profile.role = 'partner' and public.current_partner_id() is not null then
    select to_jsonb(x)
    into v_partner
    from (select * from public.partner_portal_get_summary(null, null) limit 1) x;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.full_name,
      'role', v_profile.role::text,
      'is_partner', v_profile.role = 'partner'
    ),
    'navigation', jsonb_build_array(
      jsonb_build_object('key', 'central', 'visible', (v_profile.role = 'admin' or v_profile.can_access_supplements or v_profile.can_access_fitness or v_profile.can_access_marketing), 'href', '/central', 'badge', 0),
      jsonb_build_object('key', 'supplements', 'visible', (v_profile.role = 'admin' or v_profile.can_access_supplements), 'href', '/suplementos'),
      jsonb_build_object('key', 'fitness', 'visible', (v_profile.role = 'admin' or v_profile.can_access_fitness), 'href', '/fitness'),
      jsonb_build_object('key', 'bank', 'visible', (v_profile.role = 'admin' or v_profile.can_access_bank), 'href', '/bank'),
      jsonb_build_object('key', 'marketing', 'visible', (v_profile.role = 'admin' or v_profile.can_access_marketing), 'href', '/marketing'),
      jsonb_build_object('key', 'partner', 'visible', (v_profile.role = 'partner' and public.current_partner_id() is not null), 'href', '/parceiro')
    ),
    'central', v_central,
    'supplements', v_supp,
    'fitness', v_fit,
    'bank', v_bank,
    'marketing', v_marketing,
    'partner', v_partner
  );
end;
$function$;

alter function public.company_home_snapshot() owner to postgres;
revoke all on function public.company_home_snapshot() from public, anon, authenticated;
grant execute on function public.company_home_snapshot() to authenticated, service_role;

comment on function public.company_home_snapshot() is
  'Snapshot leve do seletor de operações; mantém a Inbox pausada e expõe apenas indicadores operacionais.';
