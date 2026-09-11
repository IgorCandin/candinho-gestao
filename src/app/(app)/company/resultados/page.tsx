import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";

export default function CompanyResultsPage() {
  return (
    <main className="company-results-page">
      <header>
        <div>
          <span>COMPANY · RESULTADOS</span>
          <h1>Resultados da operação</h1>
          <p>Visão da operação reunida na Company.</p>
        </div>
      </header>
      <section className="company-results-feature">
        <div>
          <BarChart3 />
          <span>Painel de resultados</span>
          <strong>Company</strong>
          <p>Os indicadores detalhados serão exibidos aqui, separados por Suplementos e Fitness.</p>
        </div>
        <Link className="button company-blue" href="/company/central">
          Abrir Sala do Dono
          <ChevronRight size={16} />
        </Link>
      </section>
    </main>
  );
}
