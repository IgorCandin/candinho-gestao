import { CommercialSaleRefinementUX } from "@/components/commercial-sale-refinement-ux";
import { CommercialBudgetOptionalPanelsV45234 } from "@/components/commercial-budget-optional-panels-v45-23-4";
import { DemoBanner } from "@/components/demo-banner";
import { NewSaleForm } from "@/components/new-sale-form";
import { PageHeader } from "@/components/page-header";
import {
  getCustomerOptions,
  getProductComboSaleOptions,
  getQuoteDraft,
  getSaleLocations,
  getSalePartners,
  getSaleStockOptions,
} from "@/lib/data";
import { getActivePromotionRows } from "@/lib/active-promotion-data";
import { createClient } from "@/lib/supabase/server";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const params = await searchParams;
  const quoteId = params.quote?.trim() || null;
  const supabase = await createClient();

  const [
    customers,
    locations,
    partners,
    stock,
    combos,
    initialQuote,
    promotionRows,
    durationResult,
  ] = await Promise.all([
    getCustomerOptions(),
    getSaleLocations(),
    getSalePartners(),
    getSaleStockOptions(),
    getProductComboSaleOptions(),
    quoteId ? getQuoteDraft(quoteId) : Promise.resolve(null),
    getActivePromotionRows(),
    supabase
      .from("products")
      .select("id,duration_days,last_purchase_cost,last_purchase_on")
      .eq("active", true),
  ]);

  const regularPrices = Object.fromEntries(
    stock.map((row) => [
      row.product_id,
      Number(row.sale_price ?? 0),
    ]),
  );

  const productDurations = Object.fromEntries(
    (durationResult.data ?? []).map((row) => [
      row.id,
      Math.max(1, Number(row.duration_days ?? 30)),
    ]),
  );
  const lastPurchaseCosts = Object.fromEntries(
    (durationResult.data ?? []).map((row) => [
      row.id,
      {
        cost:
          row.last_purchase_cost === null
            ? null
            : Number(row.last_purchase_cost),
        purchasedOn:
          row.last_purchase_on === null
            ? null
            : String(row.last_purchase_on),
      },
    ]),
  );

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title={
          initialQuote
            ? "Revisar Orçamento"
            : "Novo Orçamento"
        }
        description={
          initialQuote
            ? `Orçamento #${initialQuote.quote_number} salvo. Revise a proposta e confirme quando o cliente fechar.`
            : "Monte a proposta. Se o cliente já fechou, escolha Orçamento confirmado para concluir pagamento, entrega e agenda inteligente no mesmo fluxo."
        }
      />

      <CommercialSaleRefinementUX
        promotions={promotionRows}
        regularPrices={regularPrices}
        productDurations={productDurations}
        hasSavedQuote={Boolean(initialQuote)}
      />

      <CommercialBudgetOptionalPanelsV45234 />

      <NewSaleForm
        customers={customers}
        locations={locations}
        partners={partners}
        stock={stock}
        combos={combos}
        lastPurchaseCosts={lastPurchaseCosts}
        initialQuote={initialQuote}
      />
    </>
  );
}
