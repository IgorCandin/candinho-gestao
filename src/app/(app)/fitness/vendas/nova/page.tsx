import { redirect } from "next/navigation";
import { FitnessSaleForm } from "@/components/fitness-sale-form";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getFitnessStock,
} from "@/lib/data";
import { getFitnessCompanyCustomerDirectory } from "@/lib/fitness-customer-directory-data";
import {
  applyFitnessStockPromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

export default async function Page() {
  const access = await getCurrentUserAccess();

  if (!access.canWriteFitness) {
    redirect("/fitness");
  }

  const [baseStock, customers, promotionRows] = await Promise.all([
    getFitnessStock(),
    getFitnessCompanyCustomerDirectory(),
    getActivePromotionRows(),
  ]);

  const stock = applyFitnessStockPromotions(
    baseStock,
    promotionRows,
  );

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Comercial"
        title="Nova venda"
        description="Clientes da Candinho Company aparecem aqui automaticamente; selecione a pessoa e siga com produto, tamanho e cor."
      />

      <FitnessSaleForm
        stock={stock}
        customers={customers}
        responsible={access.name}
      />
    </>
  );
}
