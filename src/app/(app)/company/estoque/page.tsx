import { redirect } from "next/navigation";
import { CompanyStockHub } from "@/components/company-stock-hub";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ProductSalesCategoryIntelligenceRow } from "@/components/product-sales-category-intelligence";

export default async function CompanyStockPage({ searchParams }: { searchParams: Promise<{ operacao?: string }> }) {
  const supabase = await createClient();
  const [access, stock, categoriesResult] = await Promise.all([
    getCurrentUserAccess(),
    getFitnessStock(),
    supabase.from("product_sales_category_intelligence").select("*").order("units_90d", { ascending: false }).order("units_30d", { ascending: false }).order("product_name", { ascending: true }),
  ]);
  if (!access.active || access.role === "partner") redirect("/dashboard");
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  const params = await searchParams;
  return <CompanyStockHub categoryRows={(categoriesResult.data ?? []) as ProductSalesCategoryIntelligenceRow[]} canUpdateCategories={access.role === "admin" || access.canWriteSupplements} initialOperation={params.operacao === "fitness" ? "fitness" : "supplements"} fitness={stock.filter((row) => row.product_active && row.variant_active).map((row) => ({ id: row.variant_id, name: row.product_name, size: row.size, color: row.color, physical: row.physical_quantity, available: row.available_quantity }))}/>;
}
