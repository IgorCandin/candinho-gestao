import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAccess, getDashboard } from "@/lib/data";
import { CompanyActionGrid } from "@/components/company-action-grid";
import { OperationSwitcher } from "@/components/operation-switcher";
import { CompanyEntryPortal } from "@/components/company-entry-portal";
import { CompanyPriorityPreview } from "@/components/company-priority-preview";
import { CompanyCommentsPreview } from "@/components/company-comments-preview";

export default async function CompanyEntryPage() {
  const [access, dashboard] = await Promise.all([getCurrentUserAccess(), getDashboard()]);

  if (!access.active || access.role === "partner") redirect("/dashboard");

  return <main className="company-v2-home">
    <CompanyEntryPortal />
    <div className="company-v2-grid" aria-hidden="true" />
    <div className="company-v2-glow glow-one" aria-hidden="true" />
    <div className="company-v2-glow glow-two" aria-hidden="true" />
    <nav className="company-v2-topbar">
      <Link href="/dashboard" className="company-v2-wordmark"><strong>CANDINHO</strong><span>COMPANY</span></Link>
      <div><span>ERP 2.0</span><OperationSwitcher current="company" /></div>
    </nav>
    <header className="company-v2-hero">
      <span><i /> ERP 2.0 · Evolução em andamento</span>
      <h1>O que você precisa executar agora?</h1>
      <p>Uma fila clara para vender, receber, atender e operar. Escolha o resultado — a Company organiza o caminho.</p>
    </header>
    <CompanyPriorityPreview receive={dashboard.pendingPaymentCount} deliver={dashboard.pendingDeliveryCount} incoming={dashboard.operational.incoming_units} />
    <CompanyActionGrid />
    <CompanyCommentsPreview />
    <footer className="company-v2-footer"><span>Escolha uma direção. Execute sem se perder.</span><div><Link className="company-legacy-link" href="/company/vitrine">Gerenciar vitrine</Link><Link className="company-legacy-link" href="/dashboard">Voltar às operações do ERP 1.0</Link></div></footer>
  </main>;
}
