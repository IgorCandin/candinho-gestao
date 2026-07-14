-- Finaliza o fluxo operacional da página de pedidos pendentes.
-- Mantém a tabela sales como fonte operacional e sincroniza os registros
-- históricos de payments/deliveries quando eles já existem.

create or replace function public.mark_sale_received(
  p_sale_id uuid,
  p_received_on date,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_paid_at timestamptz;
  v_allowed_methods constant text[] := array[
    'Pix',
    'Dinheiro',
    'Cartão',
    'Link de Pagamento',
    'Pagamento fracionado'
  ];
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar pagamentos';
  end if;

  if p_received_on is null then
    raise exception 'Informe a data do recebimento';
  end if;

  if p_payment_method is null or not (p_payment_method = any(v_allowed_methods)) then
    raise exception 'Forma de pagamento inválida';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found or v_sale.record_type <> 'sale' then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    raise exception 'Venda cancelada não pode ser recebida';
  end if;

  v_paid_at := (p_received_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  update public.sales
  set payment_status = 'received',
      paid_at = v_paid_at,
      payment_method = p_payment_method,
      general_status = case
        when delivery_status = 'delivered' then 'finalized'::public.sale_general_status
        else 'active'::public.sale_general_status
      end,
      updated_at = now()
  where id = p_sale_id;

  update public.payments
  set status = 'Recebido',
      amount = v_sale.total_amount,
      payment_method = p_payment_method,
      paid_at = v_paid_at
  where sale_id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'sale',
    p_sale_id,
    'payment_received',
    jsonb_build_object(
      'received_on', p_received_on,
      'payment_method', p_payment_method,
      'previous_payment_status', v_sale.payment_status
    )
  );

  return p_sale_id;
end;
$$;

create or replace function public.mark_sale_delivered(
  p_sale_id uuid,
  p_delivered_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_delivered_at timestamptz;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para alterar entregas';
  end if;

  if p_delivered_on is null then
    raise exception 'Informe a data da entrega';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found or v_sale.record_type <> 'sale' then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.general_status = 'cancelled' then
    raise exception 'Venda cancelada não pode ser entregue';
  end if;

  v_delivered_at := (p_delivered_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';

  update public.sales
  set delivery_status = 'delivered',
      delivered_at = v_delivered_at,
      general_status = case
        when payment_status = 'received' then 'finalized'::public.sale_general_status
        else 'active'::public.sale_general_status
      end,
      updated_at = now()
  where id = p_sale_id;

  update public.deliveries
  set status = 'Entregue',
      delivered_at = v_delivered_at
  where sale_id = p_sale_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values (
    'sale',
    p_sale_id,
    'delivered',
    jsonb_build_object(
      'delivered_on', p_delivered_on,
      'previous_delivery_status', v_sale.delivery_status
    )
  );

  return p_sale_id;
end;
$$;

revoke all on function public.mark_sale_received(uuid, date, text) from public, anon;
revoke all on function public.mark_sale_delivered(uuid, date) from public, anon;
grant execute on function public.mark_sale_received(uuid, date, text) to authenticated, service_role;
grant execute on function public.mark_sale_delivered(uuid, date) to authenticated, service_role;

create or replace view public.pending_orders
with (security_invoker = true)
as
select
  s.id,
  s.customer_id,
  c.name as customer_name,
  s.location_id,
  l.code as location_code,
  coalesce(s.delivered_at, s.quoted_at) as business_at,
  (coalesce(s.delivered_at, s.quoted_at) at time zone 'UTC')::date as business_date,
  s.quoted_at as order_at,
  s.delivered_at,
  s.payment_status,
  s.delivery_status,
  s.payment_method,
  s.payment_condition,
  s.total_amount,
  s.total_profit,
  items.product_summary,
  items.total_items,
  l.name as location_name,
  s.paid_at,
  s.general_status,
  items.primary_product_id,
  items.primary_image_url
from public.sales s
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = s.location_id
left join lateral (
  select
    string_agg(p.name || ' ×' || si.quantity::text, ', ' order by p.name) as product_summary,
    coalesce(sum(si.quantity), 0)::integer as total_items,
    (array_agg(p.id order by si.id))[1] as primary_product_id,
    (array_agg(p.image_url order by si.id) filter (where p.image_url is not null))[1] as primary_image_url
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = s.id
) items on true
where s.record_type = 'sale'
  and s.general_status <> 'cancelled'
  and (
    s.payment_status = 'receivable'
    or s.delivery_status = 'to_deliver'
  );

revoke all on public.pending_orders from public, anon;
grant select on public.pending_orders to authenticated, service_role;
