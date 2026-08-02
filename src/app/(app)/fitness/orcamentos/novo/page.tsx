import { redirect } from "next/navigation";
import { FitnessQuoteForm } from "@/components/fitness-quote-form";
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
        title="Novo orçamento"
        description="Use a mesma base de clientes da Company e monte a proposta por peça, tamanho e cor."
      />

      <FitnessQuoteForm
        stock={stock}
        customers={customers}
        responsible={access.name}
      />
    </>
  );
}
