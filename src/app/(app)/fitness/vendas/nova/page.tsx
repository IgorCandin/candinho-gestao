import { redirect } from "next/navigation";
import { FitnessSaleForm } from "@/components/fitness-sale-form";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getFitnessStock,
} from "@/lib/data";
import { getFitnessCompanyCustomerDirectory } from "@/lib/fitness-customer-directory-data";
import { createClient } from "@/lib/supabase/server";
import {
  applyFitnessStockPromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

export default async function Page<T extends object>(props: T) {
  const companyMode = Boolean((props as T & { companyMode?: boolean }).companyMode);
  const access = await getCurrentUserAccess();

  if (!access.canWriteFitness) {
    redirect(companyMode ? "/company/vender" : "/fitness");
  }

  const supabase = await createClient();
  const [baseStock, customers, promotionRows, waitingResult] = await Promise.all([
    getFitnessStock(),
    getFitnessCompanyCustomerDirectory(),
    getActivePromotionRows(),
    supabase.from("fitness_stock_reservations").select("variant_id,quantity_requested,quantity_reserved").in("status", ["awaiting_stock", "partial"]),
  ]);
  if (waitingResult.error) throw new Error(waitingResult.error.message);
  const waitingByVariant: Record<string, number> = {};
  for (const row of waitingResult.data ?? []) {
    const id = String(row.variant_id);
    waitingByVariant[id] = (waitingByVariant[id] ?? 0) + Math.max(Number(row.quantity_requested) - Number(row.quantity_reserved), 0);
  }

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
        companyMode={companyMode}
        waitingByVariant={waitingByVariant}
      />
    </>
  );
}
