create or replace function public.set_partner_portal_access(p_user_id uuid, p_partner_id uuid, p_active boolean default true)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_manage_users() then raise exception 'Acesso negado'; end if;
  if not exists (select 1 from public.profiles where id=p_user_id) then raise exception 'Usuário não encontrado'; end if;
  if not exists (select 1 from public.partners where id=p_partner_id) then raise exception 'Parceiro não encontrado'; end if;

  insert into public.partner_user_links(profile_id,partner_id,active,created_by)
  values(p_user_id,p_partner_id,coalesce(p_active,true),auth.uid())
  on conflict(profile_id) do update
    set partner_id=excluded.partner_id,active=excluded.active,updated_at=now();

  if coalesce(p_active,true) then
    update public.profiles
    set role='partner',
        can_access_supplements=false,
        can_write_supplements=false,
        can_access_fitness=false,
        can_write_fitness=false,
        can_access_bank=false,
        can_write_bank=false,
        can_access_marketing=false,
        can_write_marketing=false,
        can_manage_users=false,
        updated_at=now()
    where id=p_user_id;
  end if;
end;
$$;

create or replace function public.configure_generic_partner_profile()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_partner_id uuid;
  v_email text := lower(coalesce(new.email,''));
begin
  if v_email='cts@candinho.org' then
    update public.profiles
    set username='CTS',full_name='Pâmella Nunes',role='partner',active=true,
        can_access_supplements=false,can_write_supplements=false,
        can_access_fitness=false,can_write_fitness=false,
        can_access_bank=false,can_write_bank=false,
        can_access_marketing=false,can_write_marketing=false,
        can_manage_users=false,updated_at=now()
    where id=new.id;
    select id into v_partner_id from public.partners where name='C.T.S. Pâmella Nunes' limit 1;
  elsif v_email='itapharma@candinho.org' then
    update public.profiles
    set username='ITAPHARMA',full_name='Murillo Pereira',role='partner',active=true,
        can_access_supplements=false,can_write_supplements=false,
        can_access_fitness=false,can_write_fitness=false,
        can_access_bank=false,can_write_bank=false,
        can_access_marketing=false,can_write_marketing=false,
        can_manage_users=false,updated_at=now()
    where id=new.id;
    select id into v_partner_id from public.partners where name='Drogaria ItaPharma' limit 1;
  end if;

  if v_partner_id is not null then
    insert into public.partner_user_links(profile_id,partner_id,active,created_at,updated_at)
    values(new.id,v_partner_id,true,now(),now())
    on conflict(profile_id) do update set partner_id=excluded.partner_id,active=true,updated_at=now();
  end if;
  return new;
end;
$$;

revoke all on function public.configure_generic_partner_profile() from public, anon, authenticated;
