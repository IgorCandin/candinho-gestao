import { redirect } from "next/navigation";
import { CompanyStockExpenseWorkspace } from "@/components/company-stock-expense-workspace";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyStockExpensePage() {
  const access = await getCurrentUserAccess(); if (!access.active || access.role === "partner") redirect("/dashboard");
  const supabase = await createClient();
  const [products, locations, flavors, stock, flavorStock, fitness] = await Promise.all([supabase.from("products").select("id,name,flavor_tracking_enabled").eq("active", true).order("name"), supabase.from("locations").select("id,name,code").eq("active", true).eq("tracks_inventory", true).order("code"), supabase.from("product_flavors").select("id,product_id,name").eq("active", true).order("display_order"), supabase.from("inventory_location_overview").select("product_id,location_id,available_quantity"), supabase.from("product_flavor_stock_balances").select("flavor_id,location_id,quantity"), getFitnessStock()]);
  for (const result of [products, locations, flavors, stock, flavorStock]) if (result.error) throw new Error(result.error.message);
  return <CompanyStockExpenseWorkspace supplements={(products.data ?? []).map((item) => ({ id: String(item.id), name: String(item.name), flavorTracking: Boolean(item.flavor_tracking_enabled) }))} locations={(locations.data ?? []).map((item) => ({ id: String(item.id), name: String(item.name), code: String(item.code) }))} flavors={(flavors.data ?? []).map((item) => ({ id: String(item.id), productId: String(item.product_id), name: String(item.name) }))} stock={(stock.data ?? []).map((item) => ({ productId: String(item.product_id), locationId: String(item.location_id), quantity: Number(item.available_quantity) }))} flavorStock={(flavorStock.data ?? []).map((item) => ({ flavorId: String(item.flavor_id), locationId: String(item.location_id), quantity: Number(item.quantity) }))} fitness={fitness.filter((item) => item.product_active && item.variant_active).map((item) => ({ id: item.variant_id, name: item.product_name, size: item.size, color: item.color, available: item.available_quantity }))}/>;
}
