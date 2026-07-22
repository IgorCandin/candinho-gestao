import Link from "next/link";
import {
  ArrowRight,
  BanknoteArrowDown,
  ClipboardCheck,
  PackageCheck,
  Plus,
  RotateCcw,
  SearchCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type CaseRow = {
  id: string;
  case_number: number;
  operation: string;
  case_type: string;
  customer_name: string;
  customer_phone: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  financial_status: string;
  effective_financial_status: string;
  refund_amount: number;
  requested_on: string;
  received_on: string | null;
  resolved_on: string | null;
  item_summary: string | null;
  units_requested: number;
  units_received: number;
  units_restocked: number;
  days_open: number;
};

function statusMeta(status: string) {
  if (status === "requested") return { label: "Aguardando retorno", color: "orange" };
  if (status === "received") return { label: "Recebido", color: "blue" };
  if (status === "inspection") return { label: "Em conferência", color: "yellow" };
  if (status === "resolved") return { label: "Resolvido", color: "green" };
  if (status === "rejected") return { label: "Recusado", color: "red" };
  if (status === "cancelled") return { label: "Cancelado", color: "gray" };
  return { label: status, color: "gray" };
}

function typeLabel(type: string) {
  if (type === "exchange") return "Troca";
  if (type === "return") return "Devolução";
  if (type === "warranty") return "Garantia";
  if (type === "wrong_item") return "Item incorreto";
  if (type === "damage") return "Avaria";
  return "Outro";
}

export default async function ReturnsCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const access = await getCurrentUserAccess();

  const requestedOperation =
    params.operacao === "supplements" || params.operacao === "fitness"
      ? params.operacao
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("returns_center_snapshot", {
    p_operation: requestedOperation,
  });

  if (error) throw error;

  const source =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const summary =
    source.summary && typeof source.summary === "object"
      ? (source.summary as Record<string, unknown>)
      : {};

  const cases = (Array.isArray(source.cases) ? source.cases : []).map((value) => {
    const row = value as Record<string, unknown>;

    return {
      id: String(row.id ?? ""),
      case_number: Number(row.case_number ?? 0),
      operation: String(row.operation ?? ""),
      case_type: String(row.case_type ?? "other"),
      customer_name: String(row.customer_name ?? "Cliente"),
      customer_phone:
        typeof row.customer_phone === "string" ? row.customer_phone : null,
      reason: String(row.reason ?? ""),
      status: String(row.status ?? "requested"),
      resolution: typeof row.resolution === "string" ? row.resolution : null,
      financial_status: String(row.financial_status ?? "not_applicable"),
      effective_financial_status: String(
        row.effective_financial_status ?? row.financial_status ?? "not_applicable",
      ),
      refund_amount: Number(row.refund_amount ?? 0),
      requested_on: String(row.requested_on ?? ""),
      received_on: typeof row.received_on === "string" ? row.received_on : null,
      resolved_on: typeof row.resolved_on === "string" ? row.resolved_on : null,
      item_summary: typeof row.item_summary === "string" ? row.item_summary : null,
      units_requested: Number(row.units_requested ?? 0),
      units_received: Number(row.units_received ?? 0),
      units_restocked: Number(row.units_restocked ?? 0),
      days_open: Number(row.days_open ?? 0),
    } satisfies CaseRow;
  });

  return (
    <>
      <PageHeader
        eyebrow="Pós-venda · Operação"
        title="Trocas, devoluções e garantias"
        description="Central única para controlar o que o cliente devolveu, o que pode voltar ao estoque e o que gera troca, substituição ou reembolso."
        action={
          <div className="page-header-actions">
            {access.canAccessSupplements && (
              <Link className="button gold" href="/trocas/nova?operacao=supplements">
                <Plus size={16} />
                Nova · Suplementos
              </Link>
            )}

            {access.canAccessFitness && (
              <Link className="button ghost" href="/trocas/nova?operacao=fitness">
                <Plus size={16} />
                Nova · Fitness
              </Link>
            )}
          </div>
        }
      />

      <section className="stats-grid">
        <StatCard
          label="Ocorrências abertas"
          value={String(Number(summary.open_cases ?? 0))}
          note="Ainda precisam de alguma ação"
          icon={RotateCcw}
        />

        <StatCard
          label="Aguardando retorno"
          value={String(Number(summary.awaiting_receipt ?? 0))}
          note="Cliente ainda precisa devolver o item"
          icon={PackageCheck}
        />

        <StatCard
          label="Em conferência"
          value={String(Number(summary.in_inspection ?? 0))}
          note="Aguardando decisão de destino"
          icon={SearchCheck}
        />

        <StatCard
          label="Reembolsos pendentes"
          value={formatCurrency(Number(summary.refund_amount_pending ?? 0))}
          note={`${Number(summary.refund_pending ?? 0)} ocorrência(s)`}
          icon={BanknoteArrowDown}
        />

        <StatCard
          label="Resolvidos no mês"
          value={String(Number(summary.resolved_this_month ?? 0))}
          note="Ocorrências encerradas neste mês"
          icon={ClipboardCheck}
        />
      </section>

      <div className="inventory-toolbar">
        <Link
          className={`button ${requestedOperation === null ? "gold" : "ghost"}`}
          href="/trocas"
        >
          Todas
        </Link>

        {access.canAccessSupplements && (
          <Link
            className={`button ${
              requestedOperation === "supplements" ? "gold" : "ghost"
            }`}
            href="/trocas?operacao=supplements"
          >
            Suplementos
          </Link>
        )}

        {access.canAccessFitness && (
          <Link
            className={`button ${
              requestedOperation === "fitness" ? "gold" : "ghost"
            }`}
            href="/trocas?operacao=fitness"
          >
            Fitness
          </Link>
        )}
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Fila de ocorrências</h2>
            <p>
              A prioridade é tornar explícito o estado físico do item e a
              resolução comercial, sem devolver mercadoria automaticamente ao
              estoque.
            </p>
          </div>

          <strong>{cases.length}</strong>
        </div>

        {cases.length === 0 ? (
          <div className="empty">
            <CheckCircleIcon />
            <strong>Nenhuma ocorrência registrada</strong>
            Trocas, devoluções e garantias abertas a partir de agora aparecerão
            nesta central.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Operação</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Itens</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Financeiro</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {cases.map((row) => {
                  const meta = statusMeta(row.status);

                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>#{row.case_number}</strong>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            row.operation === "fitness" ? "purple" : "blue"
                          }`}
                        >
                          {row.operation === "fitness" ? "Fitness" : "Suplementos"}
                        </span>
                      </td>

                      <td>
                        <strong>{row.customer_name}</strong>
                        <small>{row.customer_phone ?? "Sem telefone"}</small>
                      </td>

                      <td>
                        <strong>{typeLabel(row.case_type)}</strong>
                        <small>{row.reason}</small>
                      </td>

                      <td>
                        <strong>{row.units_requested} un.</strong>
                        <small>{row.item_summary ?? "Sem resumo"}</small>
                      </td>

                      <td>
                        {formatDateOnly(row.requested_on)}
                        <small>{row.days_open} dia(s) desde abertura</small>
                      </td>

                      <td>
                        <span className={`badge ${meta.color}`}>
                          <span className="dot" />
                          {meta.label}
                        </span>
                      </td>

                      <td>
                        {row.refund_amount > 0 ? (
                          <>
                            <strong>{formatCurrency(row.refund_amount)}</strong>
                            <small>{row.effective_financial_status}</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <Link className="icon-button" href={`/trocas/${row.id}`}>
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}

function CheckCircleIcon() {
  return <ClipboardCheck size={28} />;
}
