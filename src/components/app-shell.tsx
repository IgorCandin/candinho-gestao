"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  Handshake,
  History,
  Home,
  LogOut,
  Menu,
  Building2,
  PackageSearch,
  Settings,
  ShoppingBag,
  Truck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import type { UserAccess } from "@/lib/access";

const supplementNav = [
  { href: "/suplementos", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/clientes", label: "CRM", icon: ContactRound },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];

const fitnessNav = [
  { href: "/fitness", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/fitness/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/fitness/estoque", label: "Estoque", icon: History },
  { href: "/fitness/clientes", label: "Clientes", icon: UsersRound },
  { href: "/fitness/pedidos", label: "Pedidos", icon: Truck },
  { href: "/fitness/fornecedores", label: "Fornecedores", icon: Handshake },
  { href: "/fitness/movimentacoes", label: "Movimentações", icon: History },
];

const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];

export function AppShell({ children, access }: { children: React.ReactNode; access: UserAccess }) {
  const pathname = usePathname();
  const isHub = pathname === "/dashboard";
  const isFitness = pathname.startsWith("/fitness");
  const isSettings = pathname.startsWith("/configuracoes");
  const isSupplements = !isHub && !isFitness && !isSettings;

  const nav = isHub ? hubNav : isFitness ? fitnessNav : supplementNav;
  const mobileShortcuts = isFitness
    ? [
        { href: "/fitness/pedidos/novo", label: "Novo pedido", icon: Truck, primary: false },
        { href: "/fitness/vendas/nova", label: "Nova venda", icon: CircleDollarSign, primary: true },
        { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch, primary: false },
      ]
    : [
        { href: "/leads/novo", label: "Novo lead", icon: UserRoundPlus, primary: false },
        { href: "/vendas/nova", label: "Nova venda", icon: CircleDollarSign, primary: true },
        { href: "/produtos", label: "Produtos", icon: PackageSearch, primary: false },
      ];
  const mobileMenuNav = nav.filter(({ href }) =>
    isFitness ? href !== "/fitness/produtos" : href !== "/produtos"
  );
  const showSupplementActions = access.canWriteSupplements && isSupplements;
  const showFitnessActions = access.canWriteFitness && isFitness;
  const brand = isFitness
    ? { src: "/candinho-fitness-logo.webp", alt: "Candinho Fitness" }
    : isSupplements
      ? { src: "/candinho-suplementos-logo.webp", alt: "Candinho Suplementos" }
      : { src: "/candinho-company-logo.webp", alt: "Candinho Company" };

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/suplementos") return pathname === href;
    if (href === "/fitness") return pathname === href;
    if (href === "/vendas") return pathname.startsWith("/vendas") || pathname.startsWith("/leads");
    return pathname.startsWith(href);
  }

  // A tela de escolha da operação é intencionalmente limpa: sem sidebar,
  // cabeçalho móvel ou navegação duplicada.
  if (isHub) {
    return (
      <main className="hub-standalone">
        <div className="content content-hub">{children}</div>
      </main>
    );
  }

  return (
    <div className={`app-shell theme-${isHub ? "hub" : isFitness ? "fitness" : "supplements"}`}>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand brand-logo-link" aria-label={`${brand.alt} — voltar às operações`}>
          <Image className="sidebar-company-logo" src={brand.src} alt={brand.alt} width={1000} height={343} priority />
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

      <header className="mobile-header">
        <Link href="/dashboard" className="mobile-brand-link" aria-label={`${brand.alt} — voltar às operações`}>
          <Image className="mobile-operation-logo" src={brand.src} alt={brand.alt} width={1000} height={343} priority />
        </Link>

        <details className="mobile-menu">
          <summary aria-label="Abrir menu">
            <Menu size={20} />
            <span>Menu</span>
          </summary>
          <div className="mobile-menu-panel">
            {!isHub && (
              <Link className="mobile-menu-link operation-switch" href="/dashboard">
                <Building2 size={18} />
                <span>Trocar operação</span>
              </Link>
            )}
            {mobileMenuNav.map(({ href, label, icon: Icon }) => (
              <Link className={`mobile-menu-link ${isActive(href) ? "primary" : ""}`} href={href} key={`mobile-menu-${href}`}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            {access.canManageUsers && (
              <Link className="mobile-menu-link" href="/configuracoes">
                <Settings size={18} />
                <span>Configurações</span>
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button className="mobile-menu-link mobile-signout" type="submit">
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </form>
          </div>
        </details>
      </header>

      <main className="main">
        {(showSupplementActions || showFitnessActions) && (
          <header className="topbar">
            <div className="topbar-actions">
              {showSupplementActions && <>
                <Link className="button ghost" href="/leads/novo"><UserRoundPlus size={16} />Novo lead</Link>
                <Link className="button gold" href="/vendas/nova"><CircleDollarSign size={16} />Nova venda</Link>
              </>}
              {showFitnessActions && <>
                <Link className="button ghost" href="/fitness/pedidos/novo"><Truck size={16} />Novo pedido</Link>
                <Link className="button gold" href="/fitness/vendas/nova"><CircleDollarSign size={16} />Nova venda</Link>
              </>}
            </div>
          </header>
        )}
        <div className={`content ${isHub ? "content-hub" : ""}`}>{children}</div>
      </main>

      {!isHub && mobileShortcuts.length > 0 && (
        <nav className="mobile-nav mobile-action-nav" style={{ gridTemplateColumns: `repeat(${mobileShortcuts.length}, minmax(0, 1fr))` }}>
          {mobileShortcuts.map(({ href, label, icon: Icon, primary }) => (
            <Link
              className={`mobile-link mobile-action-link ${primary ? "mobile-action-primary" : ""} ${isActive(href) ? "primary" : ""}`}
              href={href}
              key={href}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
