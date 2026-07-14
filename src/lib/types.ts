export type ProductCatalogRow = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  active: boolean;
  sale_price: number;
  installment_price: number;
};

export type ProductOption = Pick<ProductCatalogRow, "id" | "name" | "category" | "brand" | "image_url">;

export type ProductDetails = ProductCatalogRow & {
  description: string | null;
  objective: string | null;
  ideal_profile: string | null;
  duration_days: number | null;
  information: string | null;
  quick_message: string | null;
  keywords: string | null;
  level: string | null;
  sales_category: string | null;
  secondary_image_url: string | null;
};

export type StockRow = {
  product_id: string; product_name: string; category: string; location_id: string; location_code: string; location_name: string;
  quantity: number; min_stock: number; cost_price: number; sale_price: number; stock_cost_value: number; stock_sale_value: number;
};

export type SaleRow = {
  id: string; customer_id: string | null; customer_name: string; location_id: string; location_code: string; location_name: string;
  business_at: string; business_date: string; quoted_at: string; delivered_at: string | null; general_status: string;
  payment_status: string; delivery_status: string; payment_method: string | null; payment_condition: string | null;
  total_amount: number; total_profit: number; notes: string | null; product_summary: string | null; total_items: number;
};

export type LeadRow = {
  id: string; customer_id: string | null; customer_name: string; location_id: string; location_code: string; location_name: string;
  lead_at: string; lead_date: string; lead_month: string; lead_status: string | null; general_status: string; reference: string | null;
  city: string | null; phone: string | null; notes: string | null; product_summary: string | null; total_items: number;
  primary_product_id: string | null; primary_image_url: string | null;
};

export type LeadDetails = {
  id: string; customer_id: string | null; customer_name: string; lead_at: string; lead_status: string | null; general_status: string;
  reference: string | null; city: string | null; phone: string | null; notes: string | null; product_id: string | null;
  product_name: string | null; product_image_url: string | null; category: string | null; brand: string | null;
};

export type PendingOrderRow = {
  id: string; customer_id: string | null; customer_name: string; location_id: string; location_code: string; location_name: string;
  business_at: string; business_date: string; order_at: string; paid_at: string | null; delivered_at: string | null; general_status: string;
  payment_status: string; delivery_status: string; payment_method: string | null; payment_condition: string | null; total_amount: number;
  total_profit: number; product_summary: string | null; total_items: number; primary_product_id: string | null; primary_image_url: string | null;
};

export type SaleDetailItem = { id: string; product_id: string; product_name: string; product_image_url: string | null; category: string | null; brand: string | null; quantity: number; unit_price: number; };
export type SaleDetails = {
  id: string; customer_id: string | null; customer_name: string; reference: string | null; city: string | null; phone: string | null;
  location_id: string; location_code: string; location_name: string; order_at: string; paid_at: string | null; delivered_at: string | null;
  general_status: string; payment_status: string; delivery_status: string; payment_method: string | null; payment_condition: string | null;
  total_amount: number; notes: string | null; items: SaleDetailItem[];
};

export type ReplenishmentRow = { product_id: string; product_name: string; category: string; company_quantity: number; min_stock: number; ideal_stock: number; needs_replenishment: boolean; suggested_order_quantity: number; stock_status: string; };
export type CommercialDashboardSummary = { total_sales: number; total_revenue: number; total_profit: number; receivable_total: number; receivable_sales: number; current_month_sales: number; current_month_revenue: number; current_month_profit: number; previous_month_sales: number; previous_month_revenue: number; previous_month_profit: number; operational_units: number; all_units: number; stock_cost_value: number; stock_sale_value: number; stock_potential_profit: number; };
export type CustomerOption = { id: string; name: string; city: string | null; phone: string | null; };
export type Customer = CustomerOption & { total_spent: number; purchase_count: number; last_purchase_at: string | null; lead_count: number; pending_sales_count: number; };
export type CustomerDetails = Customer & { reference: string | null; email: string | null; notes: string | null; sensitive_to_caffeine: boolean; anxiety_or_insomnia: boolean; prohibited_products: string | null; approach_preferences: string | null; active: boolean; };
export type Movement = { id: string; created_at: string; movement_type: string; quantity_delta: number; product_name: string; location_code: string; notes: string | null; };
export type DashboardData = { totalProducts: number; totalUnits: number; stockCostValue: number; stockSaleValue: number; receivable: number; pendingOrdersCount: number; pendingDeliveryCount: number; pendingPaymentCount: number; pendingOrdersValue: number; currentMonthRevenue: number; currentMonthSalesCount: number; recentSales: SaleRow[]; lowStock: ReplenishmentRow[]; };
export type PanelPeriod = "current" | "previous" | "all";
export type PanelCSData = { period: PanelPeriod; periodLabel: string; grossRevenue: number; profit: number; saleCount: number; receivable: number; pendingOrdersCount: number; averageTicket: number; sales: SaleRow[]; };
