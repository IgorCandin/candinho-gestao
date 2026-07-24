import { redirect } from "next/navigation";
import { FitnessQuoteForm } from "@/components/fitness-quote-form";
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
        title="Novo orçamento"
        description="Monte a proposta por peça, tamanho e cor. As promoções ativas entram automaticamente no preço antes de gerar o PDF ou converter em venda."
      />
      <FitnessQuoteForm
        stock={stock}
        customers={customers}
        responsible={access.name}
      />
    </>
  );
}
