import { isSupabaseConfigured } from "./config";
import { demoCustomers, demoDashboard, demoMovements, demoProducts, demoSales, demoStock } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Customer, DashboardData, Movement, Product, SaleRow, StockRow } from "./types";

const number = (value: unknown) => Number(value ?? 0);

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
  const { data, error } = await supabase.from("sales").select("id,created_at,record_type,general_status,payment_status,delivery_status,total_amount,total_profit,customer:customers(name),location:locations(code)").order("created_at", { ascending: false }).limit(100);
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

export async function getDashboard(): Promise<DashboardData> {
  if (!isSupabaseConfigured) return demoDashboard;
  const [products, stock, sales] = await Promise.all([getProducts(), getStock(), getSales()]);
  return {
    totalProducts: products.filter((product) => product.active).length,
    totalUnits: stock.reduce((sum, row) => sum + row.quantity, 0),
    stockCostValue: stock.reduce((sum, row) => sum + row.stock_cost_value, 0),
    stockSaleValue: stock.reduce((sum, row) => sum + row.stock_sale_value, 0),
    receivable: sales.filter((sale) => sale.payment_status === "receivable" && sale.general_status !== "cancelled").reduce((sum, sale) => sum + sale.total_amount, 0),
    lowStockCount: stock.filter((row) => row.quantity <= row.min_stock).length,
    recentSales: sales.slice(0, 8),
    lowStock: stock.filter((row) => row.quantity <= row.min_stock).slice(0, 8),
  };
}
