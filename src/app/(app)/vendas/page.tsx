import Link from "next/link";
import { Plus } from "lucide-react";
import { CommercialPagination } from "@/components/commercial-pagination";
import { CommercialSearchForm } from "@/components/commercial-search-form";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SalesTable } from "@/components/sales-table";
import { getSalesPage } from "@/lib/commercial-scale-data";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const q = params.q?.trim() ?? "";

  const result = await getSalesPage({
    page,
    pageSize: 30,
    search: q,
  });

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Histórico paginado de vendas, da mais recente para a mais antiga."
        action={
          <Link className="button gold" href="/vendas/nova">
            <Plus size={16} />
            Novo Orçamento
          </Link>
        }
      />

      <nav className="period-tabs" aria-label="Área comercial">
        <Link className="period-tab active" href="/vendas">Vendas</Link>
        <Link className="period-tab" href="/orcamentos">Orçamentos</Link>
        <Link className="period-tab" href="/leads">Leads</Link>
      </nav>

      <div className="commercial-scale-toolbar">
        <CommercialSearchForm
          action="/vendas"
          defaultValue={q}
          placeholder="Buscar cliente, produto ou local..."
        />
      </div>

      <article className="panel">
        {result.rows.length === 0 ? (
          <div className="empty">
            <strong>Nenhuma venda encontrada</strong>
            {q
              ? "Ajuste a busca para localizar outros registros."
              : "As vendas aparecerão aqui quando forem cadastradas."}
          </div>
        ) : (
          <SalesTable sales={result.rows} />
        )}

        <CommercialPagination
          pathname="/vendas"
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          params={{ q }}
        />
      </article>
    </>
  );
}
