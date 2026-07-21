import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";

export const dynamic = "force-dynamic";

export default async function PromotionExportPage() {
  const snapshot = await getPublicStorefrontSnapshot();

  return (
    <main className="promotion-export-page">
      <header>
        <div>
          <span>Catálogo e campanhas</span>
          <h1>Selecionar e gerar PDF</h1>
          <p>
            Escolha produtos ou promoções. Seleções misturando Suplementos e
            Fitness usam Candinho Company; seleções de uma única operação usam
            a identidade visual daquela operação.
          </p>
        </div>

        <Link className="button ghost" href="/promocoes">
          <ArrowLeft size={16} />
          Voltar às promoções
        </Link>
      </header>

      <div className="panel" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <FileDown size={17} />
          <strong style={{ fontSize: 11 }}>Exportação A4 premium</strong>
        </div>

        <PublicStorefrontBrowser snapshot={snapshot} enableExport />
      </div>
    </main>
  );
}
