import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { PromotionShowcaseBrowser } from "@/components/promotion-showcase-browser";
import { getCurrentUserAccess } from "@/lib/data";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPromotionShowcase } from "@/lib/promotion-showcase-data";

export default async function PromotionsShowcasePage() {
  const access = await getCurrentUserAccess();

  const canView =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canView) redirect("/dashboard");

  const data = await getPromotionShowcase();
  const company = BRAND_ASSETS.company.complete;
  const items = [...data.supplements, ...data.fitness];

  return (
    <div className="promotion-ux-showcase-page">
      <header className="promotion-ux-showcase-hero">
        <div className="promotion-ux-showcase-brand">
          <Link href="/dashboard">
            <ArrowLeft size={16} /> Operações
          </Link>
          <Image
            src={company.src}
            alt={company.alt}
            width={company.width}
            height={company.height}
            priority
          />
        </div>

        <div>
          <span>CANDINHO COMPANY</span>
          <h1>Promoções</h1>
          <p>
            Campanhas ativas e próximas ofertas. Preços válidos enquanto durar
            o estoque; itens zerados permanecem identificados na vitrine.
          </p>
        </div>

        <Link className="promotion-ux-export" href="/promocoes/exportar">
          <FileDown size={15} />
          Gerar PDF
        </Link>
      </header>

      <main className="promotion-ux-showcase-content">
        <PromotionShowcaseBrowser items={items} />
      </main>
    </div>
  );
}
