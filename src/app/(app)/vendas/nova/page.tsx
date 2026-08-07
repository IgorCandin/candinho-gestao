import { CommercialSaleRefinementUX } from "@/components/commercial-sale-refinement-ux";
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

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const params = await searchParams;
  const quoteId = params.quote?.trim() || null;

  const [
    customers,
    locations,
    partners,
    stock,
    combos,
    initialQuote,
    promotionRows,
  ] = await Promise.all([
    getCustomerOptions(),
    getSaleLocations(),
    getSalePartners(),
    getSaleStockOptions(),
    getProductComboSaleOptions(),
    quoteId ? getQuoteDraft(quoteId) : Promise.resolve(null),
    getActivePromotionRows(),
  ]);

  const regularPrices = Object.fromEntries(
    stock.map((row) => [row.product_id, Number(row.sale_price ?? 0)]),
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial"
        title={initialQuote ? "Revisar Orçamento" : "Novo Orçamento"}
        description={
          initialQuote
            ? `Orçamento #${initialQuote.quote_number} salvo. Revise a proposta e, se o cliente confirmou, avance para a venda.`
            : "Monte a proposta com o preço normal. Promoções ativas ficam disponíveis como escolha explícita em cada produto."
        }
      />

      <CommercialSaleRefinementUX
        promotions={promotionRows}
        regularPrices={regularPrices}
        hasSavedQuote={Boolean(initialQuote)}
      />

      <NewSaleForm
        customers={customers}
        locations={locations}
        partners={partners}
        stock={stock}
        combos={combos}
        initialQuote={initialQuote}
      />
    </>
  );
}
