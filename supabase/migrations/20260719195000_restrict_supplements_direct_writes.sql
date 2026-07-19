-- Candinho Company V22
-- Já aplicada diretamente no Supabase de produção.
--
-- SELECT direto continua sujeito a RLS.
-- Mutações críticas de Suplementos passam pelas RPCs SECURITY DEFINER.
-- dashboard_priority_preferences não é alterada porque o frontend usa UPSERT direto.

revoke insert, update, delete on
  public.customers,
  public.customer_interactions,
  public.products,
  public.locations,
  public.sales,
  public.sale_items,
  public.sales_quotes,
  public.sales_quote_items,
  public.product_combos,
  public.product_combo_items,
  public.stock_balances,
  public.inventory_movements,
  public.inventory_reconciliation_reviews,
  public.operational_tasks
from authenticated;
