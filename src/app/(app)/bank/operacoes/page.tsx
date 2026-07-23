import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { getBankOperationReceivables } from "@/lib/bank-data";
import {
  formatCurrency,
  formatDateOnly,
  formatMonthYear,
} from "@/lib/format";

function deliveryLabel(status: string) {
  if (status === "delivered") return "Entregue";
  if (status === "to_deliver") return "A entregar";
  if (status === "pickup") return "Retirada";
  return status || "Sem status";
}

export default async function BankOperationReceivablesPage() {
  const { items, summary, supplementsProjection } =
    await getBankOperationReceivables();

  const supplements = items.filter(
    (item) => item.operation === "supplements",
  );
  const fitness = items.filter(
    (item) => item.operation === "fitness",
  );

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>À receber nas operações</h1>
          <p>
            Recebimentos pendentes da Candinho Suplementos e
            Candinho Fitness, consultados diretamente nas
            operações. Pagamentos divididos aparecem por
            vencimento, sem duplicar o total da venda.
          </p>
        </div>

        <Link className="button ghost" href="/bank">
          <ArrowLeft size={16} />
          Voltar à Bank
        </Link>
      </div>

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <span>Total confirmado a receber</span>
            <span className="stat-icon">
              <CircleDollarSign size={17} />
            </span>
          </div>

          <div className="stat-value">
            {formatCurrency(summary.total)}
          </div>

          <div className="stat-note">
            {summary.totalCount} lançamento(s) ainda pendente(s).
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Candinho Suplementos</span>
            <span className="stat-icon">
              <ShoppingBag size={17} />
            </span>
          </div>

          <div className="stat-value">
            {formatCurrency(summary.supplementsTotal)}
          </div>

          <div className="stat-note">
            {summary.supplementsCount} recebimento(s) previsto(s).
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-head">
            <span>Candinho Fitness</span>
            <span className="stat-icon">
              <Dumbbell size={17} />
            </span>
          </div>

          <div className="stat-value">
            {formatCurrency(summary.fitnessTotal)}
          </div>

          <div className="stat-note">
            {summary.fitnessCount} venda(s) vinculada(s) à Fitness.
          </div>
        </article>

        <article className="stat-card bank-operation-projection-card">
          <div className="stat-head">
            <span>Projeção mensal Suplementos</span>
            <span className="stat-icon">
              <ChartNoAxesCombined size={17} />
            </span>
          </div>

          <div className="stat-value">
            {formatCurrency(
              supplementsProjection.projectedMonthlyReceivable,
            )}
          </div>

          <div className="stat-note">
            70% da média de lucro dos 3 últimos meses fechados.
          </div>
        </article>
      </div>

      <article className="panel bank-operation-projection-panel">
        <div className="panel-head">
          <div>
            <h2>Como calculamos a projeção da Suplementos</h2>
            <p>
              O mês atual usa os valores reais ainda abertos. Em
              pagamentos divididos, cada parcela entra no próprio
              vencimento. A estimativa conservadora entra a partir
              do próximo mês.
            </p>
          </div>
        </div>

        <div className="panel-body">
          <div className="bank-operation-projection-summary">
            <div>
              <span>Período usado</span>
              <strong>
                {supplementsProjection.periodStart &&
                supplementsProjection.periodEnd
                  ? `${formatMonthYear(
                      supplementsProjection.periodStart,
                    )} a ${formatMonthYear(
                      supplementsProjection.periodEnd,
                    )}`
                  : "Sem histórico"}
              </strong>
            </div>

            <div>
              <span>Média mensal de lucro</span>
              <strong>
                {formatCurrency(
                  supplementsProjection.averageMonthlyProfit,
                )}
              </strong>
            </div>

            <div>
              <span>Fator conservador</span>
              <strong>
                {Math.round(
                  supplementsProjection.projectionFactor * 100,
                )}
                %
              </strong>
            </div>

            <div>
              <span>Valor levado para a projeção</span>
              <strong>
                {formatCurrency(
                  supplementsProjection.projectedMonthlyReceivable,
                )}
              </strong>
            </div>
          </div>

          <div className="bank-operation-history">
            {supplementsProjection.monthlyHistory.map((month) => (
              <div key={month.month}>
                <span>{formatMonthYear(month.month)}</span>
                <strong>
                  {formatCurrency(month.profit)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </article>

      <div className="grid bank-operation-receivables-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Candinho Suplementos</h2>
              <p>
                Parcelas aparecem separadamente por vencimento.
                Clique para abrir a venda de origem.
              </p>
            </div>

            <span className="badge gold">
              {formatCurrency(summary.supplementsTotal)}
            </span>
          </div>

          <div className="panel-body">
            {supplements.length === 0 ? (
              <div className="bank-empty-state">
                Nenhum valor pendente na Suplementos.
              </div>
            ) : (
              <div className="bank-operation-receivable-list">
                {supplements.map((item, index) => (
                  <Link
                    className="bank-operation-receivable-row"
                    href={item.href}
                    key={`${item.operation}-${item.saleId}-${item.dueDate}-${item.amount}-${index}`}
                  >
                    <div className="bank-operation-receivable-main">
                      <strong>{item.customerName}</strong>
                      <span>{item.productSummary}</span>
                      <small>
                        Venda em {formatDateOnly(item.quotedOn)} ·{" "}
                        {deliveryLabel(item.deliveryStatus)}
                      </small>
                    </div>

                    <div className="bank-operation-receivable-value">
                      <strong>
                        {formatCurrency(item.amount)}
                      </strong>
                      <span>
                        Previsto: {formatDateOnly(item.dueDate)}
                      </span>
                    </div>

                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Candinho Fitness</h2>
              <p>
                Clique em uma venda para abrir os detalhes dentro
                da operação.
              </p>
            </div>

            <span className="badge gold">
              {formatCurrency(summary.fitnessTotal)}
            </span>
          </div>

          <div className="panel-body">
            {fitness.length === 0 ? (
              <div className="bank-empty-state">
                Nenhum valor pendente na Fitness.
              </div>
            ) : (
              <div className="bank-operation-receivable-list">
                {fitness.map((item, index) => (
                  <Link
                    className="bank-operation-receivable-row"
                    href={item.href}
                    key={`${item.operation}-${item.saleId}-${item.dueDate}-${item.amount}-${index}`}
                  >
                    <div className="bank-operation-receivable-main">
                      <strong>{item.customerName}</strong>
                      <span>{item.productSummary}</span>
                      <small>
                        Venda em {formatDateOnly(item.quotedOn)} ·{" "}
                        {deliveryLabel(item.deliveryStatus)}
                      </small>
                    </div>

                    <div className="bank-operation-receivable-value">
                      <strong>
                        {formatCurrency(item.amount)}
                      </strong>
                      <span>
                        Previsto: {formatDateOnly(item.dueDate)}
                      </span>
                    </div>

                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
