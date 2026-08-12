"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  Handshake,
  HeartPulse,
  History,
  Home,
  Images,
  KeyRound,
  Link2,
  ListChecks,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  PackageSearch,
  PackageX,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { UserAccess } from "@/lib/access";
import { BRAND_ASSETS } from "@/lib/brand-assets";

const supplementNav = [
  { href: "/suplementos", label: "Menu", icon: Home },
  { href: "/suplementos/hoje", label: "Hoje", icon: Home },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/clientes", label: "CRM e relacionamento", icon: ContactRound },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/estoque", label: "Estoque e compras", icon: Boxes },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/suplementos/painel", label: "Gestão", icon: BarChart3 },
];

const supplementSalesNav = [
  { href: "/produtos", label: "Consulta de produtos", icon: PackageSearch },
];

const fitnessNav = [
  { href: "/fitness/inicio", label: "Menu", icon: Home },
  { href: "/fitness", label: "Visão geral", icon: BarChart3 },
  { href: "/fitness/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/fitness/painel", label: "Painel Gerencial", icon: BarChart3 },
  { href: "/fitness/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/fitness/estoque", label: "Estoque", icon: Boxes },
  { href: "/fitness/clientes", label: "Clientes", icon: UsersRound },
  { href: "/fitness/pedidos", label: "Pedidos", icon: Truck },
  { href: "/fitness/fornecedores", label: "Fornecedores", icon: Handshake },
  { href: "/fitness/movimentacoes", label: "Movimentações", icon: History },
];

const fitnessSalesNav = [
  { href: "/fitness/produtos", label: "Consulta de produtos", icon: PackageSearch },
  { href: "/fitness/estoque", label: "Consulta de estoque", icon: Boxes },
];

const bankNav = [
  { href: "/bank/inicio", label: "Menu", icon: Home },
  { href: "/bank", label: "Este mês", icon: ChartNoAxesCombined },
  { href: "/bank/atualizar", label: "Atualização Rápida", icon: RefreshCcw },
  { href: "/bank/entradas", label: "Entradas e Receber", icon: CircleDollarSign },
  { href: "/bank/operacoes", label: "À Receber Operações", icon: ShoppingBag },
  { href: "/bank/cobrancas", label: "Cobranças", icon: CircleDollarSign },
  { href: "/bank/faturas", label: "Faturas", icon: History },
  { href: "/bank/emprestimos", label: "Empréstimos e Notinhas", icon: Handshake },
  { href: "/bank/mensalidades", label: "Planos e Mensalidades", icon: CalendarDays },
  { href: "/bank/contas", label: "Contas e Carteiras", icon: Building2 },
  { href: "/bank/visao-anual", label: "Visão Anual", icon: CalendarDays },
  { href: "/bank/fechamento", label: "Fechamento Mensal", icon: Archive },
];

const centralNav = [
  { href: "/central/inicio", label: "Menu", icon: Home },
  { href: "/central/meu-dia", label: "Meu Dia", icon: ListChecks },
  { href: "/central", label: "Visão Geral", icon: HeartPulse },
  { href: "/central/prioridades", label: "Prioridades", icon: ListChecks },
  { href: "/central/promocoes", label: "Promoções", icon: BadgePercent },
  { href: "/central/rupturas", label: "Rupturas", icon: PackageX },
  { href: "/central/busca", label: "Busca Global", icon: Search },
  { href: "/central/alertas", label: "Alertas", icon: Bell },
  { href: "/central/respostas", label: "Respostas rápidas", icon: MessageSquareText },
  { href: "/central/clientes", label: "Clientes", icon: UsersRound },
  { href: "/central/agenda", label: "Agenda Global", icon: CalendarDays },
  { href: "/central/marketing", label: "Marketing", icon: Megaphone },
  { href: "/central/pendencias", label: "Pendências", icon: ListTodo },
  { href: "/central/midia", label: "Mídia", icon: Images },
  { href: "/central/integracoes", label: "Integrações", icon: Link2 },
  { href: "/central/ativacao", label: "Ativação V1", icon: Rocket },
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
  { href: "/configuracoes", label: "Perfil", icon: UserRound },
];

const marketingNav = [
  { href: "/marketing", label: "Visão geral", icon: Megaphone },
  { href: "/central/midia?scope=marketing", label: "Ideias e arquivos", icon: Images },
  { href: "/central/agenda?scope=marketing", label: "Planejamento", icon: CalendarDays },
];

const partnerNav = [
  { href: "/parceiro", label: "Meu Painel", icon: Handshake },
  { href: "/parceiro/seguranca", label: "Segurança", icon: KeyRound },
];

const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];

type Operation =
  | "hub"
  | "central"
  | "supplements"
  | "fitness"
  | "bank"
  | "marketing"
  | "partner";

export function AppShell({
  children,
  access,
}: {
  children: React.ReactNode;
  access: UserAccess;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  const isHub = pathname === "/dashboard";
  const isPromotionShowcase =
    pathname === "/promocoes" || pathname.startsWith("/promocoes/");
  const isSettings = pathname.startsWith("/configuracoes");

  let operation: Operation = "hub";
  if (pathname.startsWith("/central")) operation = "central";
  else if (pathname === "/parceiro" || pathname.startsWith("/parceiro/"))
    operation = "partner";
  else if (pathname.startsWith("/bank")) operation = "bank";
  else if (pathname.startsWith("/marketing")) operation = "marketing";
  else if (pathname.startsWith("/fitness")) operation = "fitness";
  else if (!isHub && !isSettings && !isPromotionShowcase)
    operation = "supplements";

  const isCentral = operation === "central";
  const isPartner = operation === "partner";
  const isFitness = operation === "fitness";
  const isSupplements = operation === "supplements";
  const isBank = operation === "bank";
  const isMarketing = operation === "marketing";
  const isSalesProfile = access.role === "sales";

  const canManagePromotions =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  const canManageDemandGaps =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness;

  const centralVisibleNav = (
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing ||
    access.role === "admin"
      ? centralNav
      : centralNav.filter(
          (item) =>
            item.href !== "/central/respostas" &&
            item.href !== "/central/promocoes",
        )
  ).filter(
    (item) =>
      (canManagePromotions || item.href !== "/central/promocoes") &&
      (canManageDemandGaps || item.href !== "/central/rupturas") &&
      (access.canManageUsers ||
        !["/central/governanca", "/central/ativacao"].includes(item.href)),
  );

  const nav =
    operation === "hub"
      ? hubNav
      : isCentral
        ? centralVisibleNav
        : isPartner
          ? partnerNav
          : isBank
            ? bankNav
            : isMarketing
              ? marketingNav
              : isFitness
                ? isSalesProfile
                  ? fitnessSalesNav
                  : fitnessNav
                : isSalesProfile
                  ? supplementSalesNav
                  : supplementNav;

  const mobileShortcuts = isSettings
    ? []
    : isCentral
      ? [
          {
            href: "/central/prioridades",
            label: "Prioridades",
            icon: ListChecks,
            primary: true,
          },
          {
            href: "/central/busca",
            label: "Buscar",
            icon: Search,
            primary: false,
          },
          {
            href: "/central/alertas",
            label: "Alertas",
            icon: Bell,
            primary: false,
          },
        ]
      : isMarketing
        ? [
            {
              href: "/marketing",
              label: "Marketing",
              icon: Megaphone,
              primary: true,
            },
            {
              href: "/central/midia?scope=marketing",
              label: "Mídia",
              icon: Images,
              primary: false,
            },
          ]
        : isPartner
          ? [
              {
                href: "/parceiro",
                label: "Meu painel",
                icon: Handshake,
                primary: true,
              },
              {
                href: "/parceiro/seguranca",
                label: "Segurança",
                icon: KeyRound,
                primary: false,
              },
            ]
          : isBank
            ? [
                {
                  href: "/bank/atualizar",
                  label: "Atualizar",
                  icon: RefreshCcw,
                  primary: false,
                },
                {
                  href: "/bank",
                  label: "Este mês",
                  icon: ChartNoAxesCombined,
                  primary: true,
                },
                {
                  href: "/bank/faturas",
                  label: "Faturas",
                  icon: History,
                  primary: false,
                },
              ]
            : isFitness
              ? isSalesProfile
                ? [
                    {
                      href: "/fitness/produtos",
                      label: "Produtos",
                      icon: PackageSearch,
                      primary: true,
                    },
                    {
                      href: "/fitness/estoque",
                      label: "Estoque",
                      icon: Boxes,
                      primary: false,
                    },
                  ]
                : [
                    {
                      href: "/fitness/pedidos/novo",
                      label: "Novo pedido",
                      icon: Truck,
                      primary: false,
                    },
                    {
                      href: "/fitness/vendas/nova",
                      label: "Nova venda",
                      icon: CircleDollarSign,
                      primary: true,
                    },
                    {
                      href: "/fitness/produtos",
                      label: "Produtos",
                      icon: PackageSearch,
                      primary: false,
                    },
                  ]
              : isSalesProfile
                ? [
                    {
                      href: "/produtos",
                      label: "Produtos",
                      icon: PackageSearch,
                      primary: true,
                    },
                  ]
                : [
                    {
                      href: "/vendas/nova",
                      label: "Novo Orçamento",
                      icon: CircleDollarSign,
                      primary: true,
                    },
                    {
                      href: "/clientes",
                      label: "CRM",
                      icon: ContactRound,
                      primary: false,
                    },
                    {
                      href: "/produtos",
                      label: "Produtos",
                      icon: PackageSearch,
                      primary: false,
                    },
                  ];

  const isOperationHome =
    pathname === "/suplementos" ||
    pathname === "/suplementos/hoje" ||
    pathname === "/fitness" ||
    pathname === "/bank" ||
    pathname === "/marketing";

  const showSupplementActions =
    access.canWriteSupplements &&
    isSupplements &&
    !isSettings &&
    !isOperationHome;

  const showFitnessActions =
    access.canWriteFitness &&
    isFitness &&
    !isSettings &&
    !isOperationHome;

  const brand = isBank
    ? BRAND_ASSETS.bank.complete
    : isMarketing
      ? BRAND_ASSETS.marketing.complete
      : isCentral
        ? BRAND_ASSETS.central.complete
        : isFitness
          ? BRAND_ASSETS.fitness.complete
          : isSupplements
            ? BRAND_ASSETS.supplements.complete
            : BRAND_ASSETS.company.complete;

  useEffect(() => {
    mobileMenuRef.current?.removeAttribute("open");
  }, [pathname]);

  function closeMobileMenu() {
    mobileMenuRef.current?.removeAttribute("open");
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(
      isSettings
        ? "/dashboard"
        : isCentral
          ? "/central/inicio"
          : isPartner
            ? "/parceiro"
            : isMarketing
              ? "/central/marketing"
              : isFitness
                ? "/fitness/inicio"
                : isBank
                  ? "/bank/inicio"
                  : "/suplementos",
    );
  }

  function isActive(href: string) {
    const baseHref = href.split("?")[0];

    if (
      [
        "/dashboard",
        "/central",
        "/parceiro",
        "/suplementos",
        "/fitness",
        "/bank",
        "/marketing",
      ].includes(baseHref)
    ) {
      return pathname === baseHref;
    }

    if (baseHref === "/vendas") {
      return (
        pathname.startsWith("/vendas") ||
        pathname.startsWith("/leads") ||
        pathname.startsWith("/orcamentos") ||
        pathname.startsWith("/pedidos-pendentes")
      );
    }

    if (baseHref === "/clientes") {
      return (
        pathname.startsWith("/clientes") ||
        pathname.startsWith("/pos-venda") ||
        pathname === "/agenda"
      );
    }

    if (baseHref === "/estoque") {
      return (
        pathname.startsWith("/estoque") ||
        pathname.startsWith("/movimentacoes") ||
        pathname.startsWith("/pedidos-fornecedor") ||
        pathname.startsWith("/fornecedores")
      );
    }

    return pathname.startsWith(baseHref);
  }

  if (
    pathname === "/suplementos" ||
    pathname === "/fitness/inicio" ||
    pathname === "/bank/inicio" ||
    pathname === "/central/inicio"
  ) {
    return (
      <main className="supplements-entry-standalone">
        {children}
      </main>
    );
  }
  if (isPromotionShowcase) {
    return (
      <main className="promotion-showcase-standalone">
        {children}
      </main>
    );
  }

  if (isHub) {
    return (
      <main className="hub-standalone">
        <div className="content content-hub">{children}</div>
      </main>
    );
  }

  return (
    <div className={`app-shell theme-${operation}`}>
      <aside
        className="sidebar"
        style={{
          overflow: "hidden",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Link
          href="/dashboard"
          className="brand brand-logo-link"
          aria-label={`${brand.alt} — voltar às operações`}
          style={{ flex: "0 0 auto" }}
        >
          <Image
            className="sidebar-company-logo"
            src={brand.src}
            alt={brand.alt}
            width={brand.width}
            height={brand.height}
            priority
          />
        </Link>

        <nav
          className="nav"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 3,
          }}
        >
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              className={`nav-link ${isActive(href) ? "primary" : ""}`}
              href={href}
              key={href}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div
          className="sidebar-footer"
          style={{ flex: "0 0 auto", marginTop: 10 }}
        >
          <div className="sidebar-user">
            <span>{access.name}</span>
            <small>
              {access.role === "partner"
                ? "Perfil Parceiro"
                : access.role === "sales"
                  ? "Perfil Vendas"
                  : access.email ?? "Acesso local"}
            </small>
          </div>

          <p className="sidebar-slogan">
            {isBank
              ? "Um mês de cada vez."
              : isCentral
                ? "Informação, prioridade e decisão em um só lugar."
                : isPartner
                  ? "Sua parceria com transparência."
                  : isMarketing
                    ? "Ideias organizadas para virar execução."
                    : "Qualidade que entrega resultado."}
          </p>

          <form action="/auth/signout" method="post">
            <button
              className="nav-link"
              style={{ width: "100%", border: 0, background: "transparent" }}
            >
              <LogOut size={18} />
              <span className="nav-label">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="mobile-back-button" type="button" onClick={goBack}>
          <ArrowLeft size={22} />
        </button>

        <Link href="/dashboard" className="mobile-brand-link">
          <Image
            className="mobile-operation-logo"
            src={brand.src}
            alt={brand.alt}
            width={brand.width}
            height={brand.height}
            priority
          />
        </Link>

        <details
          className="mobile-menu"
          ref={mobileMenuRef}
          data-dismissible-menu="true"
        >
          <summary>
            <Menu size={20} />
            <span>Menu</span>
          </summary>

          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Fechar menu"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMobileMenu();
            }}
          />

          <div className="mobile-menu-panel">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                className={`mobile-menu-link ${
                  isActive(href) ? "primary" : ""
                }`}
                href={href}
                key={href}
                onClick={closeMobileMenu}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}

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
              {showSupplementActions && (
                <Link className="button gold" href="/vendas/nova">
                  <CircleDollarSign size={16} />
                  Novo Orçamento
                </Link>
              )}

              {showFitnessActions && (
                <>
                  <Link className="button ghost" href="/fitness/pedidos/novo">
                    <Truck size={16} />
                    Novo pedido
                  </Link>

                  <Link className="button gold" href="/fitness/vendas/nova">
                    <CircleDollarSign size={16} />
                    Nova venda
                  </Link>
                </>
              )}
            </div>
          </header>
        )}

        <div className="content">{children}</div>
      </main>

      {mobileShortcuts.length > 0 && (
        <nav
          className="mobile-nav mobile-action-nav"
          style={{
            gridTemplateColumns: `repeat(${mobileShortcuts.length}, minmax(0, 1fr))`,
          }}
        >
          {mobileShortcuts.map(({ href, label, icon: Icon, primary }) => (
            <Link
              className={`mobile-link mobile-action-link ${
                primary ? "mobile-action-primary" : ""
              } ${isActive(href) ? "primary" : ""}`}
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
