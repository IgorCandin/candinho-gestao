import Link from "next/link";
import { Plus } from "lucide-react";
import { CommercialPagination } from "@/components/commercial-pagination";
import { CommercialSearchForm } from "@/components/commercial-search-form";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SalesTable } from "@/components/sales-table";
import {
  getSalesOperationalPage,
  type SalesOperationalView,
} from "@/lib/sales-operational-data";

function normalizeView(value: string | undefined): SalesOperationalView {
  if (value === "finalized" || value === "all") return value;
  return "pending";
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const q = params.q?.trim() ?? "";
  const view = normalizeView(params.view);

  const result = await getSalesOperationalPage({
    page,
    pageSize: 30,
    search: q,
    view,
  });

  const description =
    view === "pending"
      ? "Vendas que ainda precisam receber pagamento ou concluir a entrega."
      : view === "finalized"
        ? "Vendas totalmente pagas e entregues."
        : "Histórico completo de vendas, incluindo pendências e registros encerrados.";

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description={description}
        action={
          <Link className="button gold" href="/vendas/nova">
            <Plus size={16} />
            Novo Orçamento
          </Link>
        }
      />

      <nav className="period-tabs" aria-label="Área comercial">
        <Link className="period-tab active" href="/vendas">
          Vendas
        </Link>
        <Link className="period-tab" href="/orcamentos">
          Orçamentos
        </Link>
        <Link className="period-tab" href="/leads">
          Leads
        </Link>
      </nav>

      <nav className="period-tabs" aria-label="Situação das vendas">
        <Link
          className={`period-tab ${view === "pending" ? "active" : ""}`}
          href="/vendas?view=pending"
        >
          Pendências
        </Link>
        <Link
          className={`period-tab ${view === "finalized" ? "active" : ""}`}
          href="/vendas?view=finalized"
        >
          Finalizadas
        </Link>
        <Link
          className={`period-tab ${view === "all" ? "active" : ""}`}
          href="/vendas?view=all"
        >
          Todas
        </Link>
      </nav>

      <div className="commercial-scale-toolbar">
        <CommercialSearchForm
          action="/vendas"
          defaultValue={q}
          hidden={{ view }}
          placeholder="Buscar cliente, produto ou local..."
        />
      </div>

      <article className="panel">
        {result.rows.length === 0 ? (
          <div className="empty">
            <strong>
              {view === "pending"
                ? "Nenhuma pendência encontrada"
                : "Nenhuma venda encontrada"}
            </strong>
            {q
              ? "Ajuste a busca para localizar outros registros."
              : view === "pending"
                ? "Quando uma venda ficar totalmente paga e entregue, ela sai automaticamente desta visão."
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
          params={{ q, view }}
        />
      </article>
    </>
  );
}
