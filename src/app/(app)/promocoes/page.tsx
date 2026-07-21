import Image from "next/image";
import { BadgePercent } from "lucide-react";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";

export const dynamic = "force-dynamic";

export default async function PromotionsOperationPage() {
  const snapshot = await getPublicStorefrontSnapshot();
  const company = BRAND_ASSETS.company.complete;

  return (
    <section className="internal-promotions-page">
      <header className="internal-promotions-header">
        <div className="internal-promotions-brand">
          <Image
            src={company.src}
            alt={company.alt}
            width={company.width}
            height={company.height}
            priority
          />
        </div>

        <div className="internal-promotions-copy">
          <span><BadgePercent size={15} /> Curadoria operacional</span>
          <h1>Produtos & Promoções</h1>
          <p>
            Área interna para visualizar os itens de Suplementos e Fitness,
            selecionar produtos ou promoções e gerar PDF para campanha, status,
            divulgação ou atendimento.
          </p>
        </div>
      </header>

      <article className="panel internal-promotions-panel">
        <PublicStorefrontBrowser snapshot={snapshot} enableExport />
      </article>
    </section>
  );
}
