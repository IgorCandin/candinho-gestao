import { isSupabaseConfigured } from "./config";
import { demoCustomers, demoMovements, demoProducts, demoSales, demoStock } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Customer, DashboardData, Movement, PanelCSData, PanelPeriod, Product, SaleRow, StockRow } from "./types";

const number = (value: unknown) => Number(value ?? 0);

function isPendingOrder(sale: SaleRow) {
  return (
    sale.record_type === "sale" &&
    sale.general_status !== "cancelled" &&
    (sale.delivery_status === "to_deliver" || sale.payment_status === "receivable" || sale.general_status === "pending")
  );
}

function monthRange(period: Exclude<PanelPeriod, "all">) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + (period === "previous" ? -1 : 0), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + (period === "previous" ? 0 : 1), 1);
  return { start, end };
}

function isInPeriod(date: string, period: PanelPeriod) {
  if (period === "all") return true;
  const value = new Date(date);
  const { start, end } = monthRange(period);
  return value >= start && value < end;
}

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("id,name,sku,category,brand,cost_price,sale_price,min_stock,active,image_url").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, cost_price: number(row.cost_price), sale_price: number(row.sale_price), min_stock: number(row.min_stock) })) as Product[];
}

export async function getStock(): Promise<StockRow[]> {
  if (!isSupabaseConfigured) return demoStock;
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_overview").select("*").order("quantity", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, quantity: number(row.quantity), min_stock: number(row.min_stock), cost_price: number(row.cost_price), sale_price: number(row.sale_price), stock_cost_value: number(row.stock_cost_value), stock_sale_value: number(row.stock_sale_value) })) as StockRow[];
}

export async function getSales(): Promise<SaleRow[]> {
  if (!isSupabaseConfigured) return demoSales;
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales").select("id,created_at,record_type,general_status,payment_status,delivery_status,total_amount,total_profit,customer:customers(name),location:locations(code)").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    record_type: row.record_type,
    general_status: row.general_status,
    payment_status: row.payment_status,
    delivery_status: row.delivery_status,
    total_amount: number(row.total_amount),
    total_profit: number(row.total_profit),
    customer_name: row.customer?.name ?? "Cliente não informado",
    location_code: row.location?.code ?? "—",
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
  return (data ?? []).map((row: any) => ({ id: row.id, created_at: row.created_at, movement_type: row.movement_type, quantity_delta: number(row.quantity_delta), notes: row.notes, product_name: row.product?.name ?? "—", location_code: row.location?.code ?? "—" }));
}

export async function getPendingOrders(): Promise<SaleRow[]> {
  const sales = await getSales();
  return sales.filter(isPendingOrder);
}

export async function getPanelCS(period: PanelPeriod = "current"): Promise<PanelCSData> {
  const sales = (await getSales()).filter(
    (sale) => sale.record_type === "sale" && sale.general_status !== "cancelled" && isInPeriod(sale.created_at, period),
  );
  const grossRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const profit = sales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const receivable = sales.filter((sale) => sale.payment_status === "receivable").reduce((sum, sale) => sum + sale.total_amount, 0);
  const pendingOrdersCount = sales.filter(isPendingOrder).length;

  return {
    period,
    periodLabel: period === "current" ? "Mês atual" : period === "previous" ? "Mês anterior" : "Visão geral",
    grossRevenue,
    profit,
    saleCount: sales.length,
    receivable,
    pendingOrdersCount,
    averageTicket: sales.length > 0 ? grossRevenue / sales.length : 0,
    sales,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const [products, stock, sales] = await Promise.all([getProducts(), getStock(), getSales()]);
  const pendingOrders = sales.filter(isPendingOrder);
  const currentMonthSales = sales.filter(
    (sale) => sale.record_type === "sale" && sale.general_status !== "cancelled" && isInPeriod(sale.created_at, "current"),
  );

  return {
    totalProducts: products.filter((product) => product.active).length,
    totalUnits: stock.reduce((sum, row) => sum + row.quantity, 0),
    stockCostValue: stock.reduce((sum, row) => sum + row.stock_cost_value, 0),
    stockSaleValue: stock.reduce((sum, row) => sum + row.stock_sale_value, 0),
    receivable: sales.filter((sale) => sale.payment_status === "receivable" && sale.general_status !== "cancelled").reduce((sum, sale) => sum + sale.total_amount, 0),
    lowStockCount: stock.filter((row) => row.min_stock > 0 && row.quantity <= row.min_stock).length,
    pendingOrdersCount: pendingOrders.length,
    pendingDeliveryCount: pendingOrders.filter((sale) => sale.delivery_status === "to_deliver").length,
    pendingPaymentCount: pendingOrders.filter((sale) => sale.payment_status === "receivable").length,
    pendingOrdersValue: pendingOrders.reduce((sum, sale) => sum + sale.total_amount, 0),
    currentMonthRevenue: currentMonthSales.reduce((sum, sale) => sum + sale.total_amount, 0),
    currentMonthSalesCount: currentMonthSales.length,
    recentSales: sales.slice(0, 8),
    lowStock: stock.filter((row) => row.min_stock > 0 && row.quantity <= row.min_stock).slice(0, 8),
  };
}
