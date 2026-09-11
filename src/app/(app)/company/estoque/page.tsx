import { redirect } from "next/navigation";
import { CompanyStockHub } from "@/components/company-stock-hub";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";

export default async function CompanyStockPage({ searchParams }: { searchParams: Promise<{ operacao?: string }> }) {
  const [access, stock] = await Promise.all([getCurrentUserAccess(), getFitnessStock()]);
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const params = await searchParams;
  return <CompanyStockHub initialOperation={params.operacao === "fitness" ? "fitness" : "supplements"} fitness={stock.filter((row) => row.product_active && row.variant_active).map((row) => ({ id: row.variant_id, name: row.product_name, size: row.size, color: row.color, physical: row.physical_quantity, available: row.available_quantity }))}/>;
}
