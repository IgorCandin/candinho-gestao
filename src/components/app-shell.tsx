"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive, ArrowLeft, BarChart3, Bot, Boxes, Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, ContactRound,
  Handshake, HeartPulse, History, Home, Images, Inbox, Link2, LogOut, Menu, PackageSearch, RefreshCcw, Settings, ShoppingBag,
  Truck, UserRoundPlus, UsersRound,
} from "lucide-react";
import type { UserAccess } from "@/lib/access";

const supplementNav = [
  { href: "/suplementos", label: "Início", icon: Home },
  { href: "/suplementos/painel", label: "Painel Gerencial", icon: BarChart3 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/clientes", label: "CRM", icon: ContactRound },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];
const supplementSalesNav = [{ href: "/produtos", label: "Consulta de produtos", icon: PackageSearch }];

const fitnessNav = [
  { href: "/fitness", label: "Início", icon: Home },
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
  { href: "/bank", label: "Visão geral", icon: ChartNoAxesCombined },
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
  { href: "/central", label: "Visão Geral", icon: HeartPulse },
  { href: "/central/inbox", label: "Atendimento", icon: Inbox },
  { href: "/central/clientes", label: "Clientes", icon: UsersRound },
  { href: "/central/midia", label: "Mídia", icon: Images },
  { href: "/central/nexus", label: "Nexus IA", icon: Bot },
  { href: "/central/integracoes", label: "Integrações", icon: Link2 },
];

const partnerNav = [{ href: "/parceiro", label: "Meu Painel", icon: Handshake }];
const hubNav = [{ href: "/dashboard", label: "Início", icon: Home }];

type Operation = "hub" | "central" | "supplements" | "fitness" | "bank" | "partner";

export function AppShell({ children, access }: { children: React.ReactNode; access: UserAccess }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const isHub = pathname === "/dashboard";
  const isSettings = pathname.startsWith("/configuracoes");
  const settingsOperation = searchParams.get("operacao");

  let operation: Operation = "hub";
  if (pathname.startsWith("/central")) operation = "central";
  else if (pathname.startsWith("/parceiro")) operation = "partner";
  else if (pathname.startsWith("/bank") || (isSettings && settingsOperation === "bank")) operation = "bank";
  else if (pathname.startsWith("/fitness") || (isSettings && settingsOperation === "fitness")) operation = "fitness";
  else if (!isHub) operation = "supplements";

  const isCentral = operation === "central";
  const isPartner = operation === "partner";
  const isFitness = operation === "fitness";
  const isSupplements = operation === "supplements";
  const isBank = operation === "bank";
  const isSalesProfile = access.role === "sales";
  const nav = isHub ? hubNav : isCentral ? centralNav : isPartner ? partnerNav : isBank ? bankNav : isFitness ? (isSalesProfile ? fitnessSalesNav : fitnessNav) : (isSalesProfile ? supplementSalesNav : supplementNav);

  const mobileShortcuts = isSettings ? [] : isCentral ? [
    { href: "/central/inbox", label: "Inbox", icon: Inbox, primary: true },
    { href: "/central/midia", label: "Mídia", icon: Images, primary: false },
    { href: "/central/nexus", label: "Nexus", icon: Bot, primary: false },
  ] : isPartner ? [
    { href: "/parceiro", label: "Meu painel", icon: Handshake, primary: true },
  ] : isBank ? [
    { href: "/bank/atualizar", label: "Atualizar", icon: RefreshCcw, primary: false },
    { href: "/bank", label: "Início", icon: ChartNoAxesCombined, primary: true },
    { href: "/bank/faturas", label: "Faturas", icon: History, primary: false },
  ] : isFitness ? (isSalesProfile ? [
    { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch, primary: true },
    { href: "/fitness/estoque", label: "Estoque", icon: Boxes, primary: false },
  ] : [
    { href: "/fitness/pedidos/novo", label: "Novo pedido", icon: Truck, primary: false },
    { href: "/fitness/vendas/nova", label: "Nova venda", icon: CircleDollarSign, primary: true },
    { href: "/fitness/produtos", label: "Produtos", icon: PackageSearch, primary: false },
  ]) : (isSalesProfile ? [
    { href: "/produtos", label: "Produtos", icon: PackageSearch, primary: true },
  ] : [
    { href: "/leads/novo", label: "Novo lead", icon: UserRoundPlus, primary: false },
    { href: "/vendas/nova", label: "Novo Orçamento", icon: CircleDollarSign, primary: true },
    { href: "/produtos", label: "Produtos", icon: PackageSearch, primary: false },
  ]);

  const showSupplementActions = access.canWriteSupplements && isSupplements && !isSettings;
  const showFitnessActions = access.canWriteFitness && isFitness && !isSettings;
  const settingsHref = operation === "fitness" ? "/configuracoes?operacao=fitness" : operation === "supplements" ? "/configuracoes?operacao=suplementos" : operation === "bank" ? "/configuracoes?operacao=bank" : "/configuracoes";
  const brand = isBank ? { src: "/candinho-bank-logo.png", alt: "Candinho Bank" } : isFitness ? { src: "/candinho-fitness-logo.webp", alt: "Candinho Fitness" } : isSupplements ? { src: "/candinho-suplementos-logo.webp", alt: "Candinho Suplementos" } : { src: "/candinho-company-logo.webp", alt: "Candinho Company" };

  useEffect(() => { mobileMenuRef.current?.removeAttribute("open"); }, [pathname]);
  function closeMobileMenu() { mobileMenuRef.current?.removeAttribute("open"); }
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) { router.back(); return; }
    router.push(isCentral ? "/central" : isPartner ? "/parceiro" : isFitness ? "/fitness" : isBank ? "/bank" : "/suplementos");
  }
  function isActive(href: string) {
    if (["/dashboard", "/central", "/parceiro", "/suplementos", "/fitness", "/bank"].includes(href)) return pathname === href;
    if (href === "/vendas") return pathname.startsWith("/vendas") || pathname.startsWith("/leads") || pathname.startsWith("/orcamentos");
    return pathname.startsWith(href);
  }

  if (isHub) return <main className="hub-standalone"><div className="content content-hub">{children}</div></main>;

  return <div className={`app-shell theme-${operation}`}>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand brand-logo-link" aria-label={`${brand.alt} — voltar às operações`}><Image className="sidebar-company-logo" src={brand.src} alt={brand.alt} width={1000} height={343} priority /></Link>
      <nav className="nav">{nav.map(({ href, label, icon: Icon }) => <Link className={`nav-link ${isActive(href) ? "primary" : ""}`} href={href} key={href}><Icon size={18} /><span className="nav-label">{label}</span></Link>)}</nav>
      <div className="sidebar-footer">
        <div className="sidebar-user"><span>{access.name}</span><small>{access.role === "partner" ? "Perfil Parceiro" : access.role === "sales" ? "Perfil Vendas" : access.email ?? "Acesso local"}</small></div>
        <p className="sidebar-slogan">{isBank ? "Seu dinheiro, suas decisões, sua visão." : isCentral ? "Atendimento, informação e decisão em um só lugar." : isPartner ? "Sua parceria com transparência." : "Qualidade que entrega resultado."}</p>
        {access.canManageUsers && <Link className={`nav-link ${isSettings ? "primary" : ""}`} href={settingsHref}><Settings size={18} /><span className="nav-label">Configurações</span></Link>}
        <form action="/auth/signout" method="post"><button className="nav-link" style={{ width: "100%", border: 0, background: "transparent" }}><LogOut size={18} /><span className="nav-label">Sair</span></button></form>
      </div>
    </aside>

    <header className="mobile-header">
      <button className="mobile-back-button" type="button" onClick={goBack}><ArrowLeft size={22} /></button>
      <Link href="/dashboard" className="mobile-brand-link"><Image className="mobile-operation-logo" src={brand.src} alt={brand.alt} width={1000} height={343} priority /></Link>
      <details className="mobile-menu" ref={mobileMenuRef}><summary><Menu size={20} /><span>Menu</span></summary><div className="mobile-menu-panel">
        {nav.map(({ href, label, icon: Icon }) => <Link className={`mobile-menu-link ${isActive(href) ? "primary" : ""}`} href={href} key={href} onClick={closeMobileMenu}><Icon size={18} /><span>{label}</span></Link>)}
        {access.canManageUsers && <Link className={`mobile-menu-link ${isSettings ? "primary" : ""}`} href={settingsHref} onClick={closeMobileMenu}><Settings size={18} /><span>Configurações</span></Link>}
        <form action="/auth/signout" method="post"><button className="mobile-menu-link mobile-signout" type="submit"><LogOut size={18} /><span>Sair</span></button></form>
      </div></details>
    </header>

    <main className="main">
      {(showSupplementActions || showFitnessActions) && <header className="topbar"><div className="topbar-actions">
        {showSupplementActions && <><Link className="button ghost" href="/leads/novo"><UserRoundPlus size={16} />Novo lead</Link><Link className="button gold" href="/vendas/nova"><CircleDollarSign size={16} />Novo Orçamento</Link></>}
        {showFitnessActions && <><Link className="button ghost" href="/fitness/pedidos/novo"><Truck size={16} />Novo pedido</Link><Link className="button gold" href="/fitness/vendas/nova"><CircleDollarSign size={16} />Nova venda</Link></>}
      </div></header>}
      <div className="content">{children}</div>
    </main>

    {mobileShortcuts.length > 0 && <nav className="mobile-nav mobile-action-nav" style={{ gridTemplateColumns: `repeat(${mobileShortcuts.length}, minmax(0, 1fr))` }}>{mobileShortcuts.map(({ href, label, icon: Icon, primary }) => <Link className={`mobile-link mobile-action-link ${primary ? "mobile-action-primary" : ""} ${isActive(href) ? "primary" : ""}`} href={href} key={href}><Icon size={20} /><span>{label}</span></Link>)}</nav>}
  </div>;
}
