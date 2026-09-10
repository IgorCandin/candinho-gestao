"use client";

import Image from "next/image";
import Link from "next/link";
import { Bot, CircleDollarSign, Dumbbell, Home, Landmark, ListChecks, LogOut, ReceiptText, RefreshCcw, UserRound, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import type { UserAccess } from "@/lib/access";
import { InstallCompanyMenuAction } from "@/components/install-company-menu-action";
import { OperationSwitcher } from "@/components/operation-switcher";

const bankLeft = [
  { href: "/bank", label: "Visão geral", icon: Landmark },
  { href: "/company/inicio", label: "Company", icon: Home },
  { href: "/bank/nexus", label: "Nexus", icon: Bot },
];
const bankRight = [
  { href: "/bank/organizar", label: "Caixa", icon: CircleDollarSign },
  { href: "/bank/entradas", label: "Entradas", icon: ReceiptText },
  { href: "/bank/faturas", label: "Faturas", icon: ListChecks },
];
const physiqueLeft = [
  { href: "/atletas", label: "Visão geral", icon: Dumbbell },
  { href: "/company/inicio", label: "Company", icon: Home },
];
const physiqueRight = [
  { href: "/atletas/atletas", label: "Atletas", icon: UsersRound },
  { href: "/atletas/fichas", label: "Fichas", icon: ListChecks },
];

export function UnifiedAreaHeader({ area, access }: { area: "bank" | "physique"; access: UserAccess }) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const left = area === "bank" ? bankLeft : physiqueLeft;
  const right = area === "bank" ? bankRight : physiqueRight;
  const brand = area === "bank" ? BRAND_ASSETS.bank.complete : BRAND_ASSETS.physique.complete;
  const root = area === "bank" ? "/bank/inicio" : "/atletas/inicio";
  const isActive = (href: string) => pathname === href || (href !== root && !href.startsWith("/company") && pathname.startsWith(`${href}/`));
  const renderNav = (items: typeof left) => items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? "active" : ""} aria-label={label} title={label}><span className="company-nav-icon"><Icon size={19}/></span><span className="company-nav-label">{label}</span></Link>);

  return <header className={`company-command-header unified-company-header ${area} ${area === "physique" ? "compact-four" : ""}`}>
    <button className="company-fullscreen-button company-refresh-button company-header-edge-control" type="button" onClick={() => startRefresh(() => router.refresh())} aria-label="Atualizar dados desta tela" title="Atualizar dados"><RefreshCcw className={refreshing ? "spin" : ""} size={17}/></button>
    <div className="company-header-inner">
      <nav className="company-primary-nav" aria-label="Navegação principal">{renderNav(left)}</nav>
      <Link className="company-header-brand" href={root} aria-label={brand.alt}><Image src={brand.src} alt={brand.alt} width={brand.width} height={brand.height} priority/></Link>
      <nav className="company-primary-nav company-primary-nav-right" aria-label="Navegação operacional">{renderNav(right)}</nav>
      <details className="company-account-menu"><summary aria-label="Abrir opções da conta"><UserRound size={19}/></summary><div><strong>{access.name}</strong><small>{access.email ?? "Acesso Company"}</small><OperationSwitcher current={area === "bank" ? "bank" : "atletas"} compact/><InstallCompanyMenuAction/><form action="/auth/signout" method="post"><button type="submit"><LogOut size={15}/>Sair</button></form></div></details>
    </div>
  </header>;
}
