import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Store,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { PublicBackorderSection } from "@/components/public-backorder-section";
import { PublicCatalogCardLinks } from "@/components/public-catalog-card-links";
import { PublicCatalogGuide } from "@/components/public-catalog-guide";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { PublicStorefrontVisualEnhancer } from "@/components/public-storefront-visual-enhancer";
import { PublicStorefrontCompanyUX } from "@/components/public-storefront-company-ux";
import { PublicStorefrontEditorialV4526 } from "@/components/public-storefront-editorial-v45-26";
import { PublicFitnessAvailabilityEnhancer } from "@/components/public-fitness-availability-enhancer";
import {
  getPublicStorefrontSlugMap,
} from "@/lib/public-product-page-data";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import { getPublicStorefrontTopSellers } from "@/lib/public-storefront-top-sellers";
import { getPublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { getPublicSupplementBackorders } from "@/lib/public-backorder-data";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage() {
  const [
    snapshot,
    productLinks,
    fitnessAvailability,
    backorders,
    topSellers,
  ] = await Promise.all([
    getPublicStorefrontSnapshot(),
    getPublicStorefrontSlugMap(),
    getPublicFitnessAvailabilityMap(),
    getPublicSupplementBackorders(),
    getPublicStorefrontTopSellers(3).catch(() => []),
  ]);

  const company =
    BRAND_ASSETS.company.complete;

  return (
    <main className="public-storefront-page">
      <PublicCatalogCardLinks
        links={productLinks}
      />
      <PublicStorefrontCompanyUX
        snapshot={snapshot}
      />
      <PublicStorefrontVisualEnhancer
        snapshot={snapshot}
      />
      <PublicFitnessAvailabilityEnhancer
        snapshot={snapshot}
        availability={fitnessAvailability}
      />

      <header className="public-storefront-header public-storefront-header-v4532">
        <div className="public-storefront-header-top public-storefront-header-top-v4527 public-storefront-header-top-v4532">
          <Link
            href="/dashboard"
            className="public-storefront-company-link-v4527 public-storefront-company-link-v4532"
            aria-label="Voltar para Operações Candinho Company"
          >
            <Image
              src={company.src}
              alt={company.alt}
              width={company.width}
              height={company.height}
              priority
            />
          </Link>
        </div>

        <div className="public-storefront-hero public-storefront-hero-v4532">
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

      <Link
        href="/catalogo/creatina-300g-candinho-suplementos"
        className="public-storefront-creatina-banner-v4527"
        aria-label="Abrir Creatina 300g Candinho Suplementos"
      >
        <Image
          src="/vitrine/creatina-candinho-hero-v4527.png"
          alt="Creatina Candinho 300g monohidratada"
          width={1983}
          height={793}
          priority
        />
      </Link>

      <PublicStorefrontEditorialV4526
        snapshot={snapshot}
        links={productLinks}
        topSellers={topSellers}
      />

      <section
        className="public-storefront-content"
        id="catalogo-completo"
      >
        <PublicCatalogGuide />
        <PublicStorefrontBrowser
          snapshot={snapshot}
        />
        <PublicBackorderSection
          products={backorders}
        />
      </section>
    </main>
  );
}
