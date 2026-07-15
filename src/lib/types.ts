export type ProductCatalogRow = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  active: boolean;
  sale_price: number;
  installment_price: number;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  awaiting_sales_quantity: number;
  stock_status: string;
};

export type ProductOption = Pick<ProductCatalogRow, "id" | "name" | "category" | "brand" | "image_url">;

export type SaleStockOption = {
  product_id: string;
  product_name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  location_id: string;
  location_code: string;
  location_name: string;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
};

export type LocationOption = { id: string; code: string; name: string; city: string | null; };
export type PartnerOption = { id: string; name: string; partner_type: string; city: string | null; partnership_model: string | null; settlement_rule: string | null; commission_pct: number; };

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
  secondary_thumbnail_url: string | null;
};

export type ProductManagementDetails = ProductDetails & {
  sku: string | null;
  cost_price: number;
  min_stock: number;
  ideal_stock: number;
  restricted: boolean;
  default_supplier_id: string | null;
  default_supplier_name: string | null;
  updated_at: string;
};


export type InventoryOverviewRow = {
  product_id: string;
  product_name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  min_stock: number;
  ideal_stock: number;
  cost_price: number;
  sale_price: number;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  stock_cost_value: number;
  stock_sale_value: number;
  stock_status: string;
};

export type InventorySummary = {
  active_products: number;
  products_with_stock: number;
  physical_units: number;
  reserved_units: number;
  available_units: number;
  incoming_units: number;
  stock_cost_value: number;
  stock_sale_value: number;
  attention_products: number;
};

export type InventoryLocationRow = {
  product_id: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  location_city: string | null;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  stock_cost_value: number;
  stock_sale_value: number;
};

export type InventoryReservationRow = {
  id: string;
  product_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  sale_id: string;
  customer_id: string | null;
  customer_name: string;
  sale_date: string;
  quantity_requested: number;
  quantity_reserved: number;
  quantity_missing: number;
  status: string;
  reserved_at: string | null;
  fulfilled_at: string | null;
  notes: string | null;
};

export type InventoryMovementRow = {
  id: string;
  product_id: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  movement_type: string;
  quantity_delta: number;
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  transfer_group_id: string | null;
  counterpart_location_code: string | null;
  counterpart_location_name: string | null;
  notes: string | null;
  occurred_at: string;
};

export type InventoryProductDetails = {
  overview: InventoryOverviewRow;
  locations: InventoryLocationRow[];
  reservations: InventoryReservationRow[];
  movements: InventoryMovementRow[];
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
  paid_at: string | null; payment_due_at: string | null; price_condition: string | null; partner_id: string | null;
  partner_name: string | null; primary_product_id: string | null; primary_image_url: string | null; reservation_status: string | null;
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
  payment_due_at: string | null; price_condition: string | null; partner_id: string | null; partner_name: string | null; reservation_status: string | null;
};

export type SaleDetailItem = {
  id: string; product_id: string; product_name: string; product_image_url: string | null; category: string | null; brand: string | null;
  quantity: number; unit_cost: number; unit_price: number; price_condition: string | null;
  quantity_requested: number | null; quantity_reserved: number | null; reservation_status: string | null;
};
export type SaleDetails = {
  id: string; customer_id: string | null; customer_name: string; reference: string | null; city: string | null; phone: string | null;
  location_id: string; location_code: string; location_name: string; order_at: string; paid_at: string | null; delivered_at: string | null;
  general_status: string; payment_status: string; delivery_status: string; payment_method: string | null; payment_condition: string | null;
  payment_due_at: string | null; price_condition: string | null; partner_id: string | null; partner_name: string | null;
  total_amount: number; total_cost: number; total_profit: number; notes: string | null; items: SaleDetailItem[];
};

export type ReplenishmentRow = { product_id: string; product_name: string; category: string; company_quantity: number; min_stock: number; ideal_stock: number; needs_replenishment: boolean; suggested_order_quantity: number; stock_status: string; };
export type CommercialDashboardSummary = { total_sales: number; total_revenue: number; total_profit: number; receivable_total: number; receivable_sales: number; current_month_sales: number; current_month_revenue: number; current_month_profit: number; previous_month_sales: number; previous_month_revenue: number; previous_month_profit: number; operational_units: number; all_units: number; stock_cost_value: number; stock_sale_value: number; stock_potential_profit: number; };
export type CustomerOption = { id: string; name: string; city: string | null; phone: string | null; };
export type Customer = CustomerOption & {
  total_spent: number;
  purchase_count: number;
  last_purchase_at: string | null;
  lead_count: number;
  pending_sales_count: number;
  crm_status: string;
  next_contact_at: string | null;
  last_contact_at: string | null;
  last_contact_outcome: string | null;
  contact_lost: boolean;
  tags: string | null;
  next_followup_id: string | null;
  next_followup_at: string | null;
  next_followup_notes: string | null;
  interaction_count: number;
  pending_followup_count: number;
  days_since_last_purchase: number | null;
  days_since_last_contact: number | null;
  care_alert: boolean;
  radar_status: string;
  radar_rank: number;
  next_action_label: string;
};
export type CustomerDetails = Customer & {
  reference: string | null;
  email: string | null;
  notes: string | null;
  sensitive_to_caffeine: boolean;
  anxiety_or_insomnia: boolean;
  prohibited_products: string | null;
  approach_preferences: string | null;
  active: boolean;
};

export type CustomerInteraction = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  interaction_type: string;
  status: string;
  channel: string | null;
  occurred_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
  sale_total: number | null;
  sale_product_summary: string | null;
};

export type CustomerCRMSummary = {
  total_active_customers: number;
  followups_today: number;
  overdue_followups: number;
  inactive_customers: number;
  lead_only_customers: number;
  care_customers: number;
  customers_with_pending_orders: number;
  total_customer_value: number;
};
export type Movement = { id: string; created_at: string; movement_type: string; quantity_delta: number; product_name: string; location_code: string; notes: string | null; };
export type DashboardOperationalSummary = {
  today: string;
  pending_orders_count: number;
  pending_delivery_count: number;
  pending_payment_count: number;
  overdue_payment_count: number;
  overdue_payment_total: number;
  payment_due_today_count: number;
  payment_due_today_total: number;
  open_leads_count: number;
  stale_leads_count: number;
  supplier_orders_open_count: number;
  incoming_units: number;
  stock_attention_products: number;
  out_of_stock_products: number;
  physical_units: number;
  reserved_units: number;
  available_units: number;
  current_month_sales: number;
  current_month_revenue: number;
  current_month_profit: number;
  previous_month_sales: number;
  previous_month_revenue: number;
  previous_month_profit: number;
  receivable_total: number;
  stock_cost_value: number;
  stock_sale_value: number;
  stock_potential_profit: number;
};

export type DashboardPriorityItem = {
  item_type: "delivery" | "payment" | "lead" | "supplier" | "stock";
  priority_rank: number;
  entity_id: string;
  customer_id: string | null;
  product_id: string | null;
  title: string;
  subtitle: string;
  reference_date: string;
  amount: number | null;
  quantity: number;
  href: string;
};

export type DashboardData = {
  totalProducts: number;
  totalUnits: number;
  stockCostValue: number;
  stockSaleValue: number;
  totalRevenue: number;
  receivable: number;
  pendingOrdersCount: number;
  pendingDeliveryCount: number;
  pendingPaymentCount: number;
  pendingOrdersValue: number;
  currentMonthRevenue: number;
  currentMonthProfit: number;
  currentMonthSalesCount: number;
  previousMonthRevenue: number;
  previousMonthProfit: number;
  previousMonthSalesCount: number;
  revenueChange: number | null;
  profitChange: number | null;
  salesChange: number | null;
  operational: DashboardOperationalSummary;
  priorities: DashboardPriorityItem[];
  recentSales: SaleRow[];
  lowStock: ReplenishmentRow[];
  agendaToday: AgendaEvent[];
  agendaSummary: AgendaSummary;
};
export type AgendaEvent = {
  event_key: string;
  source_type: "task" | "interaction" | "sale_payment" | "sale_delivery" | "sale_post_sale" | "purchase_order";
  source_id: string;
  category: "task" | "delivery" | "payment" | "follow_up" | "post_sale" | "supplier" | "other";
  title: string;
  subtitle: string;
  due_at: string;
  due_date: string;
  status: "planned" | "completed" | "cancelled";
  priority: "normal" | "attention" | "urgent";
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sale_id: string | null;
  purchase_order_id: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  href: string;
  notes: string | null;
  amount: number | null;
  created_at: string;
};

export type AgendaSummary = {
  today_count: number;
  overdue_count: number;
  next_seven_days_count: number;
  completed_month_count: number;
};

export type AgendaUserOption = { id: string; name: string; email: string | null };
export type AgendaSaleOption = { id: string; customer_id: string | null; label: string };
export type AgendaPurchaseOrderOption = { id: string; label: string };

export type PanelPeriod = "current" | "previous" | "all";
export type PanelCSData = {
  period: PanelPeriod;
  periodLabel: string;
  grossRevenue: number;
  profit: number;
  saleCount: number;
  receivable: number;
  pendingOrdersCount: number;
  averageTicket: number;
  marginPercent: number;
  comparisonRevenue: number;
  comparisonProfit: number;
  comparisonSales: number;
  revenueChange: number | null;
  profitChange: number | null;
  salesChange: number | null;
  sales: SaleRow[];
};

export type SupplierOption = {
  id: string;
  name: string;
  notes: string | null;
};

export type PurchaseProductOption = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  incoming_quantity: number;
};

export type SupplierOrderSummary = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  ordered_on: string;
  destination_location_id: string;
  destination_code: string;
  destination_name: string;
  status: string;
  notes: string | null;
  legacy_supplier_order_id: string | null;
  item_count: number;
  ordered_units: number;
  received_units: number;
  pending_units: number;
  order_total: number;
  product_summary: string | null;
  waiting_sales_count: number;
  created_at: string;
  updated_at: string;
};

export type SupplierWaitingSale = {
  purchase_order_item_id: string;
  sale_id: string;
  customer_id: string | null;
  customer_name: string;
  sale_date: string;
  quantity_requested: number;
  quantity_reserved: number;
  quantity_missing: number;
  reservation_status: string;
};

export type SupplierOrderItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  category: string;
  brand: string | null;
  quantity_ordered: number;
  quantity_received: number;
  quantity_pending: number;
  unit_cost: number;
  total_cost: number;
  item_status: string;
  notes: string | null;
  destination_location_id: string;
  destination_code: string;
  destination_name: string;
  waiting_sales_units: number;
  waiting_sales_count: number;
  waiting_sales: SupplierWaitingSale[];
};

export type SupplierOrderDetails = SupplierOrderSummary & {
  items: SupplierOrderItem[];
};

export type PartnerOverview = {
  id: string;
  name: string;
  partner_type: string;
  city: string | null;
  reference: string | null;
  contact_name: string | null;
  phone: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  partnership_model: string | null;
  settlement_rule: string | null;
  commission_pct: number;
  active: boolean;
  can_hold_stock: boolean;
  can_pickup: boolean;
  can_sell: boolean;
  can_deliver: boolean;
  notes: string | null;
  linked_location_id: string | null;
  linked_location_code: string | null;
  linked_location_name: string | null;
  reward_type: string;
  target_sales: number | null;
  reward_value: number;
  reward_description: string | null;
  settlement_frequency: string;
  settlement_day: number | null;
  coupon_code: string | null;
  counts_only_delivered: boolean;
  updated_at: string;
  all_time_sales_count: number;
  all_time_revenue: number;
  all_time_profit: number;
  last_sale_on: string | null;
  cycle_start: string;
  current_cycle_sales_count: number;
  current_cycle_revenue: number;
  current_cycle_profit: number;
  reward_units_due: number;
  progress_sales: number;
  progress_pct: number;
  estimated_reward_amount: number;
  last_settlement_on: string | null;
  last_settlement_period_end: string | null;
  linked_location_units: number;
  settlement_pending: boolean;
};

export type PartnerSale = {
  id: string;
  partner_id: string;
  partner_name: string;
  customer_id: string | null;
  customer_name: string;
  sale_date: string;
  quoted_at: string;
  delivered_at: string | null;
  payment_status: string;
  delivery_status: string;
  general_status: string;
  total_amount: number;
  total_profit: number;
  location_code: string;
  location_name: string;
  product_summary: string | null;
  total_items: number;
};

export type PartnerSettlement = {
  id: string;
  partner_id: string;
  settled_on: string;
  period_start: string;
  period_end: string;
  sale_count: number;
  gross_sales: number;
  gross_profit: number;
  reward_units: number;
  reward_amount: number;
  reward_description: string | null;
  notes: string | null;
  created_at: string;
};

export type UnassignedPartnershipSale = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  sale_date: string;
  total_amount: number;
  delivery_status: string;
  payment_status: string;
  location_id: string;
  location_code: string;
  location_name: string;
  product_summary: string | null;
  total_items: number;
  suggested_partner_id: string | null;
  suggested_partner_name: string | null;
};

export type PartnerDetails = {
  overview: PartnerOverview;
  sales: PartnerSale[];
  settlements: PartnerSettlement[];
  unassignedSales: UnassignedPartnershipSale[];
};

export type FitnessDashboardSummary = {
  month_sales: number;
  month_revenue: number;
  month_profit: number;
  pending_delivery: number;
  pending_payment: number;
  receivable_total: number;
  variants_with_stock: number;
  physical_units: number;
  reserved_units: number;
  available_units: number;
  incoming_units: number;
  stock_cost_value: number;
  stock_sale_value: number;
  attention_variants: number;
  open_orders: number;
  active_customers: number;
  low_stock_variants: number;
  out_of_stock_variants: number;
};

export type FitnessStockRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  category: string;
  image_url: string | null;
  product_active: boolean;
  size: string;
  color: string;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  variant_active: boolean;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  stock_cost_value: number;
  stock_sale_value: number;
  stock_status: string;
  minimum_stock: number;
  reorder_target: number;
  default_supplier_id: string | null;
  default_supplier_name: string | null;
  quantity_below_minimum: number;
  suggested_reorder_quantity: number;
  operational_status: string;
};

export type FitnessProductRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  variant_count: number;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  min_sale_price: number;
  max_sale_price: number;
  attention_variants: number;
  updated_at: string;
};

export type FitnessCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  total_purchases: number;
  total_spent: number;
  last_purchase_on: string | null;
  days_without_purchase: number | null;
  classification: string;
};

export type FitnessSupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  order_count: number;
  open_orders: number;
  last_order_on: string | null;
  incoming_units: number;
};

export type FitnessSaleRow = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  city: string | null;
  quoted_on: string;
  general_status: string;
  payment_status: string;
  delivery_status: string;
  payment_method: string | null;
  payment_due_on: string | null;
  paid_on: string | null;
  delivered_on: string | null;
  total_cost: number;
  total_amount: number;
  total_profit: number;
  notes: string | null;
  responsible: string | null;
  status_label: string;
  created_at: string;
  product_summary: string;
  total_items: number;
  reservation_status: string;
};

export type FitnessSaleItem = {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  size: string;
  color: string;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  reservation_status: string | null;
  quantity_reserved: number;
};

export type FitnessSaleDetails = FitnessSaleRow & { items: FitnessSaleItem[] };

export type FitnessPurchaseOrderSummary = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  ordered_on: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  ordered_units: number;
  received_units: number;
  pending_units: number;
  order_total: number;
  freight: number;
  grand_total: number;
  expected_on: string | null;
  received_on: string | null;
  responsible: string | null;
  supplier_contact: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
  product_summary: string;
};

export type FitnessPurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  size: string;
  color: string;
  sku: string | null;
  quantity_ordered: number;
  quantity_received: number;
  quantity_pending: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  item_status: string;
};

export type FitnessPurchaseOrderDetails = FitnessPurchaseOrderSummary & { items: FitnessPurchaseOrderItem[] };

export type FitnessInventoryMovementRow = {
  id: string;
  variant_id: string;
  movement_type: string;
  movement_label: string;
  quantity_delta: number;
  sale_id: string | null;
  purchase_order_item_id: string | null;
  transfer_group_id: string | null;
  notes: string | null;
  created_at: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  size: string;
  color: string;
  sku: string | null;
};

// -----------------------------------------------------------------------------
// Tipagens temporÃ¡rias do Test Lab
// Mantidas permissivas para liberar a compilaÃ§Ã£o enquanto o laboratÃ³rio isolado
// Ã© estabilizado. Depois podem ser substituÃ­das por interfaces especÃ­ficas.
// -----------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any -- Tipagens temporÃ¡rias do Test Lab atÃ© definirmos interfaces finais. */
export type TestLabOperation = any;
export type TestLabDashboardSummary = any;
export type TestLabStockRow = any;
export type TestLabCustomer = any;
export type TestLabSupplier = any;
export type TestLabSaleRow = any;
export type TestLabSaleDetails = any;
export type TestLabSaleItem = any;
export type TestLabPurchaseOrderRow = any;
export type TestLabPurchaseOrderDetails = any;
export type TestLabPurchaseOrderItem = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

