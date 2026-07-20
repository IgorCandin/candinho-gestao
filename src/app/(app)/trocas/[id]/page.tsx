import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BanknoteArrowDown,
  CalendarClock,
  ClipboardCheck,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import {
  CloseReturnCaseAction,
  ReceiveReturnCaseAction,
  ResolveReturnCaseAction,
  ScheduleReturnRefundAction,
  type ReturnCaseActionItem,
  type ReturnLotOption,
} from "@/components/return-case-actions";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format";

function statusLabel(status: string) {
  if (status === "requested") return "Aguardando devolução";
  if (status === "received") return "Recebido";
  if (status === "inspection") return "Em conferência";
  if (status === "resolved") return "Resolvido";
  if (status === "rejected") return "Recusado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function caseTypeLabel(type: string) {
  if (type === "exchange") return "Troca";
  if (type === "return") return "Devolução";
  if (type === "warranty") return "Garantia / defeito";
  if (type === "wrong_item") return "Item incorreto";
  if (type === "damage") return "Avaria";
  return "Outro";
}

function resolutionLabel(value: string | null) {
  if (value === "exchange") return "Troca";
  if (value === "refund") return "Reembolso";
  if (value === "replacement") return "Reposição / substituição";
  if (value === "no_action") return "Sem compensação";
  return "Ainda não definida";
}

export default async function ReturnCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getCurrentUserAccess();
  const supabase = await createClient();

  const [
    { data: caseRow, error: caseError },
    { data: itemRows, error: itemError },
    { data: eventRows, error: eventError },
  ] = await Promise.all([
    supabase
      .from("return_cases_overview")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("return_case_items")
      .select("*")
      .eq("case_id", id)
      .order("created_at"),

    supabase
      .from("return_case_events")
      .select("*")
      .eq("case_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (caseError) throw caseError;
  if (itemError) throw itemError;
  if (eventError) throw eventError;
  if (!caseRow) notFound();

  const operation =
    caseRow.operation === "fitness"
      ? "fitness"
      : "supplements";

  if (
    (operation === "supplements" &&
      !access.canAccessSupplements) ||
    (operation === "fitness" &&
      !access.canAccessFitness)
  ) {
    notFound();
  }

  const items: ReturnCaseActionItem[] =
    (itemRows ?? []).map((row) => ({
      id: String(row.id),
      item_name: String(
        row.item_name ?? "Item",
      ),
      variant_label:
        typeof row.variant_label === "string"
          ? row.variant_label
          : null,
      product_id:
        typeof row.product_id === "string"
          ? row.product_id
          : null,
      flavor_id:
        typeof row.flavor_id === "string"
          ? row.flavor_id
          : null,
      variant_id:
        typeof row.variant_id === "string"
          ? row.variant_id
          : null,
      quantity_requested: Number(
        row.quantity_requested ?? 0,
      ),
      quantity_received: Number(
        row.quantity_received ?? 0,
      ),
      item_condition: String(
        row.item_condition ?? "pending",
      ),
      disposition: String(
        row.disposition ?? "pending",
      ),
      unit_price: Number(
        row.unit_price ?? 0,
      ),
    }));

  let lots: ReturnLotOption[] = [];

  if (operation === "supplements") {
    const productIds = Array.from(
      new Set(
        items
          .map((item) => item.product_id)
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    );

    if (productIds.length > 0) {
      const { data: lotRows, error } =
        await supabase
          .from("inventory_lot_overview")
          .select(
            "id,product_id,flavor_id,lot_number,expires_on,quantity_on_hand",
          )
          .in("product_id", productIds)
          .order("expires_on");

      if (error) throw error;

      lots = (lotRows ?? []).map(
        (row) => ({
          id: String(row.id),
          product_id: String(
            row.product_id,
          ),
          flavor_id:
            typeof row.flavor_id ===
            "string"
              ? row.flavor_id
              : null,
          lot_number: String(
            row.lot_number ?? "",
          ),
          expires_on:
            typeof row.expires_on ===
            "string"
              ? row.expires_on
              : null,
          quantity_on_hand: Number(
            row.quantity_on_hand ?? 0,
          ),
        }),
      );
    }
  }

  const originalSaleHref =
    operation === "fitness"
      ? `/fitness/vendas/${caseRow.original_fitness_sale_id}`
      : `/vendas/${caseRow.original_sale_id}`;

  const effectiveFinancialStatus =
    String(
      caseRow.effective_financial_status ??
        caseRow.financial_status ??
        "not_applicable",
    );

  const isOpen = ![
    "resolved",
    "rejected",
    "cancelled",
  ].includes(String(caseRow.status));

  return (
    <>
      <PageHeader
        eyebrow={`Pós-venda · ${
          operation === "fitness"
            ? "Fitness"
            : "Suplementos"
        }`}
        title={`Ocorrência #${caseRow.case_number}`}
        description={`${caseTypeLabel(
          String(caseRow.case_type),
        )} · ${caseRow.customer_name}`}
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href={originalSaleHref}
            >
              <ShoppingBag size={16} />
              Venda original
            </Link>

            <Link
              className="button ghost"
              href="/trocas"
            >
              <ArrowLeft size={16} />
              Central
            </Link>
          </div>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <RotateCcw size={19} />
          </span>

          <div>
            <span>Status</span>
            <strong>
              {statusLabel(
                String(caseRow.status),
              )}
            </strong>
            <small>
              Aberta em{" "}
              {formatDateOnly(
                String(
                  caseRow.requested_on,
                ),
              )}
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <UserRound size={19} />
          </span>

          <div>
            <span>Cliente</span>
            <strong>
              {String(
                caseRow.customer_name,
              )}
            </strong>
            <small>
              {caseRow.customer_phone ??
                "Sem telefone"}
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <PackageCheck size={19} />
          </span>

          <div>
            <span>Itens</span>
            <strong>
              {Number(
                caseRow.units_received ??
                  0,
              )}
              /
              {Number(
                caseRow.units_requested ??
                  0,
              )}
            </strong>
            <small>
              recebido(s) / solicitado(s)
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <BanknoteArrowDown
              size={19}
            />
          </span>

          <div>
            <span>Reembolso</span>
            <strong>
              {formatCurrency(
                Number(
                  caseRow.refund_amount ??
                    0,
                ),
              )}
            </strong>
            <small>
              {effectiveFinancialStatus}
            </small>
          </div>
        </article>
      </section>

      <div className="partner-portal-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Ocorrência</h2>
              <p>
                Motivo e resolução comercial.
              </p>
            </div>

            <ClipboardCheck size={20} />
          </div>

          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line">
              <span>Tipo</span>
              <strong>
                {caseTypeLabel(
                  String(
                    caseRow.case_type,
                  ),
                )}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Motivo</span>
              <strong>
                {String(
                  caseRow.reason ??
                    "—",
                )}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Resolução</span>
              <strong>
                {resolutionLabel(
                  typeof caseRow.resolution ===
                    "string"
                    ? caseRow.resolution
                    : null,
                )}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Observação</span>
              <strong>
                {caseRow.notes ??
                  "—"}
              </strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Datas</h2>
              <p>
                Linha temporal operacional.
              </p>
            </div>

            <CalendarClock size={20} />
          </div>

          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line">
              <span>Solicitado</span>
              <strong>
                {formatDateOnly(
                  String(
                    caseRow.requested_on,
                  ),
                )}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Recebido</span>
              <strong>
                {caseRow.received_on
                  ? formatDateOnly(
                      String(
                        caseRow.received_on,
                      ),
                    )
                  : "Aguardando"}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Resolvido</span>
              <strong>
                {caseRow.resolved_on
                  ? formatDateOnly(
                      String(
                        caseRow.resolved_on,
                      ),
                    )
                  : "Aguardando"}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Dias desde abertura</span>
              <strong>
                {Number(
                  caseRow.days_open ?? 0,
                )}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Itens envolvidos</h2>
            <p>
              Condição física e destino de cada
              unidade.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Solicitado</th>
                <th>Recebido</th>
                <th>Condição</th>
                <th>Destino</th>
                <th>Voltou ao estoque</th>
                <th>Valor un.</th>
              </tr>
            </thead>

            <tbody>
              {(itemRows ?? []).map(
                (row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>
                        {row.item_name}
                      </strong>
                      <small>
                        {row.variant_label ??
                          ""}
                      </small>
                    </td>

                    <td>
                      {row.quantity_requested}
                    </td>

                    <td>
                      {row.quantity_received}
                    </td>

                    <td>
                      {row.item_condition}
                    </td>

                    <td>
                      {row.disposition}
                    </td>

                    <td className="positive">
                      {
                        row.restocked_quantity
                      }
                    </td>

                    <td>
                      {formatCurrency(
                        Number(
                          row.unit_price ??
                            0,
                        ),
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </article>

      {String(caseRow.status) ===
        "requested" && (
        <>
          <ReceiveReturnCaseAction
            caseId={id}
            items={items}
          />

          <CloseReturnCaseAction
            caseId={id}
          />
        </>
      )}

      {["received", "inspection"].includes(
        String(caseRow.status),
      ) && (
        <>
          <ResolveReturnCaseAction
            caseId={id}
            operation={operation}
            items={items}
            lots={lots}
          />

          <CloseReturnCaseAction
            caseId={id}
          />
        </>
      )}

      {String(caseRow.status) ===
        "resolved" &&
        Number(
          caseRow.refund_amount ?? 0,
        ) > 0 &&
        !caseRow.bank_charge_id &&
        access.canWriteBank && (
          <ScheduleReturnRefundAction
            caseId={id}
            refundAmount={Number(
              caseRow.refund_amount,
            )}
          />
        )}

      {caseRow.bank_charge_id && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Reembolso vinculado ao Bank
              </h2>
              <p>
                O status financeiro é lido da
                cobrança criada para esta
                ocorrência.
              </p>
            </div>

            <Link
              className="button ghost"
              href="/bank/cobrancas"
            >
              <BanknoteArrowDown
                size={16}
              />
              Abrir Bank
            </Link>
          </div>

          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line">
              <span>Status</span>
              <strong>
                {
                  effectiveFinancialStatus
                }
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Previsto</span>
              <strong>
                {caseRow.refund_due_date
                  ? formatDateOnly(
                      String(
                        caseRow.refund_due_date,
                      ),
                    )
                  : "—"}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Pago em</span>
              <strong>
                {caseRow.refund_paid_on
                  ? formatDateOnly(
                      String(
                        caseRow.refund_paid_on,
                      ),
                    )
                  : "Ainda não pago"}
              </strong>
            </div>
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Histórico da ocorrência</h2>
            <p>
              Registro das etapas executadas.
            </p>
          </div>
        </div>

        {(eventRows ?? []).length === 0 ? (
          <div className="empty">
            <ClipboardCheck size={26} />
            <strong>
              Sem eventos adicionais
            </strong>
          </div>
        ) : (
          <div className="inventory-attention-list">
            {(eventRows ?? []).map(
              (event) => (
                <div
                  className="inventory-attention-row"
                  key={event.id}
                >
                  <ClipboardCheck
                    size={17}
                  />

                  <div>
                    <strong>
                      {event.description ??
                        event.event_type}
                    </strong>
                    <span>
                      {formatDateTime(
                        event.created_at,
                      )}
                    </span>
                  </div>

                  <small>
                    {event.event_type}
                  </small>
                </div>
              ),
            )}
          </div>
        )}
      </article>
    </>
  );
}
