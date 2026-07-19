-- Candinho Company V19
-- Já aplicada diretamente no Supabase de produção.
--
-- As antigas policies *_write eram FOR ALL e, por isso, também participavam
-- de SELECT junto das policies *_read. Aqui a escrita é separada em
-- INSERT / UPDATE / DELETE, preservando exatamente as mesmas funções de
-- permissão e removendo avaliações duplicadas em leituras.

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
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_write())',
      t || '_delete', t
    );
  end loop;

  foreach t in array fitness_tables loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write_fitness())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_write_fitness()) with check (public.can_write_fitness())',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_write_fitness())',
      t || '_delete', t
    );
  end loop;

  drop policy if exists profiles_admin_write on public.profiles;
  drop policy if exists profiles_admin_insert on public.profiles;
  drop policy if exists profiles_admin_update on public.profiles;
  drop policy if exists profiles_admin_delete on public.profiles;

  create policy profiles_admin_insert on public.profiles
    for insert to authenticated
    with check (public.can_manage_users());

  create policy profiles_admin_update on public.profiles
    for update to authenticated
    using (public.can_manage_users())
    with check (public.can_manage_users());

  create policy profiles_admin_delete on public.profiles
    for delete to authenticated
    using (public.can_manage_users());
end $$;

-- Índices direcionados a relações usadas por fluxos ativos.
create index if not exists fitness_purchase_receipts_purchase_order_item_id_idx
  on public.fitness_purchase_receipts(purchase_order_item_id);

create index if not exists fitness_variants_default_supplier_id_idx
  on public.fitness_variants(default_supplier_id);

create index if not exists operational_tasks_purchase_order_id_idx
  on public.operational_tasks(purchase_order_id);

create index if not exists purchase_orders_destination_location_id_idx
  on public.purchase_orders(destination_location_id);

create index if not exists purchase_receipts_inventory_movement_id_idx
  on public.purchase_receipts(inventory_movement_id);

create index if not exists sales_gift_product_id_idx
  on public.sales(gift_product_id);

create index if not exists sales_quote_items_product_id_idx
  on public.sales_quote_items(product_id);

create index if not exists sales_quotes_gift_product_id_idx
  on public.sales_quotes(gift_product_id);

create index if not exists sales_quotes_location_id_idx
  on public.sales_quotes(location_id);

create index if not exists sales_quotes_partner_id_idx
  on public.sales_quotes(partner_id);

create index if not exists stock_reservations_location_id_idx
  on public.stock_reservations(location_id);
