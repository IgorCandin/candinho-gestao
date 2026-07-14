-- Corrige o backfill dos itens dos 74 pedidos legados.
insert into public.purchase_order_items(
  purchase_order_id, product_id, quantity_ordered, quantity_received,
  unit_cost, notes, created_at, updated_at
)
select
  po.id,
  so.product_id,
  greatest(round(so.quantity)::integer, 1),
  case when coalesce(so.stock_updated, false) then greatest(round(so.quantity)::integer, 1) else 0 end,
  coalesce(so.unit_cost, 0),
  so.notes,
  so.created_at,
  so.created_at
from public.purchase_orders po
join public.supplier_orders so on so.id = po.legacy_supplier_order_id
where not exists (select 1 from public.purchase_order_items poi where poi.purchase_order_id = po.id);
