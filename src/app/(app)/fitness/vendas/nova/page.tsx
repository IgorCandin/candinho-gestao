import { redirect } from "next/navigation";
import { FitnessSaleForm } from "@/components/fitness-sale-form";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getFitnessCustomers,
  getFitnessStock,
} from "@/lib/data";
import {
  applyFitnessStockPromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

export default async function Page() {
  const access = await getCurrentUserAccess();
  if (!access.canWriteFitness) redirect("/fitness");

  const [baseStock, customers, promotionRows] = await Promise.all([
    getFitnessStock(),
    getFitnessCustomers(),
    getActivePromotionRows(),
  ]);

  const stock = applyFitnessStockPromotions(baseStock, promotionRows);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Comercial"
        title="Nova venda"
        description="Venda por produto, tamanho e cor. Promoções ativas entram automaticamente no preço e o estoque é reservado até a entrega."
      />
      <FitnessSaleForm
        stock={stock}
        customers={customers}
        responsible={access.name}
      />
    </>
  );
}
