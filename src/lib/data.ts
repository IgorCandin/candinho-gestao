import { isSupabaseConfigured } from "./config";
import {
  demoCustomers,
  demoLeads,
  demoMovements,
  demoPendingOrders,
  demoProductDetails,
  demoProducts,
  demoReplenishment,
  demoSales,
  demoStock,
} from "./demo-data";
import { createClient } from "./supabase/server";
import type {
  CommercialDashboardSummary,
  Customer,
  DashboardData,
  LeadRow,
  Movement,
  PanelCSData,
  PanelPeriod,
  PendingOrderRow,
  ProductCatalogRow,
  ProductDetails,
  ReplenishmentRow,
  SaleRow,
  StockRow,
} from "./types";

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown, fallback = "—") => (typeof value === "string" && value.trim() ? value : fallback);

function getBrazilYearMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function formatIsoMonthStart(year: number, monthIndex: number) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthBounds(offset: number) {
  const { year, month } = getBrazilYearMonth();
  return {
    start: formatIsoMonthStart(year, month - 1 + offset),
    end: formatIsoMonthStart(year, month + offset),
  };
}

function dateInPeriod(value: string | null, period: PanelPeriod) {
  if (period === "all") return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  const bounds = monthBounds(period === "previous" ? -1 : 0);
  return date >= bounds.start && date < bounds.end;
}

function isCommercialSale(sale: SaleRow) {
  const customer = sale.customer_name.trim().toLocaleLowerCase("pt-BR");
  return (
    sale.general_status !== "cancelled" &&
    !customer.startsWith("igor candinho") &&
    !customer.startsWith("brinde")
  );
}

function normalizeProduct(row: Record<string, unknown>): ProductCatalogRow {
  return {
    id: String(row.id),
    name: text(row.name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    brand: typeof row.brand === "string" ? row.brand : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    active: Boolean(row.active),
    sale_price: number(row.sale_price),
    installment_price: number(row.installment_price),
  };
}

function normalizeSale(row: Record<string, unknown>): SaleRow {
  return {
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    business_at: String(row.business_at ?? ""),
    business_date: String(row.business_date ?? ""),
    quoted_at: String(row.quoted_at ?? ""),
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    general_status: text(row.general_status, "pending"),
    payment_status: text(row.payment_status, "not_applicable"),
    delivery_status: text(row.delivery_status, "not_applicable"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition: typeof row.payment_condition === "string" ? row.payment_condition : null,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    notes: typeof row.notes === "string" ? row.notes : null,
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
  };
}

export async function getProductCatalog(): Promise<ProductCatalogRow[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>));
}

export async function getProductDetails(productId: string): Promise<ProductDetails | null> {
  if (!isSupabaseConfigured) return productId === demoProductDetails.id ? demoProductDetails : null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_details")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const base = normalizeProduct(data as Record<string, unknown>);
  return {
    ...base,
    description: typeof data.description === "string" ? data.description : null,
    objective: typeof data.objective === "string" ? data.objective : null,
    ideal_profile: typeof data.ideal_profile === "string" ? data.ideal_profile : null,
    duration_days: data.duration_days == null ? null : number(data.duration_days),
    information: typeof data.information === "string" ? data.information : null,
    quick_message: typeof data.quick_message === "string" ? data.quick_message : null,
    keywords: typeof data.keywords === "string" ? data.keywords : null,
    level: typeof data.level === "string" ? data.level : null,
    sales_category: typeof data.sales_category === "string" ? data.sales_category : null,
    secondary_image_url: typeof data.secondary_image_url === "string" ? data.secondary_image_url : null,
  };
}

export async function getStock(): Promise<StockRow[]> {
  if (!isSupabaseConfigured) return demoStock;
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_overview").select("*").order("quantity", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    quantity: number(row.quantity),
    min_stock: number(row.min_stock),
    cost_price: number(row.cost_price),
    sale_price: number(row.sale_price),
    stock_cost_value: number(row.stock_cost_value),
    stock_sale_value: number(row.stock_sale_value),
  })) as StockRow[];
}

export async function getSalesHistory(limit = 500): Promise<SaleRow[]> {
  if (!isSupabaseConfigured) return demoSales;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_history")
    .select("*")
    .order("business_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeSale(row as Record<string, unknown>));
}

export async function getLeadsHistory(): Promise<LeadRow[]> {
  if (!isSupabaseConfigured) return demoLeads;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads_history")
    .select("*")
    .order("lead_month", { ascending: false })
    .order("lead_date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    location_name: text(row.location_name),
    lead_at: String(row.lead_at ?? ""),
    lead_date: String(row.lead_date ?? ""),
    lead_month: String(row.lead_month ?? ""),
    lead_status: typeof row.lead_status === "string" ? row.lead_status : null,
    general_status: text(row.general_status, "pending"),
    reference: typeof row.reference === "string" ? row.reference : null,
    city: typeof row.city === "string" ? row.city : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
  }));
}

export async function getCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured) return demoCustomers;
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_summary").select("*").order("last_purchase_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, total_spent: number(row.total_spent), purchase_count: number(row.purchase_count) })) as Customer[];
}

export async function getMovements(): Promise<Movement[]> {
  if (!isSupabaseConfigured) return demoMovements;
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_movements").select("id,created_at,movement_type,quantity_delta,notes,product:products(name),location:locations(code)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const product = row.product as { name?: string } | null;
    const location = row.location as { code?: string } | null;
    return {
      id: String(row.id),
      created_at: String(row.created_at),
      movement_type: String(row.movement_type),
      quantity_delta: number(row.quantity_delta),
      notes: typeof row.notes === "string" ? row.notes : null,
      product_name: product?.name ?? "—",
      location_code: location?.code ?? "—",
    };
  });
}

export async function getPendingOrders(): Promise<PendingOrderRow[]> {
  if (!isSupabaseConfigured) return demoPendingOrders;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_orders")
    .select("*")
    .order("business_date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: text(row.customer_name, "Cliente não informado"),
    location_id: String(row.location_id ?? ""),
    location_code: text(row.location_code),
    business_at: String(row.business_at ?? ""),
    business_date: String(row.business_date ?? ""),
    order_at: String(row.order_at ?? ""),
    delivered_at: typeof row.delivered_at === "string" ? row.delivered_at : null,
    payment_status: text(row.payment_status, "not_applicable"),
    delivery_status: text(row.delivery_status, "not_applicable"),
    payment_method: typeof row.payment_method === "string" ? row.payment_method : null,
    payment_condition: typeof row.payment_condition === "string" ? row.payment_condition : null,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    product_summary: typeof row.product_summary === "string" ? row.product_summary : null,
    total_items: number(row.total_items),
  }));
}

export async function getReplenishment(): Promise<ReplenishmentRow[]> {
  if (!isSupabaseConfigured) return demoReplenishment;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replenishment_overview")
    .select("*")
    .eq("needs_replenishment", true)
    .order("company_quantity", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    product_id: String(row.product_id),
    product_name: text(row.product_name, "Produto sem nome"),
    category: text(row.category, "Sem categoria"),
    company_quantity: number(row.company_quantity),
    min_stock: number(row.min_stock),
    ideal_stock: number(row.ideal_stock),
    needs_replenishment: Boolean(row.needs_replenishment),
    suggested_order_quantity: number(row.suggested_order_quantity),
    stock_status: text(row.stock_status, "below_minimum"),
  }));
}

export async function getCommercialDashboardSummary(): Promise<CommercialDashboardSummary> {
  if (!isSupabaseConfigured) {
    const revenue = demoSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const profit = demoSales.reduce((sum, sale) => sum + sale.total_profit, 0);
    return {
      total_sales: demoSales.length,
      total_revenue: revenue,
      total_profit: profit,
      receivable_total: demoPendingOrders.reduce((sum, order) => sum + order.total_amount, 0),
      receivable_sales: demoPendingOrders.length,
      current_month_sales: demoSales.length,
      current_month_revenue: revenue,
      current_month_profit: profit,
      previous_month_sales: 0,
      previous_month_revenue: 0,
      previous_month_profit: 0,
      operational_units: demoStock.reduce((sum, row) => sum + row.quantity, 0),
      all_units: demoStock.reduce((sum, row) => sum + row.quantity, 0),
      stock_cost_value: demoStock.reduce((sum, row) => sum + row.stock_cost_value, 0),
      stock_sale_value: demoStock.reduce((sum, row) => sum + row.stock_sale_value, 0),
      stock_potential_profit: demoStock.reduce((sum, row) => sum + row.stock_sale_value - row.stock_cost_value, 0),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("commercial_dashboard_summary").select("*").single();
  if (error) throw error;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, number(value)])) as CommercialDashboardSummary;
}

export async function getPanelCS(period: PanelPeriod = "current"): Promise<PanelCSData> {
  const [summary, pendingOrders, allSales] = await Promise.all([
    getCommercialDashboardSummary(),
    getPendingOrders(),
    getSalesHistory(),
  ]);

  const sales = allSales.filter((sale) => isCommercialSale(sale) && dateInPeriod(sale.delivered_at, period));
  const grossRevenue = period === "current"
    ? summary.current_month_revenue
    : period === "previous"
      ? summary.previous_month_revenue
      : summary.total_revenue;
  const profit = period === "current"
    ? summary.current_month_profit
    : period === "previous"
      ? summary.previous_month_profit
      : summary.total_profit;
  const saleCount = period === "current"
    ? summary.current_month_sales
    : period === "previous"
      ? summary.previous_month_sales
      : summary.total_sales;

  return {
    period,
    periodLabel: period === "current" ? "Mês atual" : period === "previous" ? "Mês anterior" : "Visão geral",
    grossRevenue,
    profit,
    saleCount,
    receivable: summary.receivable_total,
    pendingOrdersCount: pendingOrders.length,
    averageTicket: saleCount > 0 ? grossRevenue / saleCount : 0,
    sales,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const [products, summary, pendingOrders, recentSales, lowStock] = await Promise.all([
    getProductCatalog(),
    getCommercialDashboardSummary(),
    getPendingOrders(),
    getSalesHistory(30),
    getReplenishment(),
  ]);

  return {
    totalProducts: products.filter((product) => product.active).length,
    totalUnits: summary.operational_units,
    stockCostValue: summary.stock_cost_value,
    stockSaleValue: summary.stock_sale_value,
    receivable: summary.receivable_total,
    pendingOrdersCount: pendingOrders.length,
    pendingDeliveryCount: pendingOrders.filter((sale) => sale.delivery_status === "to_deliver").length,
    pendingPaymentCount: pendingOrders.filter((sale) => sale.payment_status === "receivable").length,
    pendingOrdersValue: pendingOrders.reduce((sum, sale) => sum + sale.total_amount, 0),
    currentMonthRevenue: summary.current_month_revenue,
    currentMonthSalesCount: summary.current_month_sales,
    recentSales: recentSales.filter(isCommercialSale).slice(0, 8),
    lowStock: lowStock.slice(0, 8),
  };
}
