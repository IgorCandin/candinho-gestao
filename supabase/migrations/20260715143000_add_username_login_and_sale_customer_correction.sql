-- Etapa 14: login por usuário e correção segura de cliente da venda --------

alter table public.profiles
  add column if not exists username text;

update public.profiles
set username = 'Candinho', updated_at = now()
where lower(email) = 'igorcandinho2002@hotmail.com'
  and coalesce(nullif(btrim(username), ''), '') = '';

update public.profiles
set username = 'Giulia', updated_at = now()
where lower(email) = 'giuliafaria1@gmail.com'
  and coalesce(nullif(btrim(username), ''), '') = '';

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create or replace function public.resolve_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.active
    and p.email is not null
    and lower(btrim(p.username)) = lower(btrim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated, service_role;

create or replace function public.change_sale_customer(
  p_sale_id uuid,
  p_customer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_old_customer public.customers%rowtype;
  v_new_customer public.customers%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para corrigir vendas';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
    and record_type = 'sale'
  for update;

  if not found then
    raise exception 'Venda não encontrada';
  end if;

  select * into v_new_customer
  from public.customers
  where id = p_customer_id
    and active;

  if not found then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  if v_sale.customer_id is not null then
    select * into v_old_customer
    from public.customers
    where id = v_sale.customer_id;
  end if;

  if v_sale.customer_id = p_customer_id then
    return p_sale_id;
  end if;

  -- A correção muda apenas o vínculo do cliente. Valores, itens, estoque,
  -- parceria, pagamento, entrega e dados históricos da venda permanecem intactos.
  update public.sales
  set customer_id = p_customer_id,
      updated_at = now()
  where id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'sale',
    p_sale_id,
    'customer_changed',
    jsonb_build_object(
      'old_customer_id', v_sale.customer_id,
      'old_customer_name', v_old_customer.name,
      'new_customer_id', v_new_customer.id,
      'new_customer_name', v_new_customer.name,
      'payment_status', v_sale.payment_status,
      'delivery_status', v_sale.delivery_status,
      'general_status', v_sale.general_status
    )
  );

  return p_sale_id;
end;
$$;

revoke all on function public.change_sale_customer(uuid, uuid) from public, anon;
grant execute on function public.change_sale_customer(uuid, uuid) to authenticated, service_role;
