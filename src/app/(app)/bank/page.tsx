import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  Landmark,
  PencilLine,
  ReceiptText,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import {
  getBankDashboardData,
  getBankDebts,
} from "@/lib/bank-data";
import {
  type BankMonthCommitment,
} from "@/lib/bank-home-data";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import { markBankCommitmentAsPaid } from "./actions";
import { adjustBankMonthCommitment } from "./commitment-actions";

function commitmentTone(
  item: BankMonthCommitment,
  today: string,
) {
  if (item.dueMode === "month_only") return "blue";
  if (item.dueDate && item.dueDate < today) return "red";
  if (item.dueDate === today) return "gold";
  return "gray";
}

function commitmentLabel(
  item: BankMonthCommitment,
  today: string,
) {
  if (item.dueMode === "month_only") return "Sem dia fixo";
  if (item.dueDate && item.dueDate < today) return "Atrasado";
  if (item.dueDate === today) return "Vence hoje";
  return item.dueDate
    ? formatDateOnly(item.dueDate)
    : "Sem data";
}

function kindLabel(
  kind: BankMonthCommitment["kind"],
) {
  if (kind === "invoice") return "Fatura";
  if (kind === "subscription") return "Mensalidade";
  if (kind === "weekly_subscription") return "Consulta semanal";
  if (kind === "debt") return "Parcela";
  return "Cobrança";
}

function CommitmentList({
  rows,
  today,
  referenceMonth,
  emptyMessage,
}: {
  rows: BankMonthCommitment[];
  today: string;
  referenceMonth: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="bank-empty-state">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bank-charge-list">
      {rows.map((item) => (
        <div
          className="bank-charge-item"
          key={item.id}
        >
          <div className="bank-charge-date">
            <strong>
              {item.dueMode === "month_only"
                ? "Mês"
                : item.dueDate
                  ? formatDateOnly(
                      item.dueDate,
                    ).slice(0, 5)
                  : "—"}
            </strong>
            <span>
              {item.origin ?? "Geral"}
            </span>
          </div>

          <div className="bank-charge-main">
            <strong>{item.title}</strong>
            <span>
              {kindLabel(item.kind)}
            </span>
          </div>

          <div className="bank-charge-value">
            <strong>
              {formatCurrency(item.amount)}
            </strong>
            <span
              className={`badge ${commitmentTone(
                item,
                today,
              )}`}
            >
              {commitmentLabel(
                item,
                today,
              )}
            </span>
          </div>

          <div className="bank-header-actions">
            <Link
              className="button ghost compact-button"
              href={`/bank?compromisso=${encodeURIComponent(
                item.id,
              )}`}
            >
              <PencilLine size={14} />
              Detalhes
            </Link>

            <form
              action={markBankCommitmentAsPaid}
            >
              <input
                type="hidden"
                name="commitment_key"
                value={item.id}
              />
              <input
                type="hidden"
                name="reference_month"
                value={referenceMonth}
              />
              <button
                className="button ghost compact-button"
                type="submit"
              >
                <CheckCircle2 size={14} />
                Paguei
              </button>
            </form>

            <Link
              className="icon-link"
              href={item.href}
              aria-label={`Abrir ${item.title}`}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BankDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    compromisso?: string;
    salvo?: string;
  }>;
}) {
  const params = await searchParams;

  const [data, month, debts] =
    await Promise.all([
      getBankDashboardData(),
      getBankMonthHomeDataV2(),
      getBankDebts(),
    ]);

  const openDebts = debts.filter(
    (debt) =>
      !["paid", "cancelled"].includes(
        String(
          debt.effective_status ??
            debt.status ??
            "active",
        ),
      ),
  );

  const totalDebtRemaining =
    openDebts.reduce(
      (sum, debt) =>
        sum +
        Number(
          debt.remaining_amount ?? 0,
        ),
      0,
    );

  const selectedCommitment =
    params.compromisso
      ? month.commitments.find(
          (item) =>
            item.id ===
            params.compromisso,
        ) ?? null
      : null;

  const expectedIncome =
    month.receivableThisMonthTotal;

  const projectedEndOfMonth =
    data.summary.totalBalance +
    expectedIncome -
    month.remainingMonthTotal -
    month.overdueTotal;

  const monthName =
    month.monthLabel.charAt(0).toUpperCase() +
    month.monthLabel.slice(1);

  const nextProjection =
    data.annualProjection.find(
      (item) =>
        item.referenceMonth >
        month.referenceMonth,
    ) ?? null;

  const nextIncome =
    nextProjection?.totalExpectedIncome ??
    0;
  const nextExpenses =
    nextProjection?.totalCommitments ??
    0;
  const nextDifference =
    nextIncome - nextExpenses;

  const attentionCount =
    month.overdue.length +
    month.dueToday.length +
    month.monthPending.length +
    openDebts.length;

  const heroTitle =
    month.dueToday.length > 0
      ? formatCurrency(
          month.dueTodayTotal,
        )
      : month.overdue.length > 0
        ? `${formatCurrency(
            month.overdueTotal,
          )} atrasado`
        : attentionCount > 0
          ? "Há pendências abertas"
          : "Nada pendente hoje";

  const heroDescription =
    month.dueToday.length > 0
      ? `${month.dueToday.length} compromisso(s) vencem hoje`
      : month.overdue.length > 0
        ? `${month.overdue.length} compromisso(s) precisam de atenção imediata`
        : attentionCount > 0
          ? `${month.monthPending.length} compromisso(s) sem dia fixo e ${openDebts.length} dívida(s) aberta(s)`
          : "Nenhum vencimento ou pendência aberta para hoje.";

  return (
    <section className="bank-dashboard">
      <div className="operation-home-toolbar bank-home-toolbar">
        <span>
          {monthName} · cada mês é uma
          pequena vitória
        </span>

        <Link
          className="button gold"
          href="/bank/atualizar"
        >
          <RefreshCcw size={16} />
          Atualizar saldos
        </Link>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>
              Compromisso atualizado com
              sucesso.
            </strong>
            <span>
              Os totais deste mês já foram
              recalculados.
            </span>
          </div>
        </div>
      )}

      <div
        className="bank-balance-hero"
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1fr) auto",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div>
          <span className="bank-balance-kicker">
            O que precisa de atenção
          </span>
          <strong>{heroTitle}</strong>
          <small>{heroDescription}</small>
        </div>

        {attentionCount > 0 ? (
          <AlertTriangle size={42} />
        ) : (
          <CheckCircle2 size={42} />
        )}
      </div>

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Saldo disponível</span>
            <span className="stat-icon">
              <Landmark size={17} />
            </span>
          </div>
          <div className="stat-value">
            {formatCurrency(
              data.summary.totalBalance,
            )}
          </div>
          <div className="stat-note">
            {data.summary.latestBalanceDate
              ? `Atualizado em ${formatDateOnly(
                  data.summary
                    .latestBalanceDate,
                )}`
              : "Atualize seus saldos reais."}
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>
              A pagar até o fim do mês
            </span>
            <span className="stat-icon">
              <ReceiptText size={17} />
            </span>
          </div>
          <div className="stat-value">
            {formatCurrency(
              month.remainingMonthTotal,
            )}
          </div>
          <div className="stat-note">
            {month.upcoming.length +
              month.dueToday.length +
              month.monthPending.length}{" "}
            compromisso(s) abertos.
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Total a receber</span>
            <span className="stat-icon">
              <TrendingUp size={17} />
            </span>
          </div>
          <div className="stat-value">
            {formatCurrency(
              expectedIncome,
            )}
          </div>
          <div className="stat-note">
            Pendências atuais e antigas ainda não recebidas.
          </div>
        </article>

        <article
          className={`stat-card bank-difference-card ${
            projectedEndOfMonth < 0
              ? "negative"
              : "positive"
          }`}
        >
          <div className="stat-head">
            <span>
              Projeção até o fim do mês
            </span>
            <span className="stat-icon">
              <CircleDollarSign
                size={17}
              />
            </span>
          </div>
          <div className="stat-value">
            {formatCurrency(
              projectedEndOfMonth,
            )}
          </div>
          <div className="stat-note">
            Saldo + entradas − compromissos
            abertos.
          </div>
        </article>
      </div>

      {selectedCommitment && (
        <article
          className="panel bank-income-form-panel"
          style={{ marginTop: 18 }}
        >
          <div className="panel-head">
            <div>
              <h2>
                Detalhes da pendência
              </h2>
              <p>
                Ajuste somente o valor deste
                mês. O valor padrão dos meses
                futuros continua igual.
              </p>
            </div>
            <Link
              className="button ghost compact-button"
              href="/bank"
            >
              Fechar
            </Link>
          </div>

          <div className="bank-charge-payment-summary">
            <div>
              <span>Compromisso</span>
              <strong>
                {selectedCommitment.title}
              </strong>
            </div>
            <div>
              <span>Tipo</span>
              <strong>
                {kindLabel(
                  selectedCommitment.kind,
                )}
              </strong>
            </div>
            <div>
              <span>Valor atual no mês</span>
              <strong>
                {formatCurrency(
                  selectedCommitment.amount,
                )}
              </strong>
            </div>
          </div>

          <form
            action={
              adjustBankMonthCommitment
            }
          >
            <input
              type="hidden"
              name="commitment_key"
              value={selectedCommitment.id}
            />
            <input
              type="hidden"
              name="reference_month"
              value={month.referenceMonth}
            />

            <div className="bank-income-form-grid">
              <label className="field">
                <span>
                  Valor correto deste mês
                </span>
                <div className="bank-money-input">
                  <b>R$</b>
                  <input
                    className="input"
                    name="amount"
                    inputMode="decimal"
                    defaultValue={Number(
                      selectedCommitment.amount,
                    )
                      .toFixed(2)
                      .replace(".", ",")}
                    required
                  />
                </div>
              </label>

              <label className="field bank-income-form-wide">
                <span>
                  Motivo ou observação
                </span>
                <textarea
                  className="input bank-textarea"
                  name="notes"
                  placeholder="Ex.: Neste mês foram somente duas sessões."
                />
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link
                className="button ghost"
                href="/bank"
              >
                Cancelar
              </Link>
              <button
                className="button gold"
                type="submit"
              >
                <PencilLine size={16} />
                Salvar valor deste mês
              </button>
            </div>
          </form>
        </article>
      )}

      {month.overdue.length > 0 && (
        <article
          className="panel"
          style={{
            marginTop: 18,
            borderColor:
              "rgba(239,100,100,.35)",
          }}
        >
          <div className="panel-head">
            <div>
              <h2>Atrasados</h2>
              <p>
                {formatCurrency(
                  month.overdueTotal,
                )}{" "}
                ainda aparece como pendente.
              </p>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div
            className="panel-body"
            style={{ padding: 0 }}
          >
            <CommitmentList
              rows={month.overdue}
              today={month.today}
              referenceMonth={
                month.referenceMonth
              }
              emptyMessage="Nenhum atraso."
            />
          </div>
        </article>
      )}

      {month.monthPending.length > 0 && (
        <article
          className="panel"
          style={{ marginTop: 18 }}
        >
          <div className="panel-head">
            <div>
              <h2>
                Pendências do mês · sem dia
                fixo
              </h2>
              <p>
                Abra os detalhes para ajustar
                somente o valor deste mês.
              </p>
            </div>
            <span className="badge blue">
              {formatCurrency(
                month.monthPendingTotal,
              )}
            </span>
          </div>
          <div
            className="panel-body"
            style={{ padding: 0 }}
          >
            <CommitmentList
              rows={month.monthPending}
              today={month.today}
              referenceMonth={
                month.referenceMonth
              }
              emptyMessage="Nenhuma pendência sem dia fixo."
            />
          </div>
        </article>
      )}

      <article
        className="panel"
        style={{ marginTop: 18 }}
      >
        <div className="panel-head">
          <div>
            <h2>
              Vencimentos de {monthName}
            </h2>
            <p>
              Compromissos com data fixa.
            </p>
          </div>
          <span className="badge gold">
            {formatCurrency(
              month.monthCommitmentTotal,
            )}
          </span>
        </div>
        <div
          className="panel-body"
          style={{ padding: 0 }}
        >
          <CommitmentList
            rows={[
              ...month.dueToday,
              ...month.upcoming,
            ]}
            today={month.today}
            referenceMonth={
              month.referenceMonth
            }
            emptyMessage="Nenhum compromisso com data fixa pendente."
          />
        </div>
      </article>

      <article
        className="panel"
        style={{ marginTop: 18 }}
      >
        <div className="panel-head">
          <div>
            <h2>
              Empréstimos e Notinhas
            </h2>
            <p>
              Saldo total ainda devido e
              próximos pagamentos.
            </p>
          </div>
          <span className="badge orange">
            {openDebts.length} aberta(s) ·{" "}
            {formatCurrency(
              totalDebtRemaining,
            )}
          </span>
        </div>

        <div className="panel-body">
          {openDebts.length === 0 ? (
            <div className="bank-empty-state">
              Nenhuma dívida aberta.
            </div>
          ) : (
            <div className="bank-income-list">
              {openDebts
                .slice(0, 5)
                .map((debt) => (
                  <div
                    className="bank-income-list-item"
                    key={String(debt.id)}
                  >
                    <div>
                      <strong>
                        {String(
                          debt.name ??
                            "Dívida",
                        )}
                      </strong>
                      <span>
                        {String(
                          debt.creditor_name ??
                            debt.origin ??
                            "Sem credor informado",
                        )}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {formatCurrency(
                          Number(
                            debt.remaining_amount ??
                              0,
                          ),
                        )}
                      </strong>
                      <span>
                        {debt.next_due_date
                          ? formatDateOnly(
                              String(
                                debt.next_due_date,
                              ),
                            )
                          : "Sem próxima data"}
                      </span>
                    </div>

                    <span className="badge orange">
                      {String(
                        debt.debt_type,
                      ) === "note"
                        ? "Notinha"
                        : "Empréstimo"}
                    </span>

                    <Link
                      className="button ghost bank-income-action"
                      href={`/bank/emprestimos?ajustar=${encodeURIComponent(
                        String(debt.id),
                      )}`}
                    >
                      Abrir
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="panel-body">
          <Link
            className="button ghost"
            href="/bank/emprestimos"
          >
            <HandCoins size={16} />
            Ver todas as dívidas
          </Link>
        </div>
      </article>

      <article
        className="panel"
        style={{ marginTop: 18 }}
      >
        <div className="panel-head">
          <div>
            <h2>Projeção do próximo mês</h2>
            <p>
              Previsão, não saldo real.
            </p>
          </div>
          <CalendarDays size={20} />
        </div>

        <div className="panel-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <div className="stat-card">
              <div className="stat-head">
                <span>Entrada prevista</span>
                <span className="stat-icon">
                  <ArrowUpRight
                    size={17}
                  />
                </span>
              </div>
              <div
                className="stat-value"
                style={{ fontSize: 24 }}
              >
                {formatCurrency(
                  nextIncome,
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-head">
                <span>Saída prevista</span>
                <span className="stat-icon">
                  <ArrowDownRight
                    size={17}
                  />
                </span>
              </div>
              <div
                className="stat-value"
                style={{ fontSize: 24 }}
              >
                {formatCurrency(
                  nextExpenses,
                )}
              </div>
            </div>

            <div
              className={`stat-card bank-difference-card ${
                nextDifference < 0
                  ? "negative"
                  : "positive"
              }`}
            >
              <div className="stat-head">
                <span>
                  Diferença projetada
                </span>
                <span className="stat-icon">
                  <CircleDollarSign
                    size={17}
                  />
                </span>
              </div>
              <div
                className="stat-value"
                style={{ fontSize: 24 }}
              >
                {formatCurrency(
                  nextDifference,
                )}
              </div>
            </div>
          </div>
        </div>
      </article>

      <OperationInvestmentPanel
        data={data.investment}
      />

      <div className="bank-quick-actions">
        <Link
          href="/bank/atualizar"
          className="bank-quick-card"
        >
          <RefreshCcw size={20} />
          <div>
            <strong>Atualizar saldos</strong>
            <span>
              Informe o saldo real das contas
              e carteiras.
            </span>
          </div>
          <ChevronRight size={17} />
        </Link>

        <Link
          href="/bank/entradas"
          className="bank-quick-card"
        >
          <TrendingUp size={20} />
          <div>
            <strong>
              Entradas e recebimentos
            </strong>
            <span>
              Confirme o que já entrou neste
              mês.
            </span>
          </div>
          <ChevronRight size={17} />
        </Link>

        <Link
          href="/bank/fechamento"
          className="bank-quick-card"
        >
          <Wallet size={20} />
          <div>
            <strong>Fechar o mês</strong>
            <span>
              Guarde a fotografia financeira
              do mês.
            </span>
          </div>
          <ChevronRight size={17} />
        </Link>
      </div>
    </section>
  );
}
