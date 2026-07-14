grant select, insert, update, delete on
  public.fitness_products,
  public.fitness_variants,
  public.fitness_stock_balances,
  public.fitness_sales,
  public.fitness_sale_items,
  public.fitness_stock_reservations,
  public.fitness_inventory_movements,
  public.fitness_suppliers,
  public.fitness_purchase_orders,
  public.fitness_purchase_order_items,
  public.fitness_purchase_receipts
  to authenticated, service_role;
