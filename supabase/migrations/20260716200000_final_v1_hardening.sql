-- Candinho Company V1 final hardening.

alter view public.product_catalog_commercial_sort set (security_invoker = true);

drop policy if exists sales_quotes_read on public.sales_quotes;
create policy sales_quotes_read on public.sales_quotes
for select to authenticated
using (public.can_access_operation('supplements'));

drop policy if exists sales_quote_items_read on public.sales_quote_items;
create policy sales_quote_items_read on public.sales_quote_items
for select to authenticated
using (public.can_access_operation('supplements'));

create index if not exists fitness_sale_items_sale_id_idx on public.fitness_sale_items(sale_id);
create index if not exists fitness_sale_items_variant_id_idx on public.fitness_sale_items(variant_id);
create index if not exists fitness_sales_customer_id_idx on public.fitness_sales(customer_id);
create index if not exists fitness_purchase_orders_supplier_id_idx on public.fitness_purchase_orders(supplier_id);
create index if not exists fitness_purchase_order_items_order_id_idx on public.fitness_purchase_order_items(purchase_order_id);
create index if not exists fitness_purchase_order_items_variant_id_idx on public.fitness_purchase_order_items(variant_id);
create index if not exists fitness_inventory_movements_variant_id_idx on public.fitness_inventory_movements(variant_id);
create index if not exists fitness_inventory_movements_sale_id_idx on public.fitness_inventory_movements(sale_id);
create index if not exists fitness_inventory_movements_purchase_item_id_idx on public.fitness_inventory_movements(purchase_order_item_id);
create index if not exists fitness_stock_reservations_sale_id_idx on public.fitness_stock_reservations(sale_id);
create index if not exists fitness_stock_reservations_variant_id_idx on public.fitness_stock_reservations(variant_id);
create index if not exists bank_charges_payment_account_id_idx on public.bank_charges(payment_account_id);
create index if not exists bank_debt_payments_payment_account_id_idx on public.bank_debt_payments(payment_account_id);
create index if not exists bank_receivables_receiving_account_id_idx on public.bank_receivables(receiving_account_id);

-- SECURITY DEFINER functions are not callable anonymously, except username->email
-- resolution which is intentionally required before sign-in.
do $$
declare f record;
begin
  for f in
    select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname<>'resolve_login_email'
  loop
    execute format('revoke execute on function %I.%I(%s) from public, anon',f.nspname,f.proname,f.args);
    execute format('grant execute on function %I.%I(%s) to authenticated',f.nspname,f.proname,f.args);
  end loop;
end $$;

revoke execute on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon,authenticated;
