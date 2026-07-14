"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardClock,
  ClipboardPlus,
  ContactRound,
  Dumbbell,
  History,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  ShoppingBag,
  UserRoundPlus,
  Warehouse,
} from "lucide-react";
import { getUserAccess } from "@/lib/access";

const supplementNav = [
  { href: "/suplementos", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/pedidos-pendentes", label: "Pedidos pendentes", icon: ClipboardClock },
  { href: "/painel-cs", label: "Painel CS", icon: BarChart3 },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/estoque", label: "Estoque", icon: Warehouse },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag },
  { href: "/leads", label: "Leads", icon: UserRoundPlus },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];

const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];
const fitnessNav = [{ href: "/fitness", label: "Início Fitness", icon: Dumbbell }];

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const access = getUserAccess(userEmail);
  const isHub = pathname === "/dashboard";
  const isFitness = pathname.startsWith("/fitness");
  const isSettings = pathname.startsWith("/configuracoes");
  const isSupplements = !isHub && !isFitness && !isSettings;

  const nav = isHub ? hubNav : isFitness ? fitnessNav : supplementNav;
  const mobile = nav.slice(0, 5);
  const showSupplementActions = access.role === "manager" && isSupplements;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/suplementos") return pathname === href;
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
            <Link className={`nav-link ${isActive(href) ? "primary" : ""}`} href={href} key={href}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-slogan">Qualidade que entrega resultado.</p>
          {access.role === "manager" && (
            <Link className="nav-link" href="/configuracoes">
              <Settings size={18} />
              Configurações
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="nav-link" style={{ width: "100%", border: 0, background: "transparent" }}>
              <LogOut size={18} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <header className={`topbar ${isHub ? "topbar-hub" : ""}`}>
          <div className="topbar-title">Qualidade que entrega resultado</div>
          {showSupplementActions && (
            <div className="topbar-actions">
              <Link className="button ghost" href="/leads?novo=lead">
                <UserRoundPlus size={16} />
                Novo lead
              </Link>
              <Link className="button ghost" href="/movimentacoes?novo=pedido-fornecedor">
                <ClipboardPlus size={16} />
                Novo pedido de fornecedor
              </Link>
              <Link className="button gold" href="/vendas?novo=venda">
                <CircleDollarSign size={16} />
                Nova venda
              </Link>
            </div>
          )}
        </header>
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
