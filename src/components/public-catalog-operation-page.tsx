import Image from "next/image";
import Link from "next/link";
import { Dumbbell, LogIn, Sparkles, Store } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { PublicCatalogCardLinks } from "@/components/public-catalog-card-links";
import { PublicCatalogGuide } from "@/components/public-catalog-guide";
import { PublicCatalogOperationLock } from "@/components/public-catalog-operation-lock";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { PublicStorefrontVisualEnhancer } from "@/components/public-storefront-visual-enhancer";
import { PublicStorefrontCompanyUX } from "@/components/public-storefront-company-ux";
import { PublicFitnessAvailabilityEnhancer } from "@/components/public-fitness-availability-enhancer";
import { getPublicStorefrontSlugMap } from "@/lib/public-product-page-data";
import {
  getPublicStorefrontSnapshot,
  type PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";
import { getPublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";

export type PublicCatalogOperation = "supplements" | "fitness";

function isolateSnapshot(
  snapshot: PublicStorefrontSnapshot,
  operation: PublicCatalogOperation,
): PublicStorefrontSnapshot {
  return {
    products: {
      supplements:
        operation === "supplements"
          ? snapshot.products.supplements
          : [],
      fitness:
        operation === "fitness"
          ? snapshot.products.fitness
          : [],
    },
    promotions: {
      supplements:
        operation === "supplements"
          ? snapshot.promotions.supplements
          : [],
      fitness:
        operation === "fitness"
          ? snapshot.promotions.fitness
          : [],
    },
    categories: {
      supplements:
        operation === "supplements"
          ? snapshot.categories.supplements
          : [],
      fitness:
        operation === "fitness"
          ? snapshot.categories.fitness
          : [],
    },
    generated_at: snapshot.generated_at,
  };
}

export async function PublicCatalogOperationPage({
  operation,
}: {
  operation: PublicCatalogOperation;
}) {
  const [snapshot, productLinks, fitnessAvailability] =
    await Promise.all([
      getPublicStorefrontSnapshot(),
      getPublicStorefrontSlugMap(),
      getPublicFitnessAvailabilityMap(),
    ]);

  const isolatedSnapshot = isolateSnapshot(snapshot, operation);
  const isFitness = operation === "fitness";
  const brand = isFitness
    ? BRAND_ASSETS.fitness.complete
    : BRAND_ASSETS.supplements.complete;

  return (
    <main
      className="public-storefront-page"
      data-catalog-operation={operation}
    >
      <PublicCatalogCardLinks links={productLinks} />
      <PublicCatalogOperationLock operation={operation} />
      <PublicStorefrontCompanyUX snapshot={isolatedSnapshot} />
      <PublicStorefrontVisualEnhancer snapshot={isolatedSnapshot} />

      {isFitness && (
        <PublicFitnessAvailabilityEnhancer
          snapshot={isolatedSnapshot}
          availability={fitnessAvailability}
        />
      )}

      <header className="public-storefront-header">
        <div className="public-storefront-header-top">
          <Image
            src={brand.src}
            alt={brand.alt}
            width={brand.width}
            height={brand.height}
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
            {isFitness ? <Dumbbell size={15} /> : <Store size={15} />}
            {isFitness
              ? " Vitrine Candinho Fitness"
              : " Vitrine Candinho Suplementos"}
          </span>

          <h1>
            {isFitness
              ? "Moda fitness direto ao ponto."
              : "Suplementos direto ao ponto."}
          </h1>

          <p>
            {isFitness
              ? "Veja somente as peças Fitness disponíveis agora, com fotos, tamanhos, cores, preços e promoções."
              : "Veja somente os suplementos disponíveis agora, com preços, categorias e promoções atualizadas."}
          </p>

          <span>
            <Sparkles size={14} />
            Estoque e promoções vêm diretamente do ERP.
          </span>
        </div>
      </header>

      <section className="public-storefront-content">
        {!isFitness && <PublicCatalogGuide />}

        <PublicStorefrontBrowser
          snapshot={isolatedSnapshot}
        />
      </section>
    </main>
  );
}
