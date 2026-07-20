-- V32: centro gerencial de fornecedores e inteligencia de compras.
-- Somente leitura: preserva integralmente os fluxos de pedido e recebimento existentes.

create index if not exists purchase_orders_supplier_ordered_on_idx
  on public.purchase_orders (supplier_id, ordered_on desc);

create index if not exists purchase_order_items_product_order_idx
  on public.purchase_order_items (product_id, purchase_order_id);

create index if not exists purchase_receipts_received_on_idx
  on public.purchase_receipts (received_on desc, purchase_order_item_id);

create or replace view public.supplier_purchase_order_facts
with (security_invoker = true)
as
with receipt_by_item as (
  select
    pr.purchase_order_item_id,
    max(pr.received_on) as last_received_on,
    count(*)::integer as receipt_count,
    count(*) filter (
      where pr.unit_cost is distinct from poi.unit_cost
    )::integer as cost_divergent_receipt_count,
    coalesce(sum(
      abs(pr.unit_cost - poi.unit_cost) * pr.quantity_received
    ) filter (
      where pr.unit_cost is distinct from poi.unit_cost
    ), 0)::numeric(14,2) as absolute_cost_divergence
  from public.purchase_receipts pr
  join public.purchase_order_items poi
    on poi.id = pr.purchase_order_item_id
  group by pr.purchase_order_item_id
),
item_facts as (
  select
    poi.purchase_order_id,
    sum(poi.quantity_ordered)::integer as ordered_units,
    sum(poi.quantity_received)::integer as received_units,
    sum(poi.quantity_ordered * poi.unit_cost)::numeric(14,2) as order_value,
    max(rbi.last_received_on) as actual_received_on,
    coalesce(sum(rbi.receipt_count), 0)::integer as receipt_count,
    coalesce(sum(rbi.cost_divergent_receipt_count), 0)::integer
      as cost_divergent_receipt_count,
    coalesce(sum(rbi.absolute_cost_divergence), 0)::numeric(14,2)
      as absolute_cost_divergence
  from public.purchase_order_items poi
  left join receipt_by_item rbi
    on rbi.purchase_order_item_id = poi.id
  group by poi.purchase_order_id
)
select
  po.id,
  po.supplier_id,
  po.ordered_on,
  po.expected_on,
  po.status,
  coalesce(i.ordered_units, 0)::integer as ordered_units,
  coalesce(i.received_units, 0)::integer as received_units,
  greatest(
    coalesce(i.ordered_units, 0) - coalesce(i.received_units, 0),
    0
  )::integer as pending_units,
  coalesce(i.order_value, 0)::numeric(14,2) as order_value,
  i.actual_received_on,
  coalesce(i.receipt_count, 0)::integer as receipt_count,
  coalesce(i.cost_divergent_receipt_count, 0)::integer
    as cost_divergent_receipt_count,
  coalesce(i.absolute_cost_divergence, 0)::numeric(14,2)
    as absolute_cost_divergence,
  (
    coalesce(i.ordered_units, 0) > 0
    and coalesce(i.received_units, 0) >= coalesce(i.ordered_units, 0)
  ) as fully_received,
  case
    when po.status = 'received'
      then abs(coalesce(i.ordered_units, 0) - coalesce(i.received_units, 0))::integer
    else 0
  end as closed_quantity_divergence_units,
  case
    when po.expected_on is not null
      and i.actual_received_on is not null
      and coalesce(i.received_units, 0) >= coalesce(i.ordered_units, 0)
      then (i.actual_received_on - po.ordered_on)::integer
    else null
  end as actual_lead_days,
  case
    when po.expected_on is not null
      and i.actual_received_on is not null
      and coalesce(i.received_units, 0) >= coalesce(i.ordered_units, 0)
      then i.actual_received_on > po.expected_on
    else null
  end as was_late
from public.purchase_orders po
left join item_facts i on i.purchase_order_id = po.id;

create or replace view public.supplier_product_purchase_history
with (security_invoker = true)
as
select
  poi.id as purchase_order_item_id,
  po.id as purchase_order_id,
  po.supplier_id,
  s.name as supplier_name,
  poi.product_id,
  p.name as product_name,
  p.category,
  p.brand,
  po.ordered_on,
  po.expected_on,
  po.status,
  poi.quantity_ordered,
  poi.quantity_received,
  poi.unit_cost::numeric(12,2) as unit_cost,
  (poi.quantity_ordered * poi.unit_cost)::numeric(14,2) as line_total,
  max(pr.received_on) as last_received_on,
  count(pr.id)::integer as receipt_count,
  count(pr.id) filter (
    where pr.unit_cost is distinct from poi.unit_cost
  )::integer as cost_divergent_receipt_count,
  (
    po.status in ('received', 'partial')
    and poi.quantity_received > 0
  ) as has_paid_price_evidence
from public.purchase_order_items poi
join public.purchase_orders po on po.id = poi.purchase_order_id
join public.suppliers s on s.id = po.supplier_id
join public.products p on p.id = poi.product_id
left join public.purchase_receipts pr
  on pr.purchase_order_item_id = poi.id
where po.status <> 'cancelled'
group by
  poi.id,
  po.id,
  po.supplier_id,
  s.name,
  poi.product_id,
  p.name,
  p.category,
  p.brand,
  po.ordered_on,
  po.expected_on,
  po.status,
  poi.quantity_ordered,
  poi.quantity_received,
  poi.unit_cost;

create or replace view public.supplier_product_price_summary
with (security_invoker = true)
as
with pairs as (
  select distinct supplier_id, product_id
  from public.supplier_product_purchase_history
),
summary as (
  select
    pairs.supplier_id,
    latest.supplier_name,
    pairs.product_id,
    latest.product_name,
    latest.category,
    latest.brand,
    count(h.purchase_order_item_id)::integer as purchase_count,
    sum(h.quantity_ordered)::integer as purchased_units,
    max(h.ordered_on) as last_purchase_on,
    latest.unit_cost::numeric(12,2) as last_price_paid,
    previous.unit_cost::numeric(12,2) as previous_price_paid,
    min(h.unit_cost) filter (
      where h.has_paid_price_evidence
        and h.ordered_on >= current_date - 180
    )::numeric(12,2) as best_recent_price,
    avg(h.unit_cost) filter (
      where h.has_paid_price_evidence
        and h.ordered_on >= current_date - 180
    )::numeric(12,2) as average_recent_price
  from pairs
  join lateral (
    select x.*
    from public.supplier_product_purchase_history x
    where x.supplier_id = pairs.supplier_id
      and x.product_id = pairs.product_id
      and x.has_paid_price_evidence
    order by x.ordered_on desc, x.purchase_order_item_id desc
    limit 1
  ) latest on true
  left join lateral (
    select x.unit_cost
    from public.supplier_product_purchase_history x
    where x.supplier_id = pairs.supplier_id
      and x.product_id = pairs.product_id
      and x.has_paid_price_evidence
      and x.purchase_order_item_id <> latest.purchase_order_item_id
    order by x.ordered_on desc, x.purchase_order_item_id desc
    limit 1
  ) previous on true
  join public.supplier_product_purchase_history h
    on h.supplier_id = pairs.supplier_id
   and h.product_id = pairs.product_id
   and h.has_paid_price_evidence
  group by
    pairs.supplier_id,
    latest.supplier_name,
    pairs.product_id,
    latest.product_name,
    latest.category,
    latest.brand,
    latest.unit_cost,
    previous.unit_cost
)
select
  summary.*,
  case
    when previous_price_paid is null or previous_price_paid = 0 then null
    else round(
      ((last_price_paid - previous_price_paid) / previous_price_paid) * 100,
      1
    )
  end as last_price_change_pct,
  min(best_recent_price) over (
    partition by product_id
  )::numeric(12,2) as market_best_recent_price,
  case
    when best_recent_price is null then null
    else dense_rank() over (
      partition by product_id
      order by best_recent_price asc nulls last
    )::integer
  end as recent_price_rank,
  count(*) over (partition by product_id)::integer as compared_supplier_count
from summary;

create or replace view public.supplier_management_overview
with (security_invoker = true)
as
with order_metrics as (
  select
    supplier_id,
    count(*) filter (where status <> 'cancelled')::integer as order_count,
    count(*) filter (where status in ('pending', 'partial'))::integer as open_order_count,
    count(*) filter (where status = 'received')::integer as received_order_count,
    coalesce(sum(pending_units) filter (
      where status in ('pending', 'partial')
    ), 0)::integer as incoming_units,
    coalesce(sum(order_value) filter (
      where status <> 'cancelled'
    ), 0)::numeric(14,2) as historical_purchase_value,
    coalesce(sum(order_value) filter (
      where status <> 'cancelled'
        and ordered_on >= current_date - 365
    ), 0)::numeric(14,2) as purchase_value_365d,
    max(ordered_on) filter (where status <> 'cancelled') as last_order_on,
    max(actual_received_on) as last_receipt_on,
    count(*) filter (
      where expected_on is not null
        and actual_received_on is not null
        and fully_received
    )::integer as promised_delivery_sample,
    count(*) filter (where was_late is true)::integer as late_order_count,
    avg(actual_lead_days) filter (
      where actual_lead_days is not null
    )::numeric(8,1) as average_actual_lead_days,
    coalesce(sum(receipt_count), 0)::integer as receipt_count,
    coalesce(sum(cost_divergent_receipt_count), 0)::integer
      as cost_divergent_receipt_count,
    coalesce(sum(closed_quantity_divergence_units), 0)::integer
      as closed_quantity_divergence_units,
    count(*) filter (
      where closed_quantity_divergence_units > 0
         or cost_divergent_receipt_count > 0
    )::integer as divergent_receipt_order_count
  from public.supplier_purchase_order_facts
  group by supplier_id
),
planning as (
  select
    supplier_id,
    count(*) filter (
      where suggested_order_quantity > 0
    )::integer as suggested_product_count,
    coalesce(sum(suggested_order_quantity), 0)::integer as suggested_units,
    coalesce(sum(estimated_order_cost), 0)::numeric(14,2)
      as suggested_order_cost
  from public.purchase_planning_overview
  where supplier_id is not null
  group by supplier_id
),
defaults as (
  select
    default_supplier_id as supplier_id,
    count(*)::integer as default_product_count
  from public.products
  where active
    and default_supplier_id is not null
  group by default_supplier_id
),
price_metrics as (
  select
    supplier_id,
    count(*)::integer as priced_product_count,
    count(*) filter (where last_price_change_pct > 0)::integer
      as products_with_price_increase,
    count(*) filter (where recent_price_rank = 1)::integer
      as products_at_best_recent_price
  from public.supplier_product_price_summary
  group by supplier_id
),
base as (
  select
    s.id,
    s.name,
    s.active,
    s.notes,
    s.lead_time_days,
    s.target_cover_days,
    s.minimum_order_amount,
    s.free_shipping_threshold,
    s.payment_terms,
    s.freight_notes,
    coalesce(o.order_count, 0)::integer as order_count,
    coalesce(o.open_order_count, 0)::integer as open_order_count,
    coalesce(o.received_order_count, 0)::integer as received_order_count,
    coalesce(o.incoming_units, 0)::integer as incoming_units,
    coalesce(o.historical_purchase_value, 0)::numeric(14,2)
      as historical_purchase_value,
    coalesce(o.purchase_value_365d, 0)::numeric(14,2) as purchase_value_365d,
    o.last_order_on,
    o.last_receipt_on,
    coalesce(o.promised_delivery_sample, 0)::integer as promised_delivery_sample,
    coalesce(o.late_order_count, 0)::integer as late_order_count,
    o.average_actual_lead_days,
    case
      when coalesce(o.promised_delivery_sample, 0) = 0 then null
      else round(
        (o.late_order_count::numeric / o.promised_delivery_sample) * 100,
        1
      )
    end as late_rate_pct,
    coalesce(o.receipt_count, 0)::integer as receipt_count,
    coalesce(o.cost_divergent_receipt_count, 0)::integer
      as cost_divergent_receipt_count,
    coalesce(o.closed_quantity_divergence_units, 0)::integer
      as closed_quantity_divergence_units,
    coalesce(o.divergent_receipt_order_count, 0)::integer
      as divergent_receipt_order_count,
    coalesce(d.default_product_count, 0)::integer as default_product_count,
    coalesce(pm.priced_product_count, 0)::integer as priced_product_count,
    coalesce(pm.products_with_price_increase, 0)::integer
      as products_with_price_increase,
    coalesce(pm.products_at_best_recent_price, 0)::integer
      as products_at_best_recent_price,
    coalesce(pl.suggested_product_count, 0)::integer as suggested_product_count,
    coalesce(pl.suggested_units, 0)::integer as suggested_units,
    coalesce(pl.suggested_order_cost, 0)::numeric(14,2) as suggested_order_cost
  from public.suppliers s
  left join order_metrics o on o.supplier_id = s.id
  left join planning pl on pl.supplier_id = s.id
  left join defaults d on d.supplier_id = s.id
  left join price_metrics pm on pm.supplier_id = s.id
)
select
  base.*,
  case
    when sum(purchase_value_365d) over () = 0 then 0
    else round(
      (purchase_value_365d / sum(purchase_value_365d) over ()) * 100,
      1
    )
  end as purchase_concentration_pct,
  greatest(minimum_order_amount - suggested_order_cost, 0)::numeric(14,2)
    as gap_to_minimum_order,
  greatest(free_shipping_threshold - suggested_order_cost, 0)::numeric(14,2)
    as gap_to_free_shipping,
  case
    when promised_delivery_sample = 0 then null
    else greatest(
      0,
      round(
        100
        - (coalesce(late_rate_pct, 0) * 0.55)
        - (
          case
            when receipt_count = 0 then 0
            else (cost_divergent_receipt_count::numeric / receipt_count) * 20
          end
        )
        - (
          case
            when received_order_count = 0 then 0
            else (divergent_receipt_order_count::numeric / received_order_count) * 25
          end
        ),
        0
      )
    )::integer
  end as operational_score
from base;

comment on view public.supplier_purchase_order_facts is
  'V32. Fatos por pedido para prazo e divergencias, sem inferir entrega real de pedidos legados.';
comment on view public.supplier_product_purchase_history is
  'V32. Historico real de precos registrados por produto e fornecedor.';
comment on view public.supplier_product_price_summary is
  'V32. Ultimo preco pago, melhor preco recente e comparacao entre fornecedores.';
comment on view public.supplier_management_overview is
  'V32. Painel gerencial de fornecedores, concentracao, score e lacunas de pedido/frete.';

revoke all on public.supplier_purchase_order_facts from public, anon;
revoke all on public.supplier_product_purchase_history from public, anon;
revoke all on public.supplier_product_price_summary from public, anon;
revoke all on public.supplier_management_overview from public, anon;

grant select on public.supplier_purchase_order_facts to authenticated, service_role;
grant select on public.supplier_product_purchase_history to authenticated, service_role;
grant select on public.supplier_product_price_summary to authenticated, service_role;
grant select on public.supplier_management_overview to authenticated, service_role;
