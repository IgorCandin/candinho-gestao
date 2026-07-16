import Link from "next/link";
import { Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SalesTable } from "@/components/sales-table";
import { getSalesHistory } from "@/lib/data";

export default async function SalesPage() {
  const sales = await getSalesHistory();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Histórico de vendas em ordem cronológica, da mais recente para a mais antiga."
        action={<Link className="button gold" href="/vendas/nova"><Plus size={16} />Novo Orçamento</Link>}
      />

      <nav className="period-tabs" aria-label="Área comercial">
        <Link className="period-tab active" href="/vendas">Vendas</Link>
        <Link className="period-tab" href="/leads">Leads</Link>
      </nav>

      <article className="panel">
        {sales.length === 0 ? (
          <div className="empty"><strong>Nenhuma venda registrada</strong>As vendas aparecerão aqui quando forem cadastradas.</div>
        ) : (
          <SalesTable sales={sales} />
        )}
      </article>
    </>
  );
}
