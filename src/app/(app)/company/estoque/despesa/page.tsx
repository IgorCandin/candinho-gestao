import { redirect } from "next/navigation";
import { CompanyStockExpenseWorkspace } from "@/components/company-stock-expense-workspace";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyStockExpensePage() {
  const access = await getCurrentUserAccess(); if (!access.active || access.role === "partner") redirect("/dashboard");
  const supabase = await createClient();
  const safeRows = async <Row,>(request: PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) => { const result = await request; return result.error ? [] : result.data ?? []; };
  const [products, locations, flavors, stock, flavorStock, fitness] = await Promise.all([
    safeRows(supabase.from("products").select("id,name,flavor_tracking_enabled").eq("active", true).order("name")), safeRows(supabase.from("locations").select("id,name,code").eq("active", true).eq("tracks_inventory", true).order("code")), safeRows(supabase.from("product_flavors").select("id,product_id,name").eq("active", true).order("display_order")), safeRows(supabase.from("inventory_location_overview").select("product_id,location_id,available_quantity")), safeRows(supabase.from("product_flavor_stock_balances").select("flavor_id,location_id,quantity")), getFitnessStock().catch(() => []),
  ]);
  return <CompanyStockExpenseWorkspace supplements={products.map((item) => ({ id: String(item.id), name: String(item.name), flavorTracking: Boolean(item.flavor_tracking_enabled) }))} locations={locations.map((item) => ({ id: String(item.id), name: String(item.name), code: String(item.code) }))} flavors={flavors.map((item) => ({ id: String(item.id), productId: String(item.product_id), name: String(item.name) }))} stock={stock.map((item) => ({ productId: String(item.product_id), locationId: String(item.location_id), quantity: Number(item.available_quantity) }))} flavorStock={flavorStock.map((item) => ({ flavorId: String(item.flavor_id), locationId: String(item.location_id), quantity: Number(item.quantity) }))} fitness={fitness.filter((item) => item.product_active && item.variant_active).map((item) => ({ id: item.variant_id, name: item.product_name, size: item.size, color: item.color, available: item.available_quantity }))}/>;
}
