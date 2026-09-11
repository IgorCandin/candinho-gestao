import { redirect } from "next/navigation";
import { BatchInventoryTransfer } from "@/components/batch-inventory-transfer";
import { getCurrentUserAccess, getInventoryOverview, getSaleLocations } from "@/lib/data";

export default async function CompanyTransfersPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const [products, locations] = await Promise.all([getInventoryOverview(), getSaleLocations()]);
  return <div className="company-workspace-v2"><BatchInventoryTransfer products={products} locations={locations}/></div>;
}
