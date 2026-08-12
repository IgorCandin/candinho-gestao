import { redirect } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import {
  CompanyOperationCarouselV4514,
  type CompanyOperationSlideV4514,
} from "@/components/company-operation-carousel-v45-14";
import { getCurrentUserAccess } from "@/lib/data";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();

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
      key: "vitrine",
      label: "Vitrine",
      href: "/catalogo",
      desktopImage:
        "/operation-banners/vitrine-desktop.webp",
      mobileImage:
        "/operation-banners/vitrine-mobile.webp",
      tone: "vitrine",
      rgb: "255, 126, 73",
      visible: access.canAccessSupplements,
    },
    {
      key: "physique",
      label: "Physique",
      href: "/physique",
      desktopImage:
        "/operation-banners/physique-desktop.webp",
      mobileImage:
        "/operation-banners/physique-mobile.webp",
      tone: "physique",
      rgb: "209, 119, 70",
      visible: access.canManageUsers,
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
  ];

  const visibleOperations = operations.flatMap(
    ({ visible, ...operation }) => visible ? [operation] : [],
  );

  return (
    <section className="company-home company-home-streaming-v4514">
      <div className="company-home-selector-brand company-home-brand-v4514">
        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </div>

      <header className="company-home-heading-v4514">
        <span>HOME · CANDINHO COMPANY</span>
        <h1>Olá, {access.name}.</h1>
        <p>Escolha a operação para continuar.</p>
      </header>

      <CompanyOperationCarouselV4514
        operations={visibleOperations}
      />

      <div
        className="company-home-utility-row-v4514"
        aria-label="Sessão"
      >
        <div className="company-home-utility-links-v4514">
          <form action="/auth/signout" method="post">
            <button
              className="company-home-utility-link-v4514"
              type="submit"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
