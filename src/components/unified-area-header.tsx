"use client";

import Image from "next/image";
import Link from "next/link";
import { Bot, CircleDollarSign, Dumbbell, Home, Landmark, ListChecks, ReceiptText, RefreshCcw, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { BRAND_ASSETS } from "@/lib/brand-assets";

const areaNav = {
  bank: [
    { href: "/bank", label: "Visão geral", icon: Landmark },
    { href: "/bank/organizar", label: "Caixa", icon: CircleDollarSign },
    { href: "/bank/entradas", label: "Entradas", icon: ReceiptText },
    { href: "/bank/faturas", label: "Faturas", icon: ListChecks },
    { href: "/bank/nexus", label: "Nexus", icon: Bot },
  ],
  physique: [
    { href: "/physique", label: "Visão geral", icon: Dumbbell },
    { href: "/physique/atletas", label: "Atletas", icon: UsersRound },
    { href: "/physique/fichas", label: "Fichas", icon: ListChecks },
  ],
};

export function UnifiedAreaHeader({ area }: { area: "bank" | "physique" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const brand = area === "bank" ? BRAND_ASSETS.bank.reduced : BRAND_ASSETS.physique.reduced;

  return <header className={`unified-area-header ${area}`}>
    <div className="unified-area-topline">
      <button type="button" aria-label="Atualizar dados" onClick={() => startRefresh(() => router.refresh())}><RefreshCcw className={refreshing ? "spin" : ""} size={17}/></button>
      <Link className="unified-area-brand" href={area === "bank" ? "/bank" : "/physique"}><Image src={brand.src} alt={brand.alt} width={brand.width} height={brand.height} priority/></Link>
      <Link className="unified-area-company" href="/company/inicio"><Home size={16}/><span>Company</span></Link>
    </div>
    <nav aria-label={area === "bank" ? "Navegação do Bank" : "Navegação dos Atletas"}>
      {areaNav[area].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href || (href !== `/${area}` && pathname.startsWith(`${href}/`)) ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>)}
    </nav>
  </header>;
}
