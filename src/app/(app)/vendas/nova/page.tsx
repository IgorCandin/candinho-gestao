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
import {
  applySupplementSalePromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

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
    baseStock,
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

  const stock = applySupplementSalePromotions(
    baseStock,
    promotionRows,
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial"
        title="Novo Orçamento"
        description={
          initialQuote
            ? `Revise o orçamento #${initialQuote.quote_number} e confirme quando o cliente fechar.`
            : "Monte a proposta com os preços promocionais ativos, aplique desconto ou brinde e escolha entre confirmar a venda ou salvar apenas como cotação."
        }
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
