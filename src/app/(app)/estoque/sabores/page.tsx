import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function statusLabel(status: string) {
  if (status === "healthy") return "Conciliado";
  if (status === "history_pending") return "Histórico pendente";
  if (status === "no_active_flavors") return "Sem sabores ativos";
  if (status === "physical_mismatch") return "Físico divergente";
  if (status === "reserved_mismatch") return "Reservas divergentes";
  if (status === "incoming_mismatch") return "A caminho divergente";
  return "Revisar";
}

function statusTone(status: string) {
  if (status === "healthy") return "green";
  if (status === "history_pending") return "orange";
  return "red";
}

export default async function FlavorInventoryHealthPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_flavor_integrity_overview")
    .select("*")
    .order("integrity_status")
    .order("product_name");

  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    product_id: String(row.product_id),
    product_name: String(row.product_name ?? "Produto"),
    active_flavor_count: Number(row.active_flavor_count ?? 0),
    aggregate_physical: Number(row.aggregate_physical ?? 0),
    flavor_physical: Number(row.flavor_physical ?? 0),
    physical_difference: Number(row.physical_difference ?? 0),
    aggregate_reserved: Number(row.aggregate_reserved ?? 0),
    flavor_reserved: Number(row.flavor_reserved ?? 0),
    reserved_difference: Number(row.reserved_difference ?? 0),
    aggregate_incoming: Number(row.aggregate_incoming ?? 0),
    flavor_incoming: Number(row.flavor_incoming ?? 0),
    incoming_difference: Number(row.incoming_difference ?? 0),
    historical_pending_count: Number(
      row.historical_pending_count ?? 0,
    ),
    integrity_status: String(
      row.integrity_status ?? "healthy",
    ),
  }));

  const inconsistent = rows.filter((row) =>
    [
      "no_active_flavors",
      "physical_mismatch",
      "reserved_mismatch",
      "incoming_mismatch",
    ].includes(row.integrity_status),
  );

  const historyPending = rows.reduce(
    (sum, row) => sum + row.historical_pending_count,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Estoque · Sabores"
        title="Saúde do controle por sabores"
        description="Auditoria automática entre o estoque total do produto e a soma dos sabores. Nenhuma correção é feita silenciosamente."
        action={
          <div className="page-header-actions">
            {historyPending > 0 && (
              <Link
                className="button gold"
                href="/produtos/sabores/historico"
              >
                <ClipboardList size={16}/>
                Classificar histórico
              </Link>
            )}

            <Link
              className="button ghost"
              href="/estoque"
            >
              <ArrowLeft size={16}/>
              Voltar ao estoque
            </Link>
          </div>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <Tags size={19}/>
          </span>
          <div>
            <span>Produtos com sabores</span>
            <strong>{rows.length}</strong>
            <small>
              {rows.reduce(
                (sum, row) =>
                  sum + row.active_flavor_count,
                0,
              )}{" "}
              sabores ativos
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <CheckCircle2 size={19}/>
          </span>
          <div>
            <span>Conciliados</span>
            <strong>
              {
                rows.filter(
                  (row) =>
                    row.integrity_status === "healthy" ||
                    row.integrity_status ===
                      "history_pending",
                ).length
              }
            </strong>
            <small>
              Estoque operacional consistente
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <TriangleAlert size={19}/>
          </span>
          <div>
            <span>Divergências</span>
            <strong>{inconsistent.length}</strong>
            <small>
              Exigem conferência antes de movimentar
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <ClipboardList size={19}/>
          </span>
          <div>
            <span>Histórico sem sabor</span>
            <strong>{historyPending}</strong>
            <small>
              Classificação sem nova baixa de estoque
            </small>
          </div>
        </article>
      </section>

      {rows.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <Tags size={28}/>
            <strong>
              Nenhum produto usa controle por sabor
            </strong>
            Quando você ativar sabores em um produto, a
            conciliação automática aparecerá aqui.
          </div>
        </article>
      ) : (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Conciliação por produto</h2>
              <p>
                Diferença zero significa que o agregado do
                produto e a composição por sabores estão
                batendo.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Sabores</th>
                  <th>Físico total</th>
                  <th>Físico sabores</th>
                  <th>Reservado total</th>
                  <th>Reservado sabores</th>
                  <th>A caminho total</th>
                  <th>A caminho sabores</th>
                  <th>Histórico</th>
                  <th>Situação</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.product_id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/estoque/${row.product_id}`}
                      >
                        <strong>
                          {row.product_name}
                        </strong>
                      </Link>
                    </td>

                    <td>
                      {row.active_flavor_count}
                    </td>

                    <td>
                      {row.aggregate_physical}
                    </td>

                    <td
                      className={
                        row.physical_difference === 0
                          ? "positive"
                          : "warning-text"
                      }
                    >
                      {row.flavor_physical}
                      {row.physical_difference !== 0
                        ? ` (${row.physical_difference > 0 ? "+" : ""}${row.physical_difference})`
                        : ""}
                    </td>

                    <td>
                      {row.aggregate_reserved}
                    </td>

                    <td
                      className={
                        row.reserved_difference === 0
                          ? ""
                          : "warning-text"
                      }
                    >
                      {row.flavor_reserved}
                      {row.reserved_difference !== 0
                        ? ` (${row.reserved_difference > 0 ? "+" : ""}${row.reserved_difference})`
                        : ""}
                    </td>

                    <td>
                      {row.aggregate_incoming}
                    </td>

                    <td
                      className={
                        row.incoming_difference === 0
                          ? ""
                          : "warning-text"
                      }
                    >
                      {row.flavor_incoming}
                      {row.incoming_difference !== 0
                        ? ` (${row.incoming_difference > 0 ? "+" : ""}${row.incoming_difference})`
                        : ""}
                    </td>

                    <td>
                      {row.historical_pending_count > 0 ? (
                        <Link
                          className="table-link warning-text"
                          href={`/produtos/sabores/historico?produto=${row.product_id}`}
                        >
                          {row.historical_pending_count} pendente(s)
                        </Link>
                      ) : (
                        <span className="positive">
                          Em dia
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge ${statusTone(
                          row.integrity_status,
                        )}`}
                      >
                        <span className="dot"/>
                        {statusLabel(
                          row.integrity_status,
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  );
}
