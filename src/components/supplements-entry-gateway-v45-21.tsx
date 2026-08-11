"use client";

import Image from "next/image";
import {
  BarChart3,
  Boxes,
  ContactRound,
  Handshake,
  Home,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_ASSETS } from "@/lib/brand-assets";

const items = [
  {
    href: "/suplementos/hoje",
    label: "Hoje",
    note: "Começar o dia",
    icon: Home,
  },
  {
    href: "/suplementos/vendas",
    label: "Comercial",
    note: "Vendas e orçamentos",
    icon: ShoppingBag,
  },
  {
    href: "/suplementos/clientes",
    label: "CRM",
    note: "Clientes e pós-venda",
    icon: ContactRound,
  },
  {
    href: "/suplementos/estoque",
    label: "Estoque e compras",
    note: "Saldo, giro e reposição",
    icon: Boxes,
  },
  {
    href: "/suplementos/produtos",
    label: "Produtos",
    note: "Catálogo e cadastro",
    icon: PackageSearch,
  },
  {
    href: "/suplementos/parceiros",
    label: "Parceiros",
    note: "Pontos e operação",
    icon: Handshake,
  },
  {
    href: "/suplementos/painel",
    label: "Gestão",
    note: "Exceções gerenciais",
    icon: BarChart3,
  },
];

export function SupplementsEntryGatewayV4521() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  function enter(href: string) {
    if (leaving) return;

    setTarget(href);
    setLeaving(true);

    window.setTimeout(() => {
      router.push(href);
    }, 560);
  }

  return (
    <section
      className={`v4521-supplements-entry ${
        leaving ? "is-leaving" : ""
      }`}
    >
      <div className="v4521-entry-ambient" />

      <div className="v4521-entry-center">
        <span className="v4521-entry-kicker">
          Candinho Suplementos
        </span>

        <div className="v4521-entry-logo-wrap">
          <span className="v4521-entry-orbit" />
          <Image
            className="v4521-entry-logo"
            src={BRAND_ASSETS.supplements.complete.src}
            alt={BRAND_ASSETS.supplements.complete.alt}
            width={BRAND_ASSETS.supplements.complete.width}
            height={BRAND_ASSETS.supplements.complete.height}
            priority
          />
        </div>

        <p>
          Qualidade que entrega resultado.
        </p>
      </div>

      <nav
        className="v4521-entry-menu"
        aria-label="Entrar em Suplementos"
      >
        {items.map(({ href, label, note, icon: Icon }, index) => (
          <button
            type="button"
            key={href}
            onClick={() => enter(href)}
            className={
              target === href ? "is-target" : ""
            }
            style={
              {
                "--entry-index": index,
              } as React.CSSProperties
            }
          >
            <Icon size={20} />
            <span>
              <strong>{label}</strong>
              <small>{note}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="v4521-entry-line" />
    </section>
  );
}
