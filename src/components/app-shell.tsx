"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  FlaskConical,
  Handshake,
  History,
  Home,
  LogOut,
  Menu,
  Building2,
  PackageOpen,
  PackageSearch,
  Settings,
  ShoppingBag,
  Truck,
  UserRoundPlus,
  UsersRound,
  Warehouse,
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

const bankNav = [
  { href: "/bank", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/bank/entradas", label: "Entradas e Receber", icon: CircleDollarSign },
  { href: "/bank/cobrancas", label: "Cobranças", icon: CircleDollarSign },
  { href: "/bank/faturas", label: "Faturas", icon: History },
  { href: "/bank/emprestimos", label: "Empréstimos e Notinhas", icon: Handshake },
  { href: "/bank/mensalidades", label: "Planos e Mensalidades", icon: CalendarDays },
  { href: "/bank/contas", label: "Contas e Carteiras", icon: Building2 },
  { href: "/bank/visao-anual", label: "Visão Anual", icon: CalendarDays },
];

const testSupplementNav = [
  { href: "/teste/supplements", label: "Visão geral", icon: FlaskConical },
  { href: "/teste/supplements/vendas", label: "Vendas teste", icon: ShoppingBag },
  { href: "/teste/supplements/estoque", label: "Estoque teste", icon: Warehouse },
  { href: "/teste/supplements/pedidos", label: "Pedidos teste", icon: PackageOpen },
];

const testFitnessNav = [
  { href: "/teste/fitness", label: "Visão geral", icon: FlaskConical },
  { href: "/teste/fitness/vendas", label: "Vendas teste", icon: ShoppingBag },
  { href: "/teste/fitness/estoque", label: "Estoque teste", icon: Warehouse },
  { href: "/teste/fitness/pedidos", label: "Pedidos teste", icon: PackageOpen },
];

const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];

type Operation = "hub" | "supplements" | "fitness" | "bank";

export function AppShell({ children, access }: { children: React.ReactNode; access: UserAccess }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHub = pathname === "/dashboard";
  const isSettings = pathname.startsWith("/configuracoes");
  const isTestSupplements = pathname.startsWith("/teste/supplements");
  const isTestFitness = pathname.startsWith("/teste/fitness");
  const isTest = isTestSupplements || isTestFitness;
  const settingsOperation = searchParams.get("operacao");

  let operation: Operation = "hub";
  if (pathname.startsWith("/bank") || (isSettings && settingsOperation === "bank")) {
    operation = "bank";
  } else if (isTestFitness || pathname.startsWith("/fitness") || (isSettings && settingsOperation === "fitness")) {
    operation = "fitness";
  } else if (
    isTestSupplements ||
    (isSettings && settingsOperation === "suplementos") ||
    (!isHub && !isSettings && !pathname.startsWith("/fitness") && !pathname.startsWith("/bank") && !pathname.startsWith("/teste/"))
  ) {
    operation = "supplements";
  }

  const isFitness = operation === "fitness";
  const isSupplements = operation === "supplements";
  const isBank = operation === "bank";
  const isRealFitness = isFitness && !isTest && !isSettings;
  const isRealSupplements = isSupplements && !isTest && !isSettings;

  const nav = isHub
    ? hubNav
    : isTestSupplements
      ? testSupplementNav
      : isTestFitness
        ? testFitnessNav
        : isBank
          ? bankNav
          : isFitness
            ? fitnessNav
            : supplementNav;

  const mobileShortcuts = isSettings
    ? []
    : isTest
      ? [
          { href: `/teste/${operation}`, label: "Teste", icon: FlaskConical, primary: false },
          { href: `/teste/${operation}/vendas/nova`, label: "Nova venda", icon: CircleDollarSign, primary: true },
          { href: `/teste/${operation}/estoque`, label: "Estoque", icon: Warehouse, primary: false },
        ]
      : isBank
        ? [
            { href: "/bank/cobrancas", label: "Cobranças", icon: CircleDollarSign, primary: false },
            { href: "/bank", label: "Início", icon: ChartNoAxesCombined, primary: true },
            { href: "/bank/faturas", label: "Faturas", icon: History, primary: false },
          ]
        : isFitness
          ? [
              { href: "/fitness/pedidos/novo", label: "Novo pedido", icon: Truck, primary: false },
              { href: "/fitness/vendas/nova", label: "Nova venda", icon: CircleDollarSign, primary: true },
              { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch, primary: false },
            ]
          : [
              { href: "/leads/novo", label: "Novo lead", icon: UserRoundPlus, primary: false },
              { href: "/vendas/nova", label: "Novo Orçamento", icon: CircleDollarSign, primary: true },
              { href: "/produtos", label: "Produtos", icon: PackageSearch, primary: false },
            ];

  const mobileMenuNav = isTest || isBank
    ? nav
    : nav.filter(({ href }) => (isFitness ? href !== "/fitness/produtos" : href !== "/produtos"));
  const showSupplementActions = access.canWriteSupplements && isRealSupplements;
  const showFitnessActions = access.canWriteFitness && isRealFitness;
  const settingsHref = operation === "fitness"
    ? "/configuracoes?operacao=fitness"
    : operation === "supplements"
      ? "/configuracoes?operacao=suplementos"
      : operation === "bank"
        ? "/configuracoes?operacao=bank"
        : "/configuracoes";
  const brand = isBank
    ? { src: "/candinho-bank-logo.png", alt: "Candinho Bank" }
    : isFitness
      ? { src: "/candinho-fitness-logo.webp", alt: "Candinho Fitness" }
      : isSupplements
        ? { src: "/candinho-suplementos-logo.webp", alt: "Candinho Suplementos" }
        : { src: "/candinho-company-logo.webp", alt: "Candinho Company" };

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/suplementos") return pathname === href;
    if (href === "/fitness") return pathname === href;
    if (href === "/bank") return pathname === href;
    if (href === "/teste/supplements" || href === "/teste/fitness") return pathname === href;
    if (href === "/vendas") return pathname.startsWith("/vendas") || pathname.startsWith("/leads") || pathname.startsWith("/orcamentos");
    return pathname.startsWith(href);
  }

  if (isHub) {
    return (
      <main className="hub-standalone">
        <div className="content content-hub">{children}</div>
      </main>
    );
  }

  const sidebarSlogan = isTest
    ? "Dados isolados · pode testar sem medo."
    : isBank
      ? "Seu dinheiro, suas decisões, sua visão."
      : "Qualidade que entrega resultado.";

  return (
    <div className={`app-shell theme-${operation === "hub" ? "hub" : operation}${isTest ? " test-lab-shell" : ""}`}>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand brand-logo-link" aria-label={`${brand.alt} — voltar às operações`}>
          <Image className="sidebar-company-logo" src={brand.src} alt={brand.alt} width={1000} height={343} priority />
        </Link>

        {isTest && <div className="test-lab-sidebar-badge"><FlaskConical size={14}/><span>ÁREA DE TESTE</span></div>}

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
          <p className="sidebar-slogan">{sidebarSlogan}</p>
          {access.canManageUsers && (
            <Link className={`nav-link ${isSettings ? "primary" : ""}`} href={settingsHref} title="Configurações">
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
            <Link className="mobile-menu-link operation-switch" href="/dashboard">
              <Building2 size={18} />
              <span>Trocar operação</span>
            </Link>
            {mobileMenuNav.map(({ href, label, icon: Icon }) => (
              <Link className={`mobile-menu-link ${isActive(href) ? "primary" : ""}`} href={href} key={`mobile-menu-${href}`}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            {access.canManageUsers && (
              <Link className={`mobile-menu-link ${isSettings ? "primary" : ""}`} href={settingsHref}>
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
                <Link className="button gold" href="/vendas/nova"><CircleDollarSign size={16} />Novo Orçamento</Link>
              </>}
              {showFitnessActions && <>
                <Link className="button ghost" href="/fitness/pedidos/novo"><Truck size={16} />Novo pedido</Link>
                <Link className="button gold" href="/fitness/vendas/nova"><CircleDollarSign size={16} />Nova venda</Link>
              </>}
            </div>
          </header>
        )}
        <div className="content">{children}</div>
      </main>

      {mobileShortcuts.length > 0 && (
        <nav className="mobile-nav mobile-action-nav" style={{ gridTemplateColumns: `repeat(${mobileShortcuts.length}, minmax(0, 1fr))` }}>
          {mobileShortcuts.map(({ href, label, icon: Icon, primary }) => (
            <Link className={`mobile-link mobile-action-link ${primary ? "mobile-action-primary" : ""} ${isActive(href) ? "primary" : ""}`} href={href} key={href}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
