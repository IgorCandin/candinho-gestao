"use client";

import Link from "next/link";
import { RefreshCcw, TriangleAlert } from "lucide-react";

export default function CompanyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="company-shell-content">
    <section className="company-coming-soon">
      <TriangleAlert size={34} />
      <span>Company · atualização necessária</span>
      <h1>Esta área não carregou por completo.</h1>
      <p>Os seus dados não foram alterados. Tente atualizar; se o problema continuar, volte para Gestão e siga trabalhando pelas outras áreas.</p>
      <div className="company-error-actions">
        <button className="button gold" type="button" onClick={reset}><RefreshCcw size={16} />Tentar novamente</button>
        <Link className="button ghost" href="/company/gestao">Ir para Gestão</Link>
      </div>
    </section>
  </main>;
}
