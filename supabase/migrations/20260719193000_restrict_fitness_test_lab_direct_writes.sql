-- Candinho Company V21
-- Já aplicada diretamente no Supabase de produção.
--
-- Princípio:
--   leitura direta via RLS;
--   mutações críticas somente pelas RPCs SECURITY DEFINER autorizadas.
--
-- Isso impede que um usuário autenticado contorne as regras de negócio
-- alterando diretamente saldos, reservas, vendas, itens ou movimentos.

revoke insert, update, delete on
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
from authenticated;

revoke insert, update, delete on
  public.test_lab_audit_events,
  public.test_lab_customers,
  public.test_lab_inventory_movements,
  public.test_lab_products,
  public.test_lab_purchase_order_items,
  public.test_lab_purchase_orders,
  public.test_lab_reservations,
  public.test_lab_sale_items,
  public.test_lab_sales,
  public.test_lab_stock,
  public.test_lab_suppliers
from authenticated;
