import { redirect } from "next/navigation";
import { FitnessPurchaseOrderForm } from "@/components/fitness-purchase-order-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getFitnessStock, getFitnessSuppliers } from "@/lib/data";

export default async function CompanyNewFitnessOrderPage({ searchParams }: { searchParams: Promise<{ variantes?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.canWriteFitness && access.role !== "admin") redirect("/company/compras");
  const params = await searchParams;
  const initialVariantIds = (params.variantes ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const [stock, suppliers] = await Promise.all([getFitnessStock(), getFitnessSuppliers()]);
  return <><PageHeader eyebrow="Company · Compras · Fitness" title="Novo pedido" description="As sugestões selecionadas já entram separadas por produto, cor e tamanho."/><FitnessPurchaseOrderForm stock={stock} suppliers={suppliers} responsible={access.name} companyMode initialVariantIds={initialVariantIds}/></>;
}
