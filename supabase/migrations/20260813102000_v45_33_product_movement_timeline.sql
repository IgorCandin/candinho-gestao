create or replace function public.product_movement_timeline_v1(
  p_product_id uuid,
  p_limit integer default 150
)
returns table(
  movement_id text,
  occurred_at timestamptz,
  movement_type text,
  movement_label text,
  quantity_delta integer,
  location_code text,
  location_name text,
  flavor_name text,
  sale_id uuid,
  customer_name text,
  outflow_id uuid,
  outflow_reason text,
  counterpart_name text,
  notes text,
  historical_correction boolean
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  return query
  with movement_base as (
    select
      m.id,
      m.created_at,
      m.movement_type::text as base_type,
      m.quantity_delta,
      l.code as loc_code,
      l.name as loc_name,
      pf.name as flavor,
      m.sale_id,
      c.name as customer,
      m.notes as movement_notes,
      direct_outflow.id as direct_outflow_id,
      direct_outflow.reason_code as direct_reason,
      direct_outflow.destination as direct_destination,
      historical_outflow.id as historical_outflow_id,
      historical_outflow.reason_code as historical_reason,
      historical_outflow.destination as historical_destination
    from public.inventory_movements m
    left join public.locations l on l.id=m.location_id
    left join public.product_flavors pf on pf.id=m.flavor_id
    left join public.sales s on s.id=m.sale_id
    left join public.customers c on c.id=s.customer_id
    left join lateral (
      select
        o.id,
        o.reason_code,
        coalesce(p.name,o.destination_name) as destination
      from public.commercial_outflow_items oi
      join public.commercial_outflows o on o.id=oi.outflow_id
      left join public.partners p on p.id=o.partner_id
      where oi.inventory_movement_id=m.id
      order by o.created_at desc
      limit 1
    ) direct_outflow on true
    left join lateral (
      select
        o.id,
        o.reason_code,
        coalesce(p.name,o.destination_name) as destination
      from public.commercial_outflows o
      left join public.partners p on p.id=o.partner_id
      where o.source_sale_id=m.sale_id
        and o.source_sale_id is not null
      order by o.created_at desc
      limit 1
    ) historical_outflow on true
    where m.product_id=p_product_id
  )
  select
    b.id::text as movement_id,
    b.created_at as occurred_at,
    b.base_type as movement_type,
    case coalesce(b.direct_reason,b.historical_reason)
      when 'partnership_activation' then
        case when b.historical_outflow_id is not null
          then 'Bonificação de parceria'
          else 'Ação de parceria'
        end
      when 'raffle_prize' then 'Premiação / sorteio'
      when 'sample' then 'Amostra'
      when 'marketing_action' then 'Ação de marketing'
      when 'influencer' then 'Influenciador'
      when 'donation' then 'Doação'
      when 'internal_use' then 'Uso interno'
      when 'loss_damage' then 'Perda / avaria'
      when 'other' then 'Saída não-venda'
      else case b.base_type
        when 'opening' then 'Saldo inicial'
        when 'purchase' then 'Entrada de compra'
        when 'sale' then 'Venda'
        when 'cancellation' then 'Cancelamento de venda'
        when 'adjustment' then 'Ajuste de estoque'
        when 'transfer_out' then 'Transferência · saída'
        when 'transfer_in' then 'Transferência · entrada'
        when 'commercial_outflow' then 'Saída não-venda'
        when 'commercial_outflow_reversal' then 'Estorno de saída'
        else initcap(replace(b.base_type,'_',' '))
      end
    end as movement_label,
    b.quantity_delta,
    b.loc_code as location_code,
    b.loc_name as location_name,
    b.flavor as flavor_name,
    b.sale_id,
    b.customer as customer_name,
    coalesce(b.direct_outflow_id,b.historical_outflow_id) as outflow_id,
    coalesce(b.direct_reason,b.historical_reason) as outflow_reason,
    coalesce(
      b.direct_destination,
      b.historical_destination,
      b.customer
    ) as counterpart_name,
    b.movement_notes as notes,
    (b.historical_outflow_id is not null) as historical_correction
  from movement_base b
  order by b.created_at desc,b.id desc
  limit greatest(1,least(coalesce(p_limit,150),500));
end;
$$;

revoke all
on function public.product_movement_timeline_v1(uuid,integer)
from public,anon;

grant execute
on function public.product_movement_timeline_v1(uuid,integer)
to authenticated,service_role;
