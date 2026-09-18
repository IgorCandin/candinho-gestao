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

export default async function NewSalePage<T extends {
  searchParams: Promise<{ quote?: string; cliente?: string; produto?: string; lead?: string }>;
}>(props: T) {
  const { searchParams } = props;
  const companyMode = Boolean((props as T & { companyMode?: boolean }).companyMode);
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
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const today = `${dateParts.find((part) => part.type === "year")?.value}-${dateParts.find((part) => part.type === "month")?.value}-${dateParts.find((part) => part.type === "day")?.value}`;

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title={
          initialQuote
            ? "Revisar Orçamento"
            : "Nova venda ou orçamento"
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
        initialCustomerId={!initialQuote && customers.some((item) => item.id === params.cliente) ? params.cliente : undefined}
        initialProductId={!initialQuote && stock.some((item) => item.product_id === params.produto) ? params.produto : undefined}
        today={today}
        companyMode={companyMode}
      />
    </>
  );
}
