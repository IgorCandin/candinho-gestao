import { redirect } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Boxes, CalendarDays, CircleDollarSign, ContactRound, ShoppingBag, Truck } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyEntryPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  const actions = [
    { href: "/company/vender", title: "Vender agora", note: "Recompras, leads quentes e oportunidades", icon: ShoppingBag },
    { href: "/company/receber", title: "Receber dinheiro", note: "Cobranças, vencimentos e acordos", icon: CircleDollarSign },
    { href: "/company/acompanhar", title: "Atender e acompanhar", note: "Pós-venda e retornos combinados", icon: ContactRound },
    { href: "/company/entregar", title: "Entregar", note: "Pedidos, retiradas e rotas", icon: Truck },
    { href: "/company/compras", title: "Comprar e repor", note: "Grupos equivalentes e pedidos", icon: Boxes },
    { href: "/company/dia", title: "Organizar o dia", note: "Agenda e prioridades da empresa", icon: CalendarDays },
  ];

  return (
    <main className="company-v2-home">
      <div className="company-v2-grid" aria-hidden="true" />
      <div className="company-v2-glow glow-one" aria-hidden="true" />
      <div className="company-v2-glow glow-two" aria-hidden="true" />
      <nav className="company-v2-topbar">
        <Link href="/dashboard" className="company-v2-wordmark">
          <strong>CANDINHO</strong><span>COMPANY</span>
        </Link>
        <div><span>ERP 2.0</span><Link href="/dashboard">Operações 1.0</Link></div>
      </nav>
      <header className="company-v2-hero">
        <span><i /> ERP 2.0 · Evolução em andamento</span>
        <h1>O que você precisa executar agora?</h1>
        <p>Uma fila clara para vender, receber, atender e operar. Escolha o resultado — a Company organiza o caminho.</p>
      </header>
      <section className="company-action-grid">
        {actions.map(({ href, title, note, icon: Icon }, index) => (
          <Link href={href} className={index === 0 ? "company-action-card primary" : "company-action-card"} key={href} style={{ "--company-index": index } as CSSProperties}>
            <span><Icon size={24} /></span><div><small>0{index + 1}</small><h2>{title}</h2><p>{note}</p></div><b>↗</b>
          </Link>
        ))}
      </section>
      <footer className="company-v2-footer"><span>Escolha uma direção. Execute sem se perder.</span><Link className="company-legacy-link" href="/dashboard">Voltar às operações do ERP 1.0</Link></footer>
    </main>
  );
}
