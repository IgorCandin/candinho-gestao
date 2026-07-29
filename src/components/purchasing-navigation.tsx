"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  BrainCircuit,
  Building2,
  ListChecks,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react";

function activeFor(pathname: string, href: string) {
  if (href === "/estoque") {
    return pathname === "/estoque" || pathname.startsWith("/estoque/");
  }

  if (href === "/pedidos-fornecedor") {
    return pathname === "/pedidos-fornecedor";
  }

  return pathname.startsWith(href);
}

export function PurchasingNavigation() {
  const pathname = usePathname();

  const visible =
    pathname === "/estoque" ||
    pathname.startsWith("/estoque/") ||
    pathname === "/pedidos-fornecedor" ||
    pathname.startsWith("/pedidos-fornecedor/") ||
    pathname === "/fornecedores" ||
    pathname.startsWith("/fornecedores/");

  if (!visible) return null;

  const items = [
    {
      href: "/estoque",
      label: "Estoque",
      icon: Boxes,
    },
    {
      href: "/pedidos-fornecedor/proximo-pedido",
      label: "Próximo pedido",
      icon: ListChecks,
      emphasis: true,
    },
    {
      href: "/pedidos-fornecedor",
      label: "Pedidos em aberto",
      icon: Truck,
    },
    {
      href: "/pedidos-fornecedor/novo",
      label: "Novo pedido",
      icon: Plus,
    },
    {
      href: "/fornecedores",
      label: "Fornecedores",
      icon: Building2,
    },
    {
      href: "/pedidos-fornecedor/planejamento",
      label: "Inteligência",
      icon: BrainCircuit,
    },
  ];

  return (
    <section className="purchasing-navigation" aria-label="Estoque e compras">
      <div className="purchasing-navigation-title">
        <ShoppingCart size={17} />
        <div>
          <strong>Estoque e compras</strong>
          <small>
            Estoque, reposição e pedidos no mesmo lugar.
          </small>
        </div>
      </div>

      <nav className="purchasing-navigation-links">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeFor(pathname, item.href);

          return (
            <Link
              href={item.href}
              key={item.href}
              className={[
                "purchasing-navigation-link",
                active ? "active" : "",
                item.emphasis ? "emphasis" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
