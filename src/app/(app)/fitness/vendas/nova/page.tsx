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
  const searchParams = (props as T & { searchParams?: Promise<{ interest?: string }> }).searchParams;
  const interestId = (await searchParams)?.interest;
  const access = await getCurrentUserAccess();

  if (!access.canWriteFitness) {
    redirect(companyMode ? "/company/vender" : "/fitness");
  }

  const supabase = await createClient();
  const [baseStock, customers, promotionRows, waitingResult, interestResult] = await Promise.all([
    getFitnessStock(),
    getFitnessCompanyCustomerDirectory(),
    getActivePromotionRows(),
    supabase.from("fitness_stock_reservations").select("variant_id,quantity_requested,quantity_reserved").in("status", ["awaiting_stock", "partial"]),
    interestId
      ? supabase.from("catalog_public_leads").select("name,phone,customer_id,context_summary").eq("id", interestId).not("fitness_product_id", "is", null).maybeSingle()
      : Promise.resolve({ data: null }),
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
  const interest = interestResult.data;
  const interestPhone = String(interest?.phone ?? "").replace(/\D/g, "");
  const matchedCustomer = interest
    ? customers.find((customer) => customer.id === interest.customer_id)
      ?? customers.find((customer) => interestPhone && customer.phone?.replace(/\D/g, "") === interestPhone)
    : null;
  const initialNotes = interest
    ? ["Origem: interesse da Vitrine Fitness", interest.context_summary].filter(Boolean).join("\n")
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Comercial"
        title="Nova venda"
        description={interest ? `Interesse da Vitrine de ${interest.name || "cliente"}. Confira o cliente e siga com produto, tamanho e cor.` : "Clientes da Candinho Company aparecem aqui automaticamente; selecione a pessoa e siga com produto, tamanho e cor."}
      />

      <FitnessSaleForm
        stock={stock}
        customers={customers}
        responsible={access.name}
        companyMode={companyMode}
        waitingByVariant={waitingByVariant}
        initialCustomerId={matchedCustomer?.id}
        initialNotes={initialNotes}
      />
    </>
  );
}
