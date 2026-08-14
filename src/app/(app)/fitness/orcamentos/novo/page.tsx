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
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    interest?: string;
  }>;
}) {
  const access = await getCurrentUserAccess();

  if (!access.canWriteFitness) {
    redirect("/fitness");
  }

  const params = await searchParams;
  const interestId =
    typeof params.interest === "string"
      ? params.interest
      : null;

  const [baseStock, customers, promotionRows, interest] =
    await Promise.all([
      getFitnessStock(),
      getFitnessCompanyCustomerDirectory(),
      getActivePromotionRows(),
      getInterestContext(interestId),
    ]);

  const stock = applyFitnessStockPromotions(
    baseStock,
    promotionRows,
  );

  const initialNotes = interest
    ? [
        "Origem: interesse da Vitrine Fitness",
        interest.context_summary,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor de Vendas"
        title="Novo orçamento"
        description={
          interest
            ? "A cliente veio da Vitrine Fitness. Nome, telefone e contexto foram reaproveitados para você continuar o atendimento sem cadastrar tudo de novo."
            : "Use a base única da Candinho Company e monte a proposta por peça, tamanho e cor."
        }
      />

      <FitnessQuoteForm
        stock={stock}
        customers={customers}
        responsible={access.name}
        initialCustomerId={interest?.customer_id ?? null}
        initialCustomerName={interest?.name ?? null}
        initialCustomerPhone={interest?.phone ?? null}
        initialSource={interest ? "Vitrine Fitness" : null}
        initialNotes={initialNotes}
      />
    </>
  );
}

async function getInterestContext(
  interestId: string | null,
) {
  if (!interestId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_public_leads")
    .select(
      "id,name,phone,customer_id,context_summary,fitness_product_id,inbox_status",
    )
    .eq("id", interestId)
    .not("fitness_product_id", "is", null)
    .maybeSingle();

  if (!data) return null;

  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    customer_id:
      typeof data.customer_id === "string"
        ? data.customer_id
        : null,
    context_summary:
      typeof data.context_summary === "string"
        ? data.context_summary
        : null,
  };
}
