alter table public.purchase_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_source text,
  add column if not exists cancellation_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_orders_cancellation_source_check'
      and conrelid = 'public.purchase_orders'::regclass
  ) then
    alter table public.purchase_orders
      add constraint purchase_orders_cancellation_source_check
      check (
        cancellation_source is null
        or cancellation_source in ('supplier', 'company', 'registration_error')
      );
  end if;
end;
$$;

create or replace function public.cancel_purchase_order_v2(
  p_order_id uuid,
  p_source text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if (select auth.uid()) is null or not public.can_write() then
    raise exception 'Usuário sem permissão para cancelar pedidos';
  end if;

  if p_source not in ('supplier', 'company', 'registration_error') then
    raise exception 'Origem do cancelamento inválida';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'Informe o motivo do cancelamento';
  end if;

  select po.status
    into v_status
  from public.purchase_orders po
  where po.id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido de fornecedor não encontrado';
  end if;

  if v_status = 'received' then
    raise exception 'Pedido totalmente recebido não pode ser cancelado';
  end if;

  if v_status = 'cancelled' then
    return p_order_id;
  end if;

  update public.purchase_orders
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = (select auth.uid()),
      cancellation_source = p_source,
      cancellation_reason = btrim(p_reason),
      updated_at = now()
  where id = p_order_id;

  return p_order_id;
end;
$$;

revoke all on function public.cancel_purchase_order_v2(uuid, text, text)
  from public, anon;
grant execute on function public.cancel_purchase_order_v2(uuid, text, text)
  to authenticated, service_role;
