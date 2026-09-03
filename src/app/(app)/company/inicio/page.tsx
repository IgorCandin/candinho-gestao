import { redirect } from "next/navigation";
import Link from "next/link";
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
      <header className="company-v2-hero">
        <span>ERP 2.0 · Em construção</span>
        <h1>O que você precisa executar agora?</h1>
        <p>Escolha um objetivo. A Company reúne o trabalho das operações sem substituir o sistema antigo.</p>
      </header>
      <section className="company-action-grid">
        {actions.map(({ href, title, note, icon: Icon }, index) => (
          <Link href={href} className={index === 0 ? "company-action-card primary" : "company-action-card"} key={href}>
            <span><Icon size={24} /></span><div><small>0{index + 1}</small><h2>{title}</h2><p>{note}</p></div>
          </Link>
        ))}
      </section>
      <Link className="company-legacy-link" href="/dashboard">Voltar às operações do ERP 1.0</Link>
    </main>
  );
}
