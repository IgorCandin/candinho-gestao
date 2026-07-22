import Link from "next/link";
import { CommercialPagination } from "@/components/commercial-pagination";
import { CommercialSearchForm } from "@/components/commercial-search-form";
import { PageHeader } from "@/components/page-header";
import { getFitnessMovementsPage } from "@/lib/operational-pagination-data";
import { formatDateTime } from "@/lib/format";

const TYPES = [
  ["", "Todos"],
  ["purchase", "Compras"],
  ["sale", "Vendas"],
  ["conversion", "Conversões"],
] as const;

function hrefFor(type: string, search: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("q", search);
  const query = params.toString();
  return query
    ? `/fitness/movimentacoes?${query}`
    : "/fitness/movimentacoes";
}

export default async function Page({
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

  const result = await getFitnessMovementsPage({
    page,
    pageSize: 50,
    search: q,
    movementType: type,
  });

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness"
        title="Movimentações"
        description="Histórico paginado de entradas, saídas, vendas, ajustes e conversões de estoque."
      />

      <nav className="period-tabs" aria-label="Tipo de movimentação Fitness">
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
          action="/fitness/movimentacoes"
          defaultValue={q}
          hidden={{ type }}
          placeholder="Buscar produto, SKU, tamanho, cor ou observação..."
        />
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tamanho</th>
                <th>Cor</th>
                <th>Movimento</th>
                <th>Quantidade</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatDateTime(movement.created_at)}</td>
                  <td>{movement.product_name}</td>
                  <td>{movement.size ?? "—"}</td>
                  <td>{movement.color ?? "—"}</td>
                  <td>{movement.movement_label}</td>
                  <td>
                    {movement.quantity_delta > 0
                      ? `+${movement.quantity_delta}`
                      : movement.quantity_delta}
                  </td>
                  <td>{movement.notes ?? "—"}</td>
                </tr>
              ))}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <CommercialPagination
          pathname="/fitness/movimentacoes"
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          params={{ q, type }}
        />
      </article>
    </>
  );
}
