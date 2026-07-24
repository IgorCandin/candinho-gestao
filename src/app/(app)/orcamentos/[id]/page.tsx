import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  FilePenLine,
  FileText,
  Gift,
  MapPin,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { PageHeader } from "@/components/page-header";
import { QuoteStatusActions } from "@/components/quote-status-actions";
import {
  getEntitySwipeNavigation,
  getQuoteDetails,
} from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function Line({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "" || value === "—") return null;

  return (
    <div className="sale-detail-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function paymentModeLabel(
  value: string,
  hasInstallments: boolean,
) {
  if (hasInstallments) return "Pagamento dividido";
  if (value === "paid") return "Pago";
  if (value === "combined") return "Pagamento combinado";
  return "A receber";
}

function oneRelation(
  value: unknown,
): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (
      (value[0] as
        | Record<string, unknown>
        | undefined) ?? null
    );
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export default async function QuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    quote,
    swipe,
    quoteItemsResult,
    installmentsResult,
    markupResult,
  ] = await Promise.all([
    getQuoteDetails(id),
    getEntitySwipeNavigation("quote", id),
    supabase
      .from("sales_quote_items")
      .select(
        "id,product_id,quantity,unit_price,flavor:product_flavors(name),product:products(name)",
      )
      .eq("quote_id", id)
      .order("created_at")
      .order("id"),
    supabase
      .from("sales_quote_payment_installments")
      .select(
        "id,installment_no,amount,due_on,planned_payment_method,notes",
      )
      .eq("quote_id", id)
      .order("installment_no"),
    supabase
      .from("sales_quotes")
      .select("agreed_markup_amount")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!quote) notFound();
  if (quoteItemsResult.error) throw quoteItemsResult.error;
  if (installmentsResult.error) throw installmentsResult.error;
  if (markupResult.error) throw markupResult.error;

  const displayItems = (quoteItemsResult.data ?? []).map(
    (row) => {
      const product = oneRelation(row.product);
      const flavor = oneRelation(row.flavor);

      return {
        id: String(row.id),
        product_id: String(row.product_id),
        product_name: String(
          product?.name ?? "Produto",
        ),
        flavor_name:
          typeof flavor?.name === "string"
            ? flavor.name
            : null,
        quantity: Number(row.quantity ?? 0),
        unit_price: Number(row.unit_price ?? 0),
      };
    },
  );

  const installments = (installmentsResult.data ?? []).map(
    (row) => ({
      id: String(row.id),
      installment_no: Number(row.installment_no ?? 0),
      amount: Number(row.amount ?? 0),
      due_on: String(row.due_on ?? ""),
      planned_payment_method:
        typeof row.planned_payment_method === "string"
          ? row.planned_payment_method
          : null,
      notes:
        typeof row.notes === "string"
          ? row.notes
          : null,
    }),
  );

  const hasInstallments = installments.length > 0;
  const agreedMarkupAmount = Number(
    markupResult.data?.agreed_markup_amount ?? 0,
  );
  const canEdit = quote.status === "quoted";

  const action = (
    <div className="page-header-actions">
      <a
        className="button gold"
        href={`/api/orcamentos/${quote.id}/pdf`}
        target="_blank"
        rel="noreferrer"
      >
        <FileText size={16} />
        Abrir PDF
      </a>

      {canEdit && (
        <Link
          className="button gold"
          href={`/vendas/nova?quote=${quote.id}`}
        >
          <FilePenLine size={16} />
          {quote.effective_status === "expired"
            ? "Revisar e confirmar"
            : "Editar / Confirmar"}
        </Link>
      )}

      {quote.sale_id && (
        <Link
          className="button gold"
          href={`/vendas/${quote.sale_id}`}
        >
          <ShoppingBag size={16} />
          Ver venda
        </Link>
      )}

      <Link className="button ghost" href="/orcamentos">
        <ArrowLeft size={16} />
        Voltar
      </Link>
    </div>
  );

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Orçamento"
        title={`#${quote.quote_number} · ${quote.customer_name}`}
        description="Revise a proposta, sabores escolhidos, condição de pagamento, abra o PDF ou converta em venda quando o cliente confirmar."
        action={action}
      />

      <EntitySwipeNavigator
        previous={swipe.previous}
        next={swipe.next}
      />

      {quote.effective_status === "expired" && (
        <article className="panel quote-expired-alert">
          <div className="panel-body">
            <CalendarDays size={20} />
            <div>
              <strong>
                Este orçamento venceu em{" "}
                {formatDateOnly(quote.valid_until)}.
              </strong>
              <span>
                Você ainda pode abrir, editar a validade e
                confirmar sem cadastrar os produtos novamente.
              </span>
            </div>
          </div>
        </article>
      )}

      <section className="sale-details-layout">
        <div className="sale-details-main">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Produtos do orçamento</h2>
                <p>
                  {displayItems.reduce(
                    (sum, item) =>
                      sum + item.quantity,
                    0,
                  )}{" "}
                  unidade(s) registrada(s)
                </p>
              </div>

              <strong className="sale-total-highlight">
                {formatCurrency(quote.total_amount)}
              </strong>
            </div>

            <div className="panel-body sale-items-list">
              {displayItems.map((item) => (
                <div
                  className="sale-item-card detailed quote-item-card"
                  key={item.id}
                >
                  <div className="sale-item-copy">
                    <Link
                      className="table-link"
                      href={`/produtos/${item.product_id}`}
                    >
                      <strong>
                        {item.product_name}
                      </strong>
                    </Link>
                    <span>
                      {item.flavor_name
                        ? `Sabor ${item.flavor_name} · `
                        : ""}
                      {item.quantity}{" "}
                      {item.quantity === 1
                        ? "unidade"
                        : "unidades"}
                    </span>
                  </div>

                  <div className="sale-item-numbers">
                    <strong>
                      {formatCurrency(
                        item.unit_price *
                          item.quantity,
                      )}
                    </strong>
                    <small>
                      {formatCurrency(
                        item.unit_price,
                      )}{" "}
                      por unidade
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {(quote.discount_amount > 0 || agreedMarkupAmount > 0) && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Composição do valor</h2>
                  <p>Como o total final deste orçamento foi formado.</p>
                </div>
                <CircleDollarSign size={19} />
              </div>
              <div className="panel-body sale-detail-list">
                <Line
                  label="Subtotal dos produtos"
                  value={formatCurrency(quote.gross_amount)}
                />
                {quote.discount_amount > 0 && (
                  <Line
                    label="Desconto"
                    value={`- ${formatCurrency(quote.discount_amount)}`}
                  />
                )}
                {agreedMarkupAmount > 0 && (
                  <Line
                    label="Lucro do combinado"
                    value={`+ ${formatCurrency(agreedMarkupAmount)}`}
                  />
                )}
                <Line
                  label="Total final"
                  value={formatCurrency(quote.total_amount)}
                />
              </div>
            </article>
          )}

          {hasInstallments && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>
                    <WalletCards size={18} /> Pagamento dividido
                  </h2>
                  <p>
                    Estas parcelas serão copiadas para a venda
                    quando o orçamento for confirmado.
                  </p>
                </div>

                <strong>
                  {installments.length} parcelas
                </strong>
              </div>

              <div className="panel-body" style={{ display: "grid", gap: 8 }}>
                {installments.map((installment) => (
                  <div
                    className="list-item"
                    key={installment.id}
                  >
                    <div>
                      <strong>
                        Parcela{" "}
                        {installment.installment_no} ·{" "}
                        {formatDateOnly(
                          installment.due_on,
                        )}
                      </strong>
                      <span>
                        {installment.planned_payment_method ??
                          "Forma ainda não definida"}
                      </span>
                    </div>

                    <strong>
                      {formatCurrency(
                        installment.amount,
                      )}
                    </strong>
                  </div>
                ))}

                <div className="form-help">
                  Total programado:{" "}
                  <strong>
                    {formatCurrency(
                      installments.reduce(
                        (sum, row) =>
                          sum + row.amount,
                        0,
                      ),
                    )}
                  </strong>
                </div>
              </div>
            </article>
          )}

          {quote.gift_product_name &&
            quote.gift_quantity > 0 && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Brinde previsto</h2>
                    <p>
                      Só movimenta estoque quando o orçamento
                      for confirmado.
                    </p>
                  </div>
                  <Gift size={19} />
                </div>

                <div className="panel-body sale-detail-list">
                  <Line
                    label="Produto"
                    value={quote.gift_product_name}
                  />
                  <Line
                    label="Quantidade"
                    value={`${quote.gift_quantity} un.`}
                  />
                </div>
              </article>
            )}

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Gerenciar orçamento</h2>
                <p>
                  Encerrar uma cotação não movimenta estoque.
                  Também é possível reabrir depois.
                </p>
              </div>
            </div>

            <div className="panel-body">
              <QuoteStatusActions
                quoteId={quote.id}
                status={quote.status}
              />
            </div>
          </article>
        </div>

        <aside className="sale-details-side">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Situação</h2>
                <p>Status comercial</p>
              </div>
              <FileText size={19} />
            </div>

            <div className="panel-body sale-detail-list">
              <Line
                label="Status"
                value={
                  <Badge
                    value={quote.effective_status}
                  />
                }
              />
              <Line
                label="Data"
                value={formatDateOnly(
                  quote.quoted_on,
                )}
              />
              <Line
                label="Validade"
                value={formatDateOnly(
                  quote.valid_until,
                )}
              />
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Cliente e origem</h2>
                <p>Dados da proposta</p>
              </div>
              <UserRound size={19} />
            </div>

            <div className="panel-body sale-detail-list">
              <Line
                label="Cliente"
                value={
                  <Link
                    className="table-link"
                    href={`/clientes/${quote.customer_id}`}
                  >
                    {quote.customer_name}
                  </Link>
                }
              />
              <Line
                label="Estoque"
                value={
                  <span className="detail-with-icon">
                    <MapPin size={14} />
                    {quote.location_code}
                  </span>
                }
              />
              {quote.lead_id && (
                <Line
                  label="Lead"
                  value={
                    <Link
                      className="table-link"
                      href={`/leads/${quote.lead_id}`}
                    >
                      Abrir oportunidade
                    </Link>
                  }
                />
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Pagamento planejado</h2>
                <p>Condição salva no orçamento</p>
              </div>
              <CircleDollarSign size={19} />
            </div>

            <div className="panel-body sale-detail-list">
              <Line
                label="Situação"
                value={paymentModeLabel(
                  quote.payment_mode,
                  hasInstallments,
                )}
              />
              {!hasInstallments && (
                <>
                  <Line
                    label="Forma"
                    value={quote.payment_method}
                  />
                  <Line
                    label="Data paga"
                    value={
                      quote.paid_on
                        ? formatDateOnly(
                            quote.paid_on,
                          )
                        : null
                    }
                  />
                  <Line
                    label="Data combinada"
                    value={
                      quote.payment_due_on
                        ? formatDateOnly(
                            quote.payment_due_on,
                          )
                        : null
                    }
                  />
                </>
              )}
              {hasInstallments && (
                <Line
                  label="Primeiro vencimento"
                  value={formatDateOnly(
                    installments[0].due_on,
                  )}
                />
              )}
              <Line
                label="Parceiro"
                value={quote.partner_name}
              />
            </div>
          </article>

          {quote.notes && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Observações</h2>
                  <p>Informações da proposta</p>
                </div>
              </div>

              <div className="panel-body">
                <p className="sale-notes">
                  {quote.notes}
                </p>
              </div>
            </article>
          )}

          <article className="panel">
            <div className="panel-body sale-detail-list">
              <Line
                label="Subtotal"
                value={formatCurrency(
                  quote.gross_amount,
                )}
              />
              {quote.discount_amount > 0 && (
                <Line
                  label="Desconto"
                  value={`- ${formatCurrency(
                    quote.discount_amount,
                  )}`}
                />
              )}
            </div>
          </article>

          <article className="panel sale-total-panel">
            <CircleDollarSign size={22} />
            <div>
              <span>Total final</span>
              <strong>
                {formatCurrency(quote.total_amount)}
              </strong>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
