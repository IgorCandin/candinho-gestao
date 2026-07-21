begin;

create index if not exists fitness_inventory_movements_created_at_idx
  on public.fitness_inventory_movements(created_at desc);

create index if not exists fitness_inventory_movements_variant_created_idx
  on public.fitness_inventory_movements(variant_id, created_at desc);

create index if not exists fitness_purchase_orders_ordered_created_idx
  on public.fitness_purchase_orders(ordered_on desc, created_at desc);

create index if not exists fitness_purchase_orders_status_ordered_idx
  on public.fitness_purchase_orders(status, ordered_on desc);

create index if not exists inventory_history_product_occurred_idx
  on public.inventory_history(product_id, occurred_at desc);

create index if not exists central_messages_sent_at_idx
  on public.central_messages(sent_at desc);

create index if not exists central_webhook_events_created_at_idx
  on public.central_webhook_events(created_at desc);

create or replace function public.erp_scale_health_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'generated_at', now(),
    'sales', (select count(*) from public.sales),
    'sale_items', (select count(*) from public.sale_items),
    'customers', (select count(*) from public.customers),
    'inventory_movements', (select count(*) from public.inventory_movements),
    'inventory_history', (select count(*) from public.inventory_history),
    'fitness_inventory_movements', (select count(*) from public.fitness_inventory_movements),
    'fitness_purchase_orders', (select count(*) from public.fitness_purchase_orders),
    'fitness_purchase_order_items', (select count(*) from public.fitness_purchase_order_items),
    'central_messages', (select count(*) from public.central_messages),
    'central_webhook_events', (select count(*) from public.central_webhook_events),
    'audit_events', (select count(*) from public.audit_events)
  );
$function$;

revoke all
on function public.erp_scale_health_snapshot()
from anon, public;

grant execute
on function public.erp_scale_health_snapshot()
to authenticated, service_role;

commit;
