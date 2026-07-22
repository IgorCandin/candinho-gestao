import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  RefreshCcw,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import { getBankDashboardData } from "@/lib/bank-data";
import {
  getBankMonthHomeData,
  type BankMonthCommitment,
} from "@/lib/bank-home-data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import { markBankCommitmentAsPaid } from "./actions";

function commitmentTone(
  item: BankMonthCommitment,
  today: string,
) {
  if (item.dueMode === "month_only") {
    return "blue";
  }

  if (
    item.dueDate &&
    item.dueDate < today
  ) {
    return "red";
  }

  if (item.dueDate === today) {
    return "gold";
  }

  return "gray";
}

function commitmentLabel(
  item: BankMonthCommitment,
  today: string,
) {
  if (item.dueMode === "month_only") {
    return "Sem dia fixo";
  }

  if (
    item.dueDate &&
    item.dueDate < today
  ) {
    return "Atrasado";
  }

  if (item.dueDate === today) {
    return "Vence hoje";
  }

  return item.dueDate
    ? formatDateOnly(item.dueDate)
    : "Sem data";
}

function kindLabel(
  kind: BankMonthCommitment["kind"],
) {
  if (kind === "invoice")
    return "Fatura";
  if (kind === "subscription")
    return "Mensalidade";
  if (kind === "debt")
    return "Parcela";
  return "Cobrança";
}

function CommitmentList({
  rows,
  today,
  emptyMessage,
  referenceMonth,
}: {
  rows: BankMonthCommitment[];
  today: string;
  emptyMessage: string;
  referenceMonth: string;
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
              {item.dueMode ===
              "month_only"
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
              {formatCurrency(
                item.amount,
              )}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <form
              action={
                markBankCommitmentAsPaid
              }
            >
              <input
                type="hidden"
                name="commitment_key"
                value={item.id}
              />

              <input
                type="hidden"
                name="reference_month"
                value={
                  referenceMonth
                }
              />

              <button
                className="button ghost compact-button"
                type="submit"
                title="Registra este compromisso como pago no fluxo correto do Bank."
              >
                <CheckCircle2
                  size={14}
                />
                Paguei
              </button>
            </form>

            <Link
              className="icon-link"
              href={item.href}
              aria-label={`Abrir ${item.title}`}
            >
              <ChevronRight
                size={16}
              />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BankDashboardPage() {
  const [data, month] =
    await Promise.all([
      getBankDashboardData(),
      getBankMonthHomeData(),
    ]);

  const expectedIncome =
    month.receivableThisMonthTotal;

  const projectedEndOfMonth =
    data.summary.totalBalance +
    expectedIncome -
    month.remainingMonthTotal -
    month.overdueTotal;

  const monthName =
    month.monthLabel
      .charAt(0)
      .toUpperCase() +
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

  const nextMonthName =
    nextProjection?.referenceMonth
      ? new Intl.DateTimeFormat(
          "pt-BR",
          {
            timeZone:
              "America/Sao_Paulo",
            month: "long",
            year: "numeric",
          },
        ).format(
          new Date(
            `${nextProjection.referenceMonth}T12:00:00-03:00`,
          ),
        )
      : "próximo mês";

  return (
    <section className="bank-dashboard">
      <div className="operation-home-toolbar bank-home-toolbar">
        <span>
          {monthName} · cada mês é
          uma pequena vitória
        </span>

        <div className="bank-header-actions">
          <Link
            className="button ghost"
            href="/bank/atualizar"
          >
            <RefreshCcw size={16} />
            Atualização rápida
          </Link>

          <Link
            className="button gold"
            href="/bank/faturas?acao=atualizar"
          >
            <CreditCard size={16} />
            Atualizar faturas
          </Link>
        </div>
      </div>

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
            hoje
          </span>

          <strong>
            {month.dueToday.length > 0
              ? formatCurrency(
                  month.dueTodayTotal,
                )
              : "Nada vence hoje"}
          </strong>

          <small>
            {month.dueToday.length >
            0
              ? `${month.dueToday.length} compromisso(s) com vencimento hoje`
              : month.monthPending
                    .length > 0
                ? `${month.monthPending.length} pendência(s) do mês continuam abertas, mas sem dia fixo`
                : `Próximo foco: ${
                    month.upcoming[0]
                      ? `${formatDateOnly(
                          month
                            .upcoming[0]
                            .dueDate!,
                        )} · ${
                          month
                            .upcoming[0]
                            .title
                        }`
                      : "nenhum vencimento restante neste mês"
                  }`}
          </small>
        </div>

        {month.dueToday.length >
        0 ? (
          <ReceiptText size={42} />
        ) : (
          <CheckCircle2 size={42} />
        )}
      </div>

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>
              Saldo disponível
            </span>
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
            {data.summary
              .latestBalanceDate
              ? `Atualizado em ${formatDateOnly(
                  data.summary
                    .latestBalanceDate,
                )}`
              : "Atualize suas contas para refletir o saldo real."}
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>
              A pagar até o fim do
              mês
            </span>
            <span className="stat-icon">
              <ReceiptText
                size={17}
              />
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
              month.monthPending
                .length}{" "}
            compromisso(s) ainda
            abertos em {monthName}.
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>
              A receber neste mês
            </span>
            <span className="stat-icon">
              <TrendingUp
                size={17}
              />
            </span>
          </div>

          <div className="stat-value">
            {formatCurrency(
              expectedIncome,
            )}
          </div>

          <div className="stat-note">
            Somente valores reais em
            aberto com vencimento neste
            mês.
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
              Projeção até o fim do
              mês
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
            Saldo atual + valores a
            receber − compromissos ainda
            abertos.
          </div>
        </article>
      </div>

      {month.overdue.length >
        0 && (
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
              <h2>
                Atrasados deste mês
              </h2>
              <p>
                {formatCurrency(
                  month.overdueTotal,
                )}{" "}
                ainda aparece como
                pendente.
              </p>
            </div>

            <AlertTriangle
              size={20}
            />
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
              emptyMessage="Nenhum atraso neste mês."
            />
          </div>
        </article>
      )}

      {month.monthPending.length >
        0 && (
        <article
          className="panel"
          style={{ marginTop: 18 }}
        >
          <div className="panel-head">
            <div>
              <h2>
                Pendências do mês · sem
                data fixa
              </h2>
              <p>
                Compromissos que precisam
                ser acertados em{" "}
                {monthName}, mas não
                possuem um dia específico.
                Eles nunca viram
                “atrasados” só porque o mês
                começou.
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
              emptyMessage="Nenhuma pendência mensal sem data fixa."
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
              Apenas compromissos com data
              fixa. O que já foi pago sai
              da fila.
            </p>
          </div>

          <span className="badge gold">
            {formatCurrency(
              month.monthCommitmentTotal,
            )}{" "}
            no mês
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
            emptyMessage="Nenhum compromisso com data fixa pendente até o fim deste mês."
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
              Projeção do mês que vem
            </h2>
            <p>
              {nextMonthName
                .charAt(0)
                .toUpperCase() +
                nextMonthName.slice(1)}{" "}
              · previsão, não saldo real.
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
            <div
              className="stat-card"
              style={{
                minHeight: 118,
              }}
            >
              <div className="stat-head">
                <span>
                  Entrada prevista
                </span>
                <span className="stat-icon">
                  <ArrowUpRight
                    size={17}
                  />
                </span>
              </div>

              <div
                className="stat-value"
                style={{
                  fontSize: 24,
                }}
              >
                {formatCurrency(
                  nextIncome,
                )}
              </div>

              <div className="stat-note">
                Receitas e valores
                projetados.
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                minHeight: 118,
              }}
            >
              <div className="stat-head">
                <span>
                  Saída prevista
                </span>
                <span className="stat-icon">
                  <ArrowDownRight
                    size={17}
                  />
                </span>
              </div>

              <div
                className="stat-value"
                style={{
                  fontSize: 24,
                }}
              >
                {formatCurrency(
                  nextExpenses,
                )}
              </div>

              <div className="stat-note">
                Faturas, mensalidades,
                dívidas e compromissos.
              </div>
            </div>

            <div
              className={`stat-card bank-difference-card ${
                nextDifference < 0
                  ? "negative"
                  : "positive"
              }`}
              style={{
                minHeight: 118,
              }}
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
                style={{
                  fontSize: 24,
                }}
              >
                {formatCurrency(
                  nextDifference,
                )}
              </div>

              <div className="stat-note">
                Entrada prevista − saída
                prevista.
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
            <strong>
              Atualização rápida
            </strong>
            <span>
              Atualize saldos e somente as
              faturas ainda abertas.
            </span>
          </div>

          <ChevronRight size={17} />
        </Link>

        <Link
          href="/bank/cobrancas?acao=nova"
          className="bank-quick-card"
        >
          <ReceiptText size={20} />

          <div>
            <strong>
              Nova cobrança
            </strong>
            <span>
              Cadastre uma conta avulsa
              com vencimento específico.
            </span>
          </div>

          <ChevronRight size={17} />
        </Link>

        <Link
          href="/bank/entradas?acao=nova-receber"
          className="bank-quick-card"
        >
          <TrendingUp size={20} />

          <div>
            <strong>
              Nova entrada
            </strong>
            <span>
              Registre um valor previsto ou
              uma conta a receber.
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
            <strong>
              Fechar o mês
            </strong>
            <span>
              Guarda uma fotografia do
              patrimônio e resultado do
              mês.
            </span>
          </div>

          <ChevronRight size={17} />
        </Link>

        <Link
          href="/bank/visao-anual"
          className="bank-quick-card"
        >
          <CalendarDays size={20} />

          <div>
            <strong>
              Visão detalhada
            </strong>
            <span>
              Abra a análise anual quando
              quiser enxergar o quadro
              completo.
            </span>
          </div>

          <ChevronRight size={17} />
        </Link>
      </div>
    </section>
  );
}
