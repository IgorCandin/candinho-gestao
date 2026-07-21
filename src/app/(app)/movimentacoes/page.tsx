import Link from "next/link";
import { History, Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { CommercialPagination } from "@/components/commercial-pagination";
import { CommercialSearchForm } from "@/components/commercial-search-form";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getInventoryMovementsPage } from "@/lib/operational-pagination-data";
import { formatDateTime } from "@/lib/format";

const TYPES = [
  ["", "Todos"],
  ["purchase", "Compras"],
  ["sale", "Vendas"],
  ["adjustment", "Ajustes"],
  ["opening", "Abertura"],
] as const;

function hrefFor(type: string, search: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/movimentacoes?${query}` : "/movimentacoes";
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const q = params.q?.trim() ?? "";
  const type = params.type?.trim() ?? "";

  const result = await getInventoryMovementsPage({
    page,
    pageSize: 50,
    search: q,
    movementType: type,
  });

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Auditoria"
        title="Movimentações"
        description="Toda entrada, saída, transferência, ajuste e estorno fica registrado. O histórico agora é carregado por página."
        action={
          <button className="button gold">
            <Plus size={16} />
            Novo ajuste
          </button>
        }
      />

      <nav className="period-tabs" aria-label="Tipo de movimentação">
        {TYPES.map(([value, label]) => (
          <Link
            className={`period-tab ${type === value ? "active" : ""}`}
            href={hrefFor(value, q)}
            key={value || "all"}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="commercial-scale-toolbar">
        <CommercialSearchForm
          action="/movimentacoes"
          defaultValue={q}
          hidden={{ type }}
          placeholder="Buscar produto, local ou observação..."
        />
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Quantidade</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatDateTime(movement.created_at)}</td>
                  <td><div className="cell-main">{movement.product_name}</div></td>
                  <td>
                    <Badge
                      value={
                        movement.movement_type === "sale"
                          ? "sale_movement"
                          : movement.movement_type
                      }
                    />
                  </td>
                  <td>{movement.location_code}</td>
                  <td className={`amount ${movement.quantity_delta > 0 ? "positive" : "negative"}`}>
                    {movement.quantity_delta > 0 ? "+" : ""}
                    {movement.quantity_delta}
                  </td>
                  <td>{movement.notes ?? "—"}</td>
                </tr>
              ))}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={6}>Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <CommercialPagination
          pathname="/movimentacoes"
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          params={{ q, type }}
        />

        <div
          className="panel-body"
          style={{
            color: "var(--muted)",
            fontSize: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <History size={15} />
          Os registros de estoque são imutáveis: correções geram um novo movimento, nunca apagam o histórico.
        </div>
      </article>
    </>
  );
}
