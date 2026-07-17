-- Granular operation permissions for Administrator, Collaborator and Sales profiles.
alter type public.app_role add value if not exists 'sales';

alter table public.profiles
  add column if not exists can_write_supplements boolean not null default false,
  add column if not exists can_write_fitness boolean not null default false;

update public.profiles
set can_write_supplements = true,
    can_write_fitness = true
where role = 'admin';

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active
      and p.can_access_supplements
      and (p.role = 'admin' or p.can_write_supplements)
  );
$$;

create or replace function public.can_write_fitness()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active
      and p.can_access_fitness
      and (p.role = 'admin' or p.can_write_fitness)
  );
$$;

create or replace function public.get_my_access()
returns table(
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_access_fitness boolean,
  can_access_bank boolean,
  can_manage_users boolean,
  can_write_supplements boolean,
  can_write_fitness boolean,
  can_write_bank boolean
)
language sql
stable
security definer
set search_path to 'public','auth'
as $$
  select
    p.id,
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_access_fitness,
    p.can_access_bank,
    p.can_manage_users,
    (p.active and p.can_access_supplements and (p.role='admin' or p.can_write_supplements)),
    (p.active and p.can_access_fitness and (p.role='admin' or p.can_write_fitness)),
    (p.active and p.can_access_bank and (p.role='admin' or p.can_write_bank))
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

drop function if exists public.list_user_permissions();
create function public.list_user_permissions()
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
  can_manage_users boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $$
begin
  if not public.can_manage_users() then
    raise exception 'Usuário sem permissão para visualizar usuários';
  end if;
  return query
  select
    p.id,
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_write_supplements,
    p.can_access_fitness,
    p.can_write_fitness,
    p.can_access_bank,
    p.can_write_bank,
    p.can_manage_users,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by (p.role='admin') desc, p.full_name, u.email;
end;
$$;

revoke execute on function public.list_user_permissions() from public, anon;
grant execute on function public.list_user_permissions() to authenticated;

create or replace function public.update_user_permissions(
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
  p_can_manage_users boolean
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
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
  update public.profiles
  set full_name=nullif(btrim(p_full_name),''),
      role=v_new_role,
      active=coalesce(p_active,false),
      can_access_supplements=case when v_new_role='admin' then true else coalesce(p_can_access_supplements,false) end,
      can_write_supplements=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_supplements,false) end,
      can_access_fitness=case when v_new_role='admin' then true else coalesce(p_can_access_fitness,false) end,
      can_write_fitness=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_fitness,false) end,
      can_access_bank=case when v_new_role='admin' then true else coalesce(p_can_access_bank,false) end,
      can_write_bank=case when v_new_role='admin' then true when v_new_role in ('sales','partner') then false else coalesce(p_can_write_bank,false) end,
      can_manage_users=case when v_new_role='admin' then coalesce(p_can_manage_users,false) else false end,
      updated_at=now()
  where id=p_user_id;
  return p_user_id;
end;
$$;

revoke execute on function public.update_user_permissions(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.update_user_permissions(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
