import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";

export const dynamic = "force-dynamic";

export default async function PromotionExportPage({
  searchParams,
}: {
  searchParams: Promise<{ promotion?: string }>;
}) {
  const params = await searchParams;
  const promotionId = params.promotion?.trim() || null;
  const snapshot = await getPublicStorefrontSnapshot();

  const campaignItems = promotionId
    ? [
        ...snapshot.promotions.supplements,
        ...snapshot.promotions.fitness,
      ].filter((item) => item.promotion_id === promotionId)
    : [];
  const campaignName = campaignItems[0]?.promotion_name ?? null;

  return (
    <main className="promotion-export-page">
      <header>
        <div>
          <span>Catálogo e campanhas</span>
          <h1>{campaignName ? `Exportar ${campaignName}` : "Selecionar e gerar PDF"}</h1>
          <p>
            {campaignName
              ? "Os produtos desta promoção já estão selecionados. Itens zerados aparecem em cinza com a indicação de estoque esgotado."
              : "Escolha produtos ou promoções. Seleções misturando Suplementos e Fitness usam Candinho Company; uma única operação usa a identidade daquela operação."}
          </p>
        </div>

        <Link className="button ghost" href="/promocoes">
          <ArrowLeft size={16} />
          Voltar às promoções
        </Link>
      </header>

      <div className="panel" style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <FileDown size={17} />
          <strong style={{ fontSize: 11 }}>
            Exportação A4 premium · ofertas enquanto durar o estoque
          </strong>
        </div>

        <PublicStorefrontBrowser
          snapshot={snapshot}
          enableExport
          initialView={promotionId ? "promotions" : "products"}
          initialPromotionId={promotionId}
        />
      </div>
    </main>
  );
}
