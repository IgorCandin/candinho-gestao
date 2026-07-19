-- Candinho Company V19
-- Já aplicada diretamente no Supabase de produção.
--
-- As funções de permissão abaixo não dependem da linha da tabela.
-- O subselect permite ao Postgres tratá-las como initPlan e reaproveitar
-- o resultado da checagem durante a consulta.

do $$
declare
  t text;
  supplements_tables text[] := array[
    'customer_interactions','customers','inventory_reconciliation_reviews','locations',
    'product_combo_items','product_combos','products','purchase_order_items','purchase_orders',
    'purchase_receipts','sale_items','sales','sales_quote_items','sales_quotes','suppliers'
  ];
  fitness_tables text[] := array[
    'fitness_customers','fitness_inventory_movements','fitness_products','fitness_purchase_order_items',
    'fitness_purchase_orders','fitness_purchase_receipts','fitness_sale_items','fitness_sales',
    'fitness_stock_balances','fitness_stock_reservations','fitness_suppliers','fitness_variants'
  ];
begin
  foreach t in array supplements_tables loop
    execute format(
      'alter policy %I on public.%I using ((select public.can_access_operation(''supplements'')))',
      t || '_read', t
    );
    execute format(
      'alter policy %I on public.%I with check ((select public.can_write()))',
      t || '_insert', t
    );
    execute format(
      'alter policy %I on public.%I using ((select public.can_write())) with check ((select public.can_write()))',
      t || '_update', t
    );
    execute format(
      'alter policy %I on public.%I using ((select public.can_write()))',
      t || '_delete', t
    );
  end loop;

  foreach t in array fitness_tables loop
    execute format(
      'alter policy %I on public.%I using ((select public.can_access_operation(''fitness'')))',
      t || '_read', t
    );
    execute format(
      'alter policy %I on public.%I with check ((select public.can_write_fitness()))',
      t || '_insert', t
    );
    execute format(
      'alter policy %I on public.%I using ((select public.can_write_fitness())) with check ((select public.can_write_fitness()))',
      t || '_update', t
    );
    execute format(
      'alter policy %I on public.%I using ((select public.can_write_fitness()))',
      t || '_delete', t
    );
  end loop;

  alter policy profiles_read on public.profiles
    using ((id = (select auth.uid())) or (select public.can_manage_users()));

  alter policy profiles_admin_insert on public.profiles
    with check ((select public.can_manage_users()));

  alter policy profiles_admin_update on public.profiles
    using ((select public.can_manage_users()))
    with check ((select public.can_manage_users()));

  alter policy profiles_admin_delete on public.profiles
    using ((select public.can_manage_users()));
end $$;
