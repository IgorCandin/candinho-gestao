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

  const operations = [
    {
      key: "supplements",
      label: "Suplementos",
      href: "/suplementos",
      image: "/home-operation-cs.png",
      visible: access.canAccessSupplements,
    },
    {
      key: "fitness",
      label: "Fitness",
      href: "/fitness",
      image: "/home-operation-cf.png",
      visible: access.canAccessFitness,
    },
    {
      key: "marketing",
      label: "Marketing",
      href: "/marketing",
      image: "/home-operation-cm.png",
      visible: access.canAccessMarketing,
    },
    {
      key: "bank",
      label: "Bank",
      href: "/bank",
      image: "/home-operation-cb.png",
      visible: access.canAccessBank,
    },
    {
      key: "central",
      label: "Central",
      href: "/central",
      image: "/home-operation-cce.png",
      visible: centralVisible,
    },
  ].filter((operation) => operation.visible);

  return (
    <section className="company-home company-home-clean company-home-selector-v2 company-home-focus-v45">
      <div className="company-home-selector-brand">
        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </div>

      <div className="company-home-heading company-home-heading-compact company-home-focus-heading-v45">
        <h1>Olá, {access.name}.</h1>
        <p>Escolha sua operação.</p>
      </div>

      <nav
        className="company-home-operation-grid-v45"
        aria-label="Operações Candinho Company"
      >
        {operations.map((operation) => (
          <Link
            key={operation.key}
            className={`company-home-operation-button-v45 ${operation.key}`}
            href={operation.href}
            aria-label={`Abrir Candinho ${operation.label}`}
          >
            <span className="company-home-operation-image-v45">
              <Image
                src={operation.image}
                alt=""
                width={1000}
                height={1000}
              />
            </span>
            <span className="company-home-operation-name-v45">
              {operation.label}
            </span>
          </Link>
        ))}
      </nav>

      <div
        className="company-home-selector-actions company-home-utility-row-v45"
        aria-label="Atalhos"
      >
        <Link
          className="company-home-selector-action nexus-focus-home-v455"
          href="/nexus/foco"
        >
          <Bot size={16} />
          <span>Meu Dia</span>
        </Link>

        <Link
          className="company-home-selector-action storefront"
          href="/catalogo"
        >
          <Store size={16} />
          <span>Vitrine</span>
        </Link>

        {access.canManageUsers && (
          <Link
            className="company-home-selector-action physique-shortcut-v45"
            href="/physique"
          >
            <Activity size={16} />
            <span>Physique</span>
          </Link>
        )}

        {access.canManageUsers && (
          <Link
            className="company-home-selector-action"
            href="/configuracoes"
          >
            <UserRound size={16} />
            <span>Perfil</span>
          </Link>
        )}

        <form action="/auth/signout" method="post">
          <button className="company-home-selector-action" type="submit">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </section>
  );
}
