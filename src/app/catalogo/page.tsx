import Image from "next/image";
import Link from "next/link";
import { LogIn, Sparkles, Store } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { PublicBackorderSection } from "@/components/public-backorder-section";
import { PublicCatalogCardLinks } from "@/components/public-catalog-card-links";
import { PublicCatalogGuide } from "@/components/public-catalog-guide";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { PublicStorefrontVisualEnhancer } from "@/components/public-storefront-visual-enhancer";
import { PublicStorefrontCompanyUX } from "@/components/public-storefront-company-ux";
import { PublicFitnessAvailabilityEnhancer } from "@/components/public-fitness-availability-enhancer";
import {
  getPublicStorefrontSlugMap,
} from "@/lib/public-product-page-data";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import { getPublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { getPublicSupplementBackorders } from "@/lib/public-backorder-data";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage() {
  const [
    snapshot,
    productLinks,
    fitnessAvailability,
    backorders,
  ] = await Promise.all([
    getPublicStorefrontSnapshot(),
    getPublicStorefrontSlugMap(),
    getPublicFitnessAvailabilityMap(),
    getPublicSupplementBackorders(),
  ]);

  const company = BRAND_ASSETS.company.complete;

  return (
    <main className="public-storefront-page">
      <PublicCatalogCardLinks links={productLinks} />
      <PublicStorefrontCompanyUX snapshot={snapshot} />
      <PublicStorefrontVisualEnhancer snapshot={snapshot} />
      <PublicFitnessAvailabilityEnhancer
        snapshot={snapshot}
        availability={fitnessAvailability}
      />

      <header className="public-storefront-header">
        <div className="public-storefront-header-top">
          <Image
            src={company.src}
            alt={company.alt}
            width={company.width}
            height={company.height}
            priority
          />

          <Link
            className="public-storefront-login"
            href="/login"
          >
            <LogIn size={16} />
            Área interna
          </Link>
        </div>

        <div className="public-storefront-hero">
          <span>
            <Store size={15} /> Vitrine Candinho
          </span>
          <h1>
            Encontre o produto certo sem complicar.
          </h1>
          <p>
            Veja o que está disponível agora, amplie as
            fotos, confira tamanho e cor, navegue pelas
            opções e converse com o Nexus para filtrar o
            catálogo.
          </p>
          <span>
            <Sparkles size={14} /> Estoque e promoções vêm
            diretamente do ERP.
          </span>
        </div>
      </header>

      <section className="public-storefront-content">
        <PublicCatalogGuide />
        <PublicStorefrontBrowser snapshot={snapshot} />
        <PublicBackorderSection products={backorders} />
      </section>
    </main>
  );
}
