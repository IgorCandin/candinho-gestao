import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAccess } from "@/lib/data";
import { CompanyActionGrid } from "@/components/company-action-grid";

export default async function CompanyEntryPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

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
      <CompanyActionGrid />
      <footer className="company-v2-footer"><span>Escolha uma direção. Execute sem se perder.</span><Link className="company-legacy-link" href="/dashboard">Voltar às operações do ERP 1.0</Link></footer>
    </main>
  );
}
