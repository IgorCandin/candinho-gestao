-- Candinho Company · Marketing foundation
-- Adds the operation without inventing business modules or data.

alter table public.profiles
  add column if not exists can_access_marketing boolean not null default false,
  add column if not exists can_write_marketing boolean not null default false;

update public.profiles
set can_access_marketing = true,
    can_write_marketing = true,
    updated_at = now()
where role = 'admin';

insert into public.ui_feature_flags(key, enabled, description)
values ('marketing_enabled', true, 'Exibe a operação Candinho Marketing e sua fundação inicial.')
on conflict (key) do update
set enabled = excluded.enabled,
    description = excluded.description,
    updated_at = now();

create or replace function public.can_access_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (p.role = 'admin' or p.can_access_marketing)
  );
$$;

create or replace function public.can_write_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (p.role = 'admin' or (p.can_access_marketing and p.can_write_marketing))
  );
$$;

revoke all on function public.can_access_marketing() from public, anon;
revoke all on function public.can_write_marketing() from public, anon;
grant execute on function public.can_access_marketing() to authenticated;
grant execute on function public.can_write_marketing() to authenticated;

create or replace function public.central_can_access_scope(p_scope text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case lower(coalesce(p_scope, 'company'))
    when 'supplements' then public.can_access_operation('supplements')
    when 'fitness' then public.can_access_operation('fitness')
    when 'marketing' then public.can_access_marketing()
    when 'company' then public.can_access_operation('supplements') or public.can_access_operation('fitness') or public.can_access_marketing()
    else false
  end;
$$;

create or replace function public.central_can_write_scope(p_scope text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case lower(coalesce(p_scope, 'company'))
    when 'supplements' then public.can_write()
    when 'fitness' then public.can_write_fitness()
    when 'marketing' then public.can_write_marketing()
    when 'company' then public.can_write() or public.can_write_fitness() or public.can_write_marketing()
    else false
  end;
$$;

alter table public.central_contacts drop constraint if exists central_contacts_operation_scope_check;
alter table public.central_contacts add constraint central_contacts_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_channels drop constraint if exists central_channels_operation_scope_check;
alter table public.central_channels add constraint central_channels_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_conversations drop constraint if exists central_conversations_operation_scope_check;
alter table public.central_conversations add constraint central_conversations_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_messages drop constraint if exists central_messages_operation_scope_check;
alter table public.central_messages add constraint central_messages_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_integrations drop constraint if exists central_integrations_operation_scope_check;
alter table public.central_integrations add constraint central_integrations_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_media_assets drop constraint if exists central_media_assets_operation_scope_check;
alter table public.central_media_assets add constraint central_media_assets_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.central_ai_insights drop constraint if exists central_ai_insights_operation_scope_check;
alter table public.central_ai_insights add constraint central_ai_insights_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));
alter table public.operational_tasks drop constraint if exists operational_tasks_operation_scope_check;
alter table public.operational_tasks add constraint operational_tasks_operation_scope_check check (operation_scope = any (array['company'::text,'supplements'::text,'fitness'::text,'marketing'::text]));

create or replace function public.get_my_access_v2()
returns table(
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_access_fitness boolean,
  can_access_bank boolean,
  can_access_marketing boolean,
  can_manage_users boolean,
  can_write_supplements boolean,
  can_write_fitness boolean,
  can_write_bank boolean,
  can_write_marketing boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name),''), split_part(u.email,'@',1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_access_fitness,
    p.can_access_bank,
    p.can_access_marketing,
    p.can_manage_users,
    (p.active and p.can_access_supplements and (p.role='admin' or p.can_write_supplements)),
    (p.active and p.can_access_fitness and (p.role='admin' or p.can_write_fitness)),
    (p.active and p.can_access_bank and (p.role='admin' or p.can_write_bank)),
    (p.active and p.can_access_marketing and (p.role='admin' or p.can_write_marketing))
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

create or replace function public.list_user_permissions_v2()
returns table(
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_write_supplements boolean,
  can_access_fitness boolean,
  can_write_fitness boolean,
  can_access_bank boolean,
  can_write_bank boolean,
  can_access_marketing boolean,
  can_write_marketing boolean,
  can_manage_users boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.can_manage_users() then
    raise exception 'Usuário sem permissão para visualizar usuários';
  end if;
  return query
  select
    p.id,
    coalesce(p.email,lower(u.email)),
    coalesce(nullif(btrim(p.full_name),''),split_part(u.email,'@',1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_write_supplements,
    p.can_access_fitness,
    p.can_write_fitness,
    p.can_access_bank,
    p.can_write_bank,
    p.can_access_marketing,
    p.can_write_marketing,
    p.can_manage_users,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id=p.id
  order by (p.role='admin') desc,p.full_name,u.email;
end;
$$;

create or replace function public.update_user_permissions_v2(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_active boolean,
  p_can_access_supplements boolean,
  p_can_write_supplements boolean,
  p_can_access_fitness boolean,
  p_can_write_fitness boolean,
  p_can_access_bank boolean,
  p_can_write_bank boolean,
  p_can_access_marketing boolean,
  p_can_write_marketing boolean,
  p_can_manage_users boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.profiles%rowtype;
  v_new_role public.app_role;
begin
  if not public.can_manage_users() then raise exception 'Usuário sem permissão para alterar acessos'; end if;
  if p_role not in ('admin','operator','sales','partner') then raise exception 'Perfil de acesso inválido'; end if;
  v_new_role := p_role::public.app_role;
  select * into v_current from public.profiles where id=p_user_id for update;
  if not found then raise exception 'Usuário não encontrado'; end if;
  if p_user_id=auth.uid() and (not coalesce(p_active,false) or v_new_role<>'admin' or not coalesce(p_can_manage_users,false) or not coalesce(p_can_access_supplements,false)) then
    raise exception 'O administrador atual não pode remover o próprio acesso principal';
  end if;
  if v_current.role='admin' and (v_new_role<>'admin' or not coalesce(p_active,false)) and not exists(
    select 1 from public.profiles p where p.id<>p_user_id and p.active and p.role='admin' and p.can_manage_users
  ) then
    raise exception 'É necessário manter pelo menos um administrador ativo';
  end if;

  update public.profiles set
    full_name=nullif(btrim(p_full_name),''),
    role=v_new_role,
    active=coalesce(p_active,false),
    can_access_supplements=case when v_new_role='admin' then true else coalesce(p_can_access_supplements,false) end,
    can_write_supplements=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_supplements,false) end,
    can_access_fitness=case when v_new_role='admin' then true else coalesce(p_can_access_fitness,false) end,
    can_write_fitness=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_fitness,false) end,
    can_access_bank=case when v_new_role='admin' then true else coalesce(p_can_access_bank,false) end,
    can_write_bank=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_bank,false) end,
    can_access_marketing=case when v_new_role='admin' then true else coalesce(p_can_access_marketing,false) end,
    can_write_marketing=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_marketing,false) end,
    can_manage_users=case when v_new_role='admin' then coalesce(p_can_manage_users,false) else false end,
    updated_at=now()
  where id=p_user_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values ('profile',p_user_id,'permissions_updated_v2',jsonb_build_object(
    'role',v_new_role,
    'active',p_active,
    'can_access_supplements',p_can_access_supplements,
    'can_access_fitness',p_can_access_fitness,
    'can_access_bank',p_can_access_bank,
    'can_access_marketing',p_can_access_marketing,
    'can_manage_users',p_can_manage_users
  ));

  return p_user_id;
end;
$$;

revoke all on function public.get_my_access_v2() from public, anon;
revoke all on function public.list_user_permissions_v2() from public, anon;
revoke all on function public.update_user_permissions_v2(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.get_my_access_v2() to authenticated;
grant execute on function public.list_user_permissions_v2() to authenticated;
grant execute on function public.update_user_permissions_v2(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.company_home_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_supp jsonb := null;
  v_fit jsonb := null;
  v_bank jsonb := null;
  v_marketing jsonb := null;
  v_partner jsonb := null;
  v_central_unread integer := 0;
  v_central_open integer := 0;
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

  if v_profile.role='admin' or v_profile.can_access_supplements or v_profile.can_access_fitness or v_profile.can_access_marketing then
    select coalesce(sum(cc.unread_count),0)::integer,
           count(*) filter (where cc.status='open')::integer
    into v_central_unread,v_central_open
    from public.central_conversations cc
    where
      (v_profile.role='admin' and cc.operation_scope in ('company','supplements','fitness','marketing'))
      or (v_profile.can_access_supplements and cc.operation_scope='supplements')
      or (v_profile.can_access_fitness and cc.operation_scope='fitness')
      or (v_profile.can_access_marketing and cc.operation_scope='marketing');
  end if;

  return jsonb_build_object(
    'user',jsonb_build_object('id',v_profile.id,'name',v_profile.full_name,'role',v_profile.role::text,'is_partner',v_profile.role='partner'),
    'navigation',jsonb_build_array(
      jsonb_build_object('key','central','visible',(v_profile.role='admin' or v_profile.can_access_supplements or v_profile.can_access_fitness or v_profile.can_access_marketing),'href','/central','badge',v_central_unread),
      jsonb_build_object('key','supplements','visible',(v_profile.role='admin' or v_profile.can_access_supplements),'href','/suplementos'),
      jsonb_build_object('key','fitness','visible',(v_profile.role='admin' or v_profile.can_access_fitness),'href','/fitness'),
      jsonb_build_object('key','bank','visible',(v_profile.role='admin' or v_profile.can_access_bank),'href','/bank'),
      jsonb_build_object('key','marketing','visible',(v_profile.role='admin' or v_profile.can_access_marketing),'href','/marketing'),
      jsonb_build_object('key','partner','visible',(v_profile.role='partner' and public.current_partner_id() is not null),'href','/parceiro')
    ),
    'central',jsonb_build_object('unread',v_central_unread,'open_conversations',v_central_open),
    'supplements',v_supp,
    'fitness',v_fit,
    'bank',v_bank,
    'marketing',v_marketing,
    'partner',v_partner
  );
end;
$$;

create or replace function public.app_bootstrap_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_flags jsonb;
  v_home jsonb;
  v_partner jsonb := null;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if not found then raise exception 'Perfil ativo não encontrado'; end if;

  select coalesce(jsonb_object_agg(key,enabled),'{}'::jsonb) into v_flags from public.ui_feature_flags;
  v_home := public.company_home_snapshot();
  if v_profile.role='partner' and public.current_partner_id() is not null then
    v_partner := public.partner_portal_dashboard(null,null);
  end if;

  return jsonb_build_object(
    'profile',jsonb_build_object(
      'id',v_profile.id,
      'name',v_profile.full_name,
      'email',v_profile.email,
      'username',v_profile.username,
      'role',v_profile.role::text,
      'can_access_supplements',v_profile.can_access_supplements,
      'can_write_supplements',v_profile.can_write_supplements,
      'can_access_fitness',v_profile.can_access_fitness,
      'can_write_fitness',v_profile.can_write_fitness,
      'can_access_bank',v_profile.can_access_bank,
      'can_write_bank',v_profile.can_write_bank,
      'can_access_marketing',v_profile.can_access_marketing,
      'can_write_marketing',v_profile.can_write_marketing,
      'can_manage_users',v_profile.can_manage_users
    ),
    'feature_flags',v_flags,
    'home',v_home,
    'partner_portal',v_partner
  );
end;
$$;
