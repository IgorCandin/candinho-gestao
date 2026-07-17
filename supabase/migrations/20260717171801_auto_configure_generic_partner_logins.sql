create or replace function public.configure_generic_partner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_email text := lower(coalesce(new.email,''));
begin
  if v_email = 'cts@candinho.org' then
    update public.profiles
    set username = 'CTS',
        full_name = 'Pâmella Nunes',
        role = 'partner',
        active = true,
        can_access_supplements = false,
        can_write_supplements = false,
        can_access_fitness = false,
        can_write_fitness = false,
        can_access_bank = false,
        can_write_bank = false,
        can_manage_users = false,
        updated_at = now()
    where id = new.id;

    select id into v_partner_id
    from public.partners
    where name = 'C.T.S. Pâmella Nunes'
    limit 1;

    if v_partner_id is not null then
      insert into public.partner_user_links(profile_id, partner_id, active, created_at, updated_at)
      values (new.id, v_partner_id, true, now(), now())
      on conflict (profile_id) do update
        set partner_id = excluded.partner_id,
            active = true,
            updated_at = now();
    end if;
  elsif v_email = 'itapharma@candinho.org' then
    update public.profiles
    set username = 'ITAPHARMA',
        full_name = 'Murillo Pereira',
        role = 'partner',
        active = true,
        can_access_supplements = false,
        can_write_supplements = false,
        can_access_fitness = false,
        can_write_fitness = false,
        can_access_bank = false,
        can_write_bank = false,
        can_manage_users = false,
        updated_at = now()
    where id = new.id;

    select id into v_partner_id
    from public.partners
    where name = 'Drogaria ItaPharma'
    limit 1;

    if v_partner_id is not null then
      insert into public.partner_user_links(profile_id, partner_id, active, created_at, updated_at)
      values (new.id, v_partner_id, true, now(), now())
      on conflict (profile_id) do update
        set partner_id = excluded.partner_id,
            active = true,
            updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_generic_partner_profile_created on public.profiles;
create trigger on_generic_partner_profile_created
after insert on public.profiles
for each row
when (lower(coalesce(new.email,'')) in ('cts@candinho.org','itapharma@candinho.org'))
execute function public.configure_generic_partner_profile();
