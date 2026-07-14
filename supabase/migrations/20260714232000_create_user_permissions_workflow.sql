-- Etapa 9: usuários, operações e permissões dinâmicas ------------------------

alter table public.profiles
  add column if not exists email text,
  add column if not exists can_access_supplements boolean not null default false,
  add column if not exists can_access_fitness boolean not null default false,
  add column if not exists can_manage_users boolean not null default false;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and (p.email is distinct from lower(u.email));

-- Perfis iniciais aprovados para a Candinho Company.
update public.profiles p
set full_name = 'Igor Candinho',
    role = 'admin',
    active = true,
    can_access_supplements = true,
    can_access_fitness = true,
    can_manage_users = true
from auth.users u
where u.id = p.id
  and lower(u.email) = 'igorcandinho2002@hotmail.com';

update public.profiles p
set full_name = 'Giulia',
    role = 'operator',
    active = true,
    can_access_supplements = false,
    can_access_fitness = true,
    can_manage_users = false
from auth.users u
where u.id = p.id
  and lower(u.email) = 'giuliafaria1@gmail.com';

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, role, active,
    can_access_supplements, can_access_fitness, can_manage_users
  ) values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'partner',
    true,
    false,
    false,
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role
    from public.profiles
    where id = auth.uid() and active
  ), 'partner'::public.app_role);
$$;

create or replace function public.can_access_operation(p_operation text)
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
      and (
        p.role = 'admin'
        or (lower(p_operation) = 'supplements' and p.can_access_supplements)
        or (lower(p_operation) = 'fitness' and p.can_access_fitness)
      )
  );
$$;

create or replace function public.can_manage_users()
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
      and p.role = 'admin'
      and p.can_manage_users
  );
$$;

-- Toda a estrutura atual de escrita pertence à operação Suplementos.
create or replace function public.can_write()
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
      and p.can_access_supplements
      and p.role in ('admin', 'operator')
  );
$$;

create or replace function public.get_my_access()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_access_fitness boolean,
  can_manage_users boolean,
  can_write_supplements boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_access_fitness,
    p.can_manage_users,
    (p.active and p.can_access_supplements and p.role in ('admin', 'operator'))
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

create or replace function public.list_user_permissions()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  can_access_supplements boolean,
  can_access_fitness boolean,
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
    coalesce(p.email, lower(u.email)),
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    p.role::text,
    p.active,
    p.can_access_supplements,
    p.can_access_fitness,
    p.can_manage_users,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by (p.role = 'admin') desc, p.full_name, u.email;
end;
$$;

create or replace function public.update_user_permissions(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_active boolean,
  p_can_access_supplements boolean,
  p_can_access_fitness boolean,
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
  if not public.can_manage_users() then
    raise exception 'Usuário sem permissão para alterar acessos';
  end if;

  if p_role not in ('admin', 'operator', 'partner') then
    raise exception 'Perfil de acesso inválido';
  end if;
  v_new_role := p_role::public.app_role;

  select * into v_current
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  if p_user_id = auth.uid() and (
    not coalesce(p_active, false)
    or v_new_role <> 'admin'
    or not coalesce(p_can_manage_users, false)
    or not coalesce(p_can_access_supplements, false)
  ) then
    raise exception 'O administrador atual não pode remover o próprio acesso principal';
  end if;

  if v_current.role = 'admin'
     and (v_new_role <> 'admin' or not coalesce(p_active, false))
     and not exists (
       select 1 from public.profiles p
       where p.id <> p_user_id and p.active and p.role = 'admin' and p.can_manage_users
     ) then
    raise exception 'É necessário manter pelo menos um administrador ativo';
  end if;

  update public.profiles
  set full_name = nullif(btrim(p_full_name), ''),
      role = v_new_role,
      active = coalesce(p_active, false),
      can_access_supplements = case when v_new_role = 'admin' then true else coalesce(p_can_access_supplements, false) end,
      can_access_fitness = case when v_new_role = 'admin' then true else coalesce(p_can_access_fitness, false) end,
      can_manage_users = case when v_new_role = 'admin' then coalesce(p_can_manage_users, false) else false end,
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('profile', p_user_id, 'permissions_updated', jsonb_build_object(
    'role', v_new_role,
    'active', p_active,
    'can_access_supplements', p_can_access_supplements,
    'can_access_fitness', p_can_access_fitness,
    'can_manage_users', p_can_manage_users
  ));

  return p_user_id;
end;
$$;

-- Perfis: cada usuário vê o próprio acesso; administradores veem todos.
alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.can_manage_users());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
for all to authenticated
using (public.can_manage_users())
with check (public.can_manage_users());

-- Todas as tabelas da operação Suplementos exigem acesso à operação.
do $$
declare
  t text;
begin
  foreach t in array array[
    'locations','products','customers','sales','sale_items','stock_balances',
    'inventory_movements','inventory_history','audit_events','deliveries','payments',
    'partners','partner_movements','partnership_settlements','suppliers','supplier_orders',
    'purchase_orders','purchase_order_items','purchase_receipts','stock_reservations',
    'sale_payment_entries','customer_interactions'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_read', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.can_access_operation(''supplements''))',
        t || '_read', t
      );
    end if;
  end loop;
end $$;

-- Views passam a respeitar as políticas das tabelas consultadas.
do $$
declare
  v record;
begin
  for v in select schemaname, viewname from pg_views where schemaname = 'public'
  loop
    begin
      execute format('alter view %I.%I set (security_invoker = true)', v.schemaname, v.viewname);
    exception when others then
      null;
    end;
  end loop;
end $$;

revoke all on function public.can_access_operation(text) from public, anon;
revoke all on function public.can_manage_users() from public, anon;
revoke all on function public.get_my_access() from public, anon;
revoke all on function public.list_user_permissions() from public, anon;
revoke all on function public.update_user_permissions(uuid,text,text,boolean,boolean,boolean,boolean) from public, anon;

grant execute on function public.can_access_operation(text) to authenticated, service_role;
grant execute on function public.can_manage_users() to authenticated, service_role;
grant execute on function public.get_my_access() to authenticated, service_role;
grant execute on function public.list_user_permissions() to authenticated, service_role;
grant execute on function public.update_user_permissions(uuid,text,text,boolean,boolean,boolean,boolean) to authenticated, service_role;
