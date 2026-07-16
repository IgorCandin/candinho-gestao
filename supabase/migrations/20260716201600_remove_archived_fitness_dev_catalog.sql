-- Development-only generated Fitness products were archived before the official import.
-- Remove only inactive catalog rows that have no operational references.
delete from public.fitness_products p
where not p.active
  and not exists (
    select 1 from public.fitness_variants v
    join public.fitness_sale_items si on si.variant_id=v.id
    where v.product_id=p.id
  )
  and not exists (
    select 1 from public.fitness_variants v
    join public.fitness_purchase_order_items poi on poi.variant_id=v.id
    where v.product_id=p.id
  )
  and not exists (
    select 1 from public.fitness_variants v
    join public.fitness_inventory_movements im on im.variant_id=v.id
    where v.product_id=p.id
  );
