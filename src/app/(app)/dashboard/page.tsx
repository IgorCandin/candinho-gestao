import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Bot,
  LogOut,
  Store,
  UserRound,
} from "lucide-react";
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
      href: "/fitness",
      // A arte horizontal ainda não foi fornecida.
      // O componente cria uma ambientação desktop premium
      // usando a própria arte vertical sem distorcê-la.
      desktopImage:
        "/operation-banners/fitness-mobile.webp",
      mobileImage:
        "/operation-banners/fitness-mobile.webp",
      desktopFit: "contain",
      tone: "fitness",
      rgb: "239, 75, 154",
      visible: access.canAccessFitness,
    },
    {
      key: "bank",
      label: "Bank",
      href: "/bank",
      desktopImage:
        "/operation-banners/bank-desktop.webp",
      mobileImage:
        "/operation-banners/bank-mobile.webp",
      tone: "bank",
      rgb: "70, 195, 123",
      visible: access.canAccessBank,
    },
    {
      key: "marketing",
      label: "Marketing",
      href: "/marketing",
      desktopImage:
        "/operation-banners/marketing-desktop.webp",
      mobileImage:
        "/operation-banners/marketing-mobile.webp",
      tone: "marketing",
      rgb: "239, 70, 70",
      visible: access.canAccessMarketing,
    },
    {
      key: "central",
      label: "Central",
      href: "/central",
      desktopImage:
        "/operation-banners/central-desktop.webp",
      mobileImage:
        "/operation-banners/central-mobile.webp",
      tone: "central",
      rgb: "54, 161, 255",
      visible: centralVisible,
    },
  ];

  const visibleOperations = operations
    .filter((operation) => operation.visible)
    .map(({ visible: _visible, ...operation }) => operation);

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
        aria-label="Acesso rápido"
      >
        <span className="company-home-utility-title-v4514">
          Acesso rápido
        </span>

        <div className="company-home-utility-links-v4514">
          <Link
            className="company-home-utility-link-v4514"
            href="/nexus/foco"
          >
            <Bot size={16} />
            <span>Meu Dia</span>
          </Link>

          <Link
            className="company-home-utility-link-v4514"
            href="/catalogo"
          >
            <Store size={16} />
            <span>Vitrine</span>
          </Link>

          {access.canManageUsers && (
            <Link
              className="company-home-utility-link-v4514 physique"
              href="/physique"
            >
              <Activity size={16} />
              <span>Physique</span>
            </Link>
          )}

          {access.canManageUsers && (
            <Link
              className="company-home-utility-link-v4514"
              href="/configuracoes"
            >
              <UserRound size={16} />
              <span>Perfil</span>
            </Link>
          )}

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
