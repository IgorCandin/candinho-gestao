"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  Dumbbell,
  Handshake,
  History,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  ShoppingBag,
  UserRoundPlus,
} from "lucide-react";
import type { UserAccess } from "@/lib/access";

const supplementNav = [
  { href: "/suplementos", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/clientes", label: "CRM", icon: ContactRound },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];

const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];
const fitnessNav = [{ href: "/fitness", label: "Início Fitness", icon: Dumbbell }];

export function AppShell({
  children,
  access,
}: {
  children: React.ReactNode;
  access: UserAccess;
}) {
  const pathname = usePathname();
  const isHub = pathname === "/dashboard";
  const isFitness = pathname.startsWith("/fitness");
  const isSettings = pathname.startsWith("/configuracoes");
  const isSupplements = !isHub && !isFitness && !isSettings;

  const nav = isHub ? hubNav : isFitness ? fitnessNav : supplementNav;
  const mobile = nav.slice(0, 5);
  const showSupplementActions = access.canWriteSupplements && isSupplements;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/suplementos") return pathname === href;
    if (href === "/vendas") return pathname.startsWith("/vendas") || pathname.startsWith("/leads");
    return pathname.startsWith(href);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand brand-logo-link" aria-label="Candinho Company — Início">
          <Image
            className="sidebar-company-logo"
            src="/candinho-company-logo.webp"
            alt="Candinho Company"
            width={1000}
            height={343}
            priority
          />
        </Link>

        <nav className="nav">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link className={`nav-link ${isActive(href) ? "primary" : ""}`} href={href} key={href} title={label}>
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user"><span>{access.name}</span><small>{access.email ?? "Acesso local"}</small></div>
          <p className="sidebar-slogan">Qualidade que entrega resultado.</p>
          {access.canManageUsers && (
            <Link className="nav-link" href="/configuracoes" title="Configurações">
              <Settings size={18} />
              <span className="nav-label">Configurações</span>
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="nav-link" style={{ width: "100%", border: 0, background: "transparent" }} title="Sair">
              <LogOut size={18} />
              <span className="nav-label">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        {showSupplementActions && (
          <header className="topbar">
            <div className="topbar-actions">
              <Link className="button ghost" href="/leads/novo">
                <UserRoundPlus size={16} />
                Novo lead
              </Link>
              <Link className="button gold" href="/vendas/nova">
                <CircleDollarSign size={16} />
                Nova venda
              </Link>
            </div>
          </header>
        )}
        <div className={`content ${isHub ? "content-hub" : ""}`}>{children}</div>
      </main>

      {!isHub && mobile.length > 0 && (
        <nav
          className="mobile-nav"
          style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}
        >
          {mobile.map(({ href, label, icon: Icon }) => (
            <Link className={`mobile-link ${isActive(href) ? "primary" : ""}`} href={href} key={href}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
