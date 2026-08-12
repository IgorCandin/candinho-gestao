import { redirect } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import {
  CompanyOperationCarouselV4514,
  type CompanyOperationSlideV4514,
  type CompanyShowcaseProductV45243,
} from "@/components/company-operation-carousel-v45-14";
import {
  getCurrentUserAccess,
  getFitnessProducts,
  getProductCatalog,
} from "@/lib/data";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default async function DashboardPage() {
  const [
    access,
    supplementProducts,
    fitnessProducts,
  ] = await Promise.all([
    getCurrentUserAccess(),
    getProductCatalog().catch(() => []),
    getFitnessProducts().catch(() => []),
  ]);

  if (access.role === "partner") redirect("/parceiro");

  const company = BRAND_ASSETS.company.complete;

  const centralVisible =
    access.canManageUsers ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing;

  const operations: Array<
    CompanyOperationSlideV4514 & { visible: boolean }
  > = [
    {
      key: "vitrine",
      label: "Vitrine",
      href: "/catalogo",
      desktopImage:
        "/operation-banners/vitrine-desktop.webp",
      mobileImage:
        "/operation-banners/vitrine-mobile.webp",
      tone: "vitrine",
      rgb: "255, 126, 73",
      visible:
        access.canAccessSupplements ||
        access.canAccessFitness ||
        access.role === "admin",
    },
    {
      key: "supplements",
      label: "Suplementos",
      href: "/suplementos",
      desktopImage:
        "/operation-banners/supplements-desktop.webp",
      mobileImage:
        "/operation-banners/supplements-mobile.webp",
      tone: "supplements",
      rgb: "217, 164, 65",
      visible: access.canAccessSupplements,
    },
    {
      key: "fitness",
      label: "Fitness",
      href: "/fitness/inicio",
      desktopImage:
        "/operation-banners/fitness-desktop.webp",
      mobileImage:
        "/operation-banners/fitness-mobile.webp",
      tone: "fitness",
      rgb: "239, 75, 154",
      visible: access.canAccessFitness,
    },
    {
      key: "bank",
      label: "Bank",
      href: "/bank/inicio",
      desktopImage:
        "/operation-banners/bank-desktop.webp",
      mobileImage:
        "/operation-banners/bank-mobile.webp",
      tone: "bank",
      rgb: "70, 195, 123",
      visible: access.canAccessBank,
    },
    {
      key: "central",
      label: "Central",
      href: "/central/inicio",
      desktopImage:
        "/operation-banners/central-desktop.webp",
      mobileImage:
        "/operation-banners/central-mobile.webp",
      tone: "central",
      rgb: "54, 161, 255",
      visible: centralVisible,
    },
    {
      key: "physique",
      label: "Physique",
      href: "/physique/inicio",
      desktopImage:
        "/operation-banners/physique-desktop.webp",
      mobileImage:
        "/operation-banners/physique-mobile.webp",
      tone: "physique",
      rgb: "209, 119, 70",
      visible: access.active,
    },
  ];

  const visibleOperations = operations.flatMap(
    ({ visible, ...operation }) => visible ? [operation] : [],
  );

  const supplementShowcase =
    supplementProducts.flatMap<CompanyShowcaseProductV45243>(
      (product) => {
        const imageUrl =
          product.thumbnail_url ?? product.image_url;

        if (!product.active || !imageUrl) return [];

        return [{
          id: `supplements-${product.id}`,
          name: product.name,
          imageUrl,
          source: "supplements",
        }];
      },
    );

  const fitnessShowcase =
    fitnessProducts.flatMap<CompanyShowcaseProductV45243>(
      (product) => {
        if (!product.active || !product.image_url) return [];

        return [{
          id: `fitness-${product.id}`,
          name: product.name,
          imageUrl: product.image_url,
          source: "fitness",
        }];
      },
    );

  const showcaseProducts = [
    ...supplementShowcase.slice(0, 36),
    ...fitnessShowcase.slice(0, 36),
  ];

  return (
    <section className="company-home company-home-streaming-v4514">
      <form
        action="/auth/signout"
        method="post"
        className="company-home-signout-v45243"
      >
        <button
          type="submit"
          aria-label="Sair da Candinho Company"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </form>

      <div className="company-home-selector-brand company-home-brand-v4514">
        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </div>

      <CompanyOperationCarouselV4514
        operations={visibleOperations}
        showcaseProducts={showcaseProducts}
      />
    </section>
  );
}
