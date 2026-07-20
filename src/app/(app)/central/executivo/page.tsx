import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  Handshake,
  Megaphone,
  MessageSquareText,
  PackageX,
  ReceiptText,
  RefreshCcw,
  Shirt,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import {
  getExecutiveSnapshot,
  type ExecutiveAlert,
  type ExecutiveForecast,
} from "@/lib/executive-data";
import {
  formatCurrency,
  formatDateTime,
} from "@/lib/format";

function percent(
  value: number,
) {
  return `${value.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}

function alertClass(
  tone: ExecutiveAlert["tone"],
) {
  if (tone === "critical")
    return "red";
  if (tone === "attention")
    return "orange";
  return "blue";
}

function ForecastCard({
  item,
}: {
  item: ExecutiveForecast;
}) {
  const positive =
    item.result >= 0;

  return (
    <article className="executive-forecast-card">
      <div className="executive-forecast-card-head">
        <div>
          <span>
            {item.label}
          </span>

          <strong
            className={
              positive
                ? "positive"
                : "negative"
            }
          >
            {formatCurrency(
              item.result,
            )}
          </strong>
        </div>

        {positive ? (
          <ArrowUpRight
            size={20}
          />
        ) : (
          <ArrowDownRight
            size={20}
          />
        )}
      </div>

      <div className="executive-forecast-values">
        <span>
          Entradas
          <strong>
            {formatCurrency(
              item.income,
            )}
          </strong>
        </span>

        <span>
          Saídas
          <strong>
            {formatCurrency(
              item.expenses,
            )}
          </strong>
        </span>
      </div>

      <small>{item.note}</small>
    </article>
  );
}

export default async function ExecutivePage() {
  const access =
    await getCurrentUserAccess();

  if (!access.canManageUsers) {
    redirect("/dashboard");
  }

  const data =
    await getExecutiveSnapshot();

  const criticalCount =
    data.alerts.filter(
      (item) =>
        item.tone ===
        "critical",
    ).length;

  const attentionCount =
    data.alerts.filter(
      (item) =>
        item.tone ===
        "attention",
    ).length;

  const operationalHealth =
    criticalCount === 0
      ? attentionCount === 0
        ? "Saudável"
        : "Atenção"
      : "Crítico";

  const operationalHealthTone =
    criticalCount > 0
      ? "red"
      : attentionCount > 0
        ? "orange"
        : "green";

  return (
    <section className="executive-dashboard">
      <PageHeader
        eyebrow="Candinho Company · Gestão Executiva"
        title="Sala do Dono"
        description="Uma leitura única da Company: vendas, caixa, capital, estoque, parceiros e pendências. Os números abaixo são gerenciais e usam somente dados já existentes no sistema."
        action={
          <Link
            className="button ghost"
            href="/dashboard"
          >
            Voltar às operações
          </Link>
        }
      />

      <div className="executive-hero">
        <div>
          <span className="executive-hero-kicker">
            Visão executiva
          </span>

          <h2>
            O que está acontecendo
            agora na Company
          </h2>

          <p>
            Atualizado em{" "}
            {formatDateTime(
              data.generatedAt,
            )}
          </p>
        </div>

        <div className="executive-hero-status">
          <span>
            Saúde operacional
          </span>

          <strong>
            {
              operationalHealth
            }
          </strong>

          <i
            className={
              operationalHealthTone
            }
          />
        </div>
      </div>

      <section className="executive-kpi-grid">
        <article>
          <ShoppingBag
            size={20}
          />

          <span>
            Faturamento no mês
          </span>

          <strong>
            {formatCurrency(
              data.sales.company
                .revenue,
            )}
          </strong>

          <small>
            {
              data.sales.company
                .count
            }{" "}
            venda(s) registradas
          </small>
        </article>

        <article>
          <CircleDollarSign
            size={20}
          />

          <span>
            Lucro bruto das vendas
          </span>

          <strong>
            {formatCurrency(
              data.sales.company
                .profit,
            )}
          </strong>

          <small>
            Margem observada{" "}
            {percent(
              data.sales
                .marginPct,
            )}
          </small>
        </article>

        <article>
          <WalletCards
            size={20}
          />

          <span>
            Caixa disponível
          </span>

          <strong>
            {formatCurrency(
              data.finance.cash,
            )}
          </strong>

          <small>
            Saldo atual informado
            no Bank
          </small>
        </article>

        <article>
          <BriefcaseBusiness
            size={20}
          />

          <span>
            Capital alocado
          </span>

          <strong>
            {formatCurrency(
              data.finance
                .capitalAllocated,
            )}
          </strong>

          <small>
            Estoque + pedidos em
            aberto
          </small>
        </article>
      </section>

      <section className="executive-section-grid">
        <article className="panel executive-result-panel">
          <div className="panel-head">
            <div>
              <h2>
                Resultado comercial
                gerencial
              </h2>

              <p>
                Receita − custo dos
                produtos = lucro bruto
                das vendas. Não é DRE
                contábil.
              </p>
            </div>

            <BarChart3 size={20} />
          </div>

          <div className="executive-result-table">
            <div>
              <span>
                Receita bruta
              </span>

              <strong>
                {formatCurrency(
                  data.sales.company
                    .revenue,
                )}
              </strong>
            </div>

            <div>
              <span>
                Custo dos produtos
                vendidos
              </span>

              <strong>
                {formatCurrency(
                  data.sales.company
                    .cost,
                )}
              </strong>
            </div>

            <div className="highlight">
              <span>
                Lucro bruto das
                vendas
              </span>

              <strong>
                {formatCurrency(
                  data.sales.company
                    .profit,
                )}
              </strong>
            </div>

            <div>
              <span>
                Recebido no mês
              </span>

              <strong>
                {formatCurrency(
                  data.sales
                    .receivedThisMonth,
                )}
              </strong>
            </div>

            <div>
              <span>
                Investido em compras
                no mês
              </span>

              <strong>
                {formatCurrency(
                  data.finance
                    .monthlyInvested,
                )}
              </strong>
            </div>
          </div>

          <div className="executive-result-warning">
            <AlertTriangle
              size={16}
            />

            <span>
              Despesas gerais,
              impostos, taxas e
              retiradas ainda não são
              classificados como uma
              DRE contábil completa.
              Por isso o sistema não
              chama esse valor de
              lucro líquido.
            </span>
          </div>
        </article>

        <article className="panel executive-finance-panel">
          <div className="panel-head">
            <div>
              <h2>
                Caixa e patrimônio
              </h2>

              <p>
                Leitura gerencial
                consolidada do Bank.
              </p>
            </div>

            <WalletCards
              size={20}
            />
          </div>

          <div className="executive-finance-grid">
            <div>
              <span>Caixa</span>
              <strong>
                {formatCurrency(
                  data.finance.cash,
                )}
              </strong>
            </div>

            <div>
              <span>
                A receber
              </span>
              <strong>
                {formatCurrency(
                  data.finance
                    .receivables,
                )}
              </strong>
            </div>

            <div>
              <span>
                Estoque a custo
              </span>
              <strong>
                {formatCurrency(
                  data.finance
                    .inventoryCost,
                )}
              </strong>
            </div>

            <div>
              <span>Dívidas</span>
              <strong>
                {formatCurrency(
                  data.finance.debt,
                )}
              </strong>
            </div>

            <div className="wide">
              <span>
                Posição líquida
                gerencial
              </span>
              <strong>
                {formatCurrency(
                  data.finance
                    .netPosition,
                )}
              </strong>
            </div>
          </div>

          <Link
            className="button ghost compact-button"
            href="/bank"
          >
            Abrir Candinho Bank
            <ArrowRight
              size={14}
            />
          </Link>
        </article>
      </section>

      <article className="panel executive-forecast-panel">
        <div className="panel-head">
          <div>
            <h2>
              Previsão de caixa
            </h2>

            <p>
              Fluxo conhecido em 7
              dias e projeções
              cadastradas para os
              próximos ciclos.
            </p>
          </div>

          <RefreshCcw size={20} />
        </div>

        <div className="executive-forecast-grid">
          <ForecastCard
            item={
              data.forecast
                .next7Days
            }
          />

          <ForecastCard
            item={
              data.forecast
                .next30Days
            }
          />

          <ForecastCard
            item={
              data.forecast
                .next60Days
            }
          />

          <ForecastCard
            item={
              data.forecast
                .next90Days
            }
          />
        </div>
      </article>

      <section className="executive-operation-grid">
        <Link
          href="/suplementos"
          className="executive-operation-card supplements"
        >
          <ShoppingBag
            size={21}
          />

          <div>
            <span>
              Suplementos
            </span>

            <strong>
              {formatCurrency(
                data.sales
                  .supplements
                  .revenue,
              )}
            </strong>

            <small>
              {
                data.sales
                  .supplements
                  .count
              }{" "}
              venda(s) · lucro bruto{" "}
              {formatCurrency(
                data.sales
                  .supplements
                  .profit,
              )}
            </small>
          </div>

          <ArrowRight
            size={16}
          />
        </Link>

        <Link
          href="/fitness"
          className="executive-operation-card fitness"
        >
          <Shirt size={21} />

          <div>
            <span>Fitness</span>

            <strong>
              {formatCurrency(
                data.sales.fitness
                  .revenue,
              )}
            </strong>

            <small>
              {
                data.sales.fitness
                  .count
              }{" "}
              venda(s) · lucro bruto{" "}
              {formatCurrency(
                data.sales.fitness
                  .profit,
              )}
            </small>
          </div>

          <ArrowRight
            size={16}
          />
        </Link>

        <Link
          href="/parceiros"
          className="executive-operation-card partners"
        >
          <Handshake
            size={21}
          />

          <div>
            <span>
              Rede de parceiros
            </span>

            <strong>
              {
                data.operations
                  .activePartners
              }{" "}
              ativos
            </strong>

            <small>
              {
                data.operations
                  .partnerStockUnits
              }{" "}
              un. na rede ·{" "}
              {
                data.operations
                  .partnerSettlementsPending
              }{" "}
              acerto(s)
            </small>
          </div>

          <ArrowRight
            size={16}
          />
        </Link>

        <Link
          href="/marketing"
          className="executive-operation-card marketing"
        >
          <Megaphone
            size={21}
          />

          <div>
            <span>Marketing</span>

            <strong>
              {
                data.operations
                  .marketingActive
              }{" "}
              ativos
            </strong>

            <small>
              {
                data.operations
                  .marketingReady
              }{" "}
              processados ·{" "}
              {
                data.operations
                  .marketingPublished
              }{" "}
              publicados
            </small>
          </div>

          <ArrowRight
            size={16}
          />
        </Link>
      </section>

      <section className="executive-section-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Pendências
                operacionais
              </h2>

              <p>
                O que ainda exige ação
                humana.
              </p>
            </div>

            <ReceiptText
              size={20}
            />
          </div>

          <div className="executive-pending-grid">
            <Link href="/pos-venda">
              <MessageSquareText
                size={18}
              />
              <span>
                Pós-venda aberto
              </span>
              <strong>
                {
                  data.operations
                    .postSaleOpen
                }
              </strong>
            </Link>

            <Link href="/trocas">
              <RefreshCcw
                size={18}
              />
              <span>
                Trocas/devoluções
              </span>
              <strong>
                {
                  data.operations
                    .openReturns
                }
              </strong>
            </Link>

            <Link href="/produtos">
              <PackageX
                size={18}
              />
              <span>
                Estoque zerado
              </span>
              <strong>
                {
                  data.operations
                    .zeroStock
                }
              </strong>
            </Link>

            <Link href="/produtos">
              <Boxes size={18} />
              <span>
                Estoque baixo
              </span>
              <strong>
                {
                  data.operations
                    .lowStock
                }
              </strong>
            </Link>
          </div>
        </article>

        <article className="panel executive-homologation-panel">
          <div className="panel-head">
            <div>
              <h2>
                Homologação
                operacional
              </h2>

              <p>
                Checklist vivo antes
                de encerrar esta fase.
              </p>
            </div>

            <CheckCircle2
              size={20}
            />
          </div>

          <div className="executive-check-list">
            <div
              className={
                data.operations
                  .flavorIntegrityIssues ===
                0
                  ? "ok"
                  : "attention"
              }
            >
              <i />
              <span>
                Integridade de
                sabores
              </span>
              <strong>
                {data.operations
                  .flavorIntegrityIssues ===
                0
                  ? "OK"
                  : `${data.operations.flavorIntegrityIssues} ocorrência(s)`}
              </strong>
            </div>

            <div
              className={
                data.operations
                  .postSaleOverdue ===
                0
                  ? "ok"
                  : "attention"
              }
            >
              <i />
              <span>
                Pós-vendas
                atrasados
              </span>
              <strong>
                {data.operations
                  .postSaleOverdue ===
                0
                  ? "OK"
                  : data.operations
                      .postSaleOverdue}
              </strong>
            </div>

            <div
              className={
                data.operations
                  .overdueConsignments ===
                0
                  ? "ok"
                  : "attention"
              }
            >
              <i />
              <span>
                Consignações
                atrasadas
              </span>
              <strong>
                {data.operations
                  .overdueConsignments ===
                0
                  ? "OK"
                  : data.operations
                      .overdueConsignments}
              </strong>
            </div>

            <div
              className={
                data.operations
                  .marketingErrors ===
                0
                  ? "ok"
                  : "attention"
              }
            >
              <i />
              <span>
                Processamento de
                Marketing
              </span>
              <strong>
                {data.operations
                  .marketingErrors ===
                0
                  ? "OK"
                  : `${data.operations.marketingErrors} erro(s)`}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <article className="panel executive-alerts-panel">
        <div className="panel-head">
          <div>
            <h2>
              Alertas executivos
            </h2>

            <p>
              Ordenados por
              criticidade.
            </p>
          </div>

          <span className="badge gray">
            {
              data.alerts.length
            }{" "}
            alerta(s)
          </span>
        </div>

        {data.alerts.length ===
        0 ? (
          <div className="empty">
            <CheckCircle2
              size={28}
            />
            <strong>
              Nenhum alerta
              executivo ativo
            </strong>
            As verificações
            gerenciais não
            encontraram pendências
            neste momento.
          </div>
        ) : (
          <div className="executive-alert-list">
            {data.alerts.map(
              (
                item,
                index,
              ) => (
                <Link
                  href={item.href}
                  key={`${item.title}-${index}`}
                >
                  <span
                    className={`badge ${alertClass(
                      item.tone,
                    )}`}
                  >
                    {
                      item.count
                    }
                  </span>

                  <div>
                    <strong>
                      {
                        item.title
                      }
                    </strong>

                    <small>
                      {
                        item.description
                      }
                    </small>
                  </div>

                  {item.amount !==
                    undefined && (
                    <b>
                      {formatCurrency(
                        item.amount,
                      )}
                    </b>
                  )}

                  <ArrowRight
                    size={15}
                  />
                </Link>
              ),
            )}
          </div>
        )}
      </article>

      <div className="executive-close-phase">
        <Crown size={22} />

        <div>
          <strong>
            Candinho Company · fase
            operacional consolidada
          </strong>

          <span>
            A Sala do Dono não
            altera dados. Ela só
            transforma o que já
            existe em uma leitura de
            gestão para decisão.
          </span>
        </div>
      </div>
    </section>
  );
}
