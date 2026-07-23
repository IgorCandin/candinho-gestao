import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Boxes,
  CircleDollarSign,
  Edit3,
  Gift,
  Handshake,
  History,
  MapPin,
  Phone,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { PageHeader } from "@/components/page-header";
import { PartnerRewardPanel } from "@/components/partner-reward-panel";
import { PartnerSettlementPanel } from "@/components/partner-settlement-panel";
import { PartnerUnassignedSales } from "@/components/partner-unassigned-sales";
import { StatCard } from "@/components/stat-card";
import {
  getEntitySwipeNavigation,
  getPartnerDetails,
} from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getPartnerLegacyHistory } from "@/lib/partner-legacy-history";

function rewardLabel(type: string) {
  if (type === "gift_per_sales") return "Brinde por meta";
  if (type === "fixed_per_sale") return "Valor fixo por venda";
  if (type === "percentage") return "Percentual das vendas";
  if (type === "none") return "Sem acerto";
  return "Acerto manual";
}

export default async function PartnerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [details, swipe, legacyHistory] = await Promise.all([
    getPartnerDetails(id),
    getEntitySwipeNavigation("partner", id),
    getPartnerLegacyHistory(id),
  ]);

  if (!details) notFound();

  const {
    overview: partner,
    sales,
    settlements,
    unassignedSales,
  } = details;

  const giftPartner = partner as typeof partner & {
    reward_sales_covered?: number;
    next_reward_at_sales?: number | null;
    sales_to_next_reward?: number | null;
  };

  const isGiftReward =
    partner.reward_type === "gift_per_sales" &&
    Number(partner.target_sales ?? 0) > 0;

  const targetSales = Number(partner.target_sales ?? 0);
  const allTimeSales = Number(partner.all_time_sales_count ?? 0);
  const coveredSales = Number(giftPartner.reward_sales_covered ?? 0);
  const nextRewardAt = Number(
    giftPartner.next_reward_at_sales ??
      (coveredSales + targetSales),
  );
  const salesToNext = Math.max(
    0,
    Number(
      giftPartner.sales_to_next_reward ??
        (nextRewardAt - allTimeSales),
    ),
  );

  const progressPct = isGiftReward
    ? salesToNext > targetSales
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((targetSales - salesToNext) / targetSales) * 100,
            ),
          ),
        )
    : Math.round(partner.progress_pct);

  const rewardPrepaidAhead =
    isGiftReward && coveredSales > allTimeSales;

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Parceria"
        title={partner.name}
        description={`${partner.partner_type}${
          partner.city ? ` · ${partner.city}` : ""
        }`}
        action={
          <Link
            className="button gold"
            href={`/parceiros/${partner.id}/editar`}
          >
            <Edit3 size={16} />
            Editar parceiro
          </Link>
        }
      />

      <EntitySwipeNavigator
        previous={swipe.previous}
        next={swipe.next}
      />

      <section className="stats-grid partner-detail-stats">
        <StatCard
          href="/vendas"
          label={
            isGiftReward
              ? "Vendas contabilizadas"
              : "Vendas no ciclo"
          }
          value={String(
            isGiftReward
              ? allTimeSales
              : partner.current_cycle_sales_count,
          )}
          note={`Desde ${formatDateOnly(
            isGiftReward ? partner.start_date : partner.cycle_start,
          )}`}
          icon={UsersRound}
        />

        <StatCard
          href="/vendas"
          label={
            isGiftReward
              ? "Faturamento da parceria"
              : "Faturamento no ciclo"
          }
          value={formatCurrency(
            isGiftReward
              ? partner.all_time_revenue
              : partner.current_cycle_revenue,
          )}
          note={`${formatCurrency(
            isGiftReward
              ? partner.all_time_profit
              : partner.current_cycle_profit,
          )} de lucro`}
          icon={CircleDollarSign}
        />

        <StatCard
          href="/parceiros"
          label={
            isGiftReward ? "Próxima recompensa" : "Recompensa estimada"
          }
          value={
            isGiftReward
              ? salesToNext === 0
                ? "Meta alcançada"
                : `${salesToNext} venda(s)`
              : formatCurrency(partner.estimated_reward_amount)
          }
          note={
            isGiftReward
              ? `Meta em ${nextRewardAt} vendas`
              : partner.settlement_pending
                ? "Acerto pendente"
                : "Ciclo em andamento"
          }
          icon={Gift}
        />

        <StatCard
          href="/estoque"
          label="Estoque no ponto"
          value={String(partner.linked_location_units)}
          note={partner.linked_location_code ?? "Sem ponto relacionado"}
          icon={Boxes}
        />
      </section>

      <section className="partner-detail-layout">
        <div className="partner-detail-main">
          <article className="panel partner-progress-panel">
            <div className="panel-head">
              <div>
                <h2>Progresso da parceria</h2>
                <p>
                  {partner.reward_description ??
                    rewardLabel(partner.reward_type)}
                </p>
              </div>

              <Badge
                value={
                  partner.settlement_pending
                    ? "pending"
                    : partner.status === "Pausado" || !partner.active
                      ? "inactive"
                      : "active"
                }
              />
            </div>

            <div className="panel-body">
              {isGiftReward ? (
                <>
                  <div className="partner-progress-large">
                    <div>
                      <strong>{allTimeSales}</strong>
                      <span>vendas contabilizadas</span>
                    </div>

                    <div>
                      <strong>
                        {salesToNext === 0
                          ? "Meta alcançada"
                          : salesToNext}
                      </strong>
                      <span>
                        {salesToNext === 0
                          ? `recompensa disponível na meta ${nextRewardAt}`
                          : `venda(s) para a meta ${nextRewardAt}`}
                      </span>
                    </div>
                  </div>

                  <div className="partner-progress-track large">
                    <span style={{ width: `${progressPct}%` }} />
                  </div>

                  {partner.reward_units_due > 0 && (
                    <p className="partner-reward-alert">
                      <Gift size={17} />
                      {partner.reward_units_due} recompensa(s) já
                      alcançada(s). Registre a entrega para avançar a
                      próxima meta.
                    </p>
                  )}

                  {partner.reward_units_due === 0 &&
                    rewardPrepaidAhead && (
                      <p className="partner-reward-alert">
                        <Gift size={17} />
                        A recompensa da meta {coveredSales} já foi
                        entregue antecipadamente. As vendas não foram
                        apagadas; a próxima meta é {nextRewardAt}.
                      </p>
                    )}
                </>
              ) : (
                <div className="partner-progress-large">
                  <div>
                    <strong>{partner.current_cycle_sales_count}</strong>
                    <span>vendas contabilizadas</span>
                  </div>

                  <div>
                    <strong>
                      {partner.reward_type === "fixed_per_sale" ||
                      partner.reward_type === "percentage"
                        ? formatCurrency(
                            partner.estimated_reward_amount,
                          )
                        : partner.reward_type === "none"
                          ? "Sem recompensa"
                          : "Manual"}
                    </strong>
                    <span>recompensa estimada</span>
                  </div>
                </div>
              )}
            </div>
          </article>

          {legacyHistory.length > 0 && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Histórico legado recuperado</h2>
                  <p>
                    Movimentações antigas encontradas na migração.
                    Registros de teste e espelhos duplicados foram
                    ocultados.
                  </p>
                </div>
                <History size={19} />
              </div>

              <div className="panel-body" style={{ padding: 0 }}>
                <div className="bank-charge-list">
                  {legacyHistory.map((movement) => (
                    <div
                      className="bank-charge-item"
                      key={movement.id}
                    >
                      <div className="bank-charge-date">
                        <strong>
                          {formatDateOnly(movement.occurredAt)}
                        </strong>
                        <span>{movement.movementType}</span>
                      </div>

                      <div className="bank-charge-main">
                        <strong>
                          {movement.quantity}x {movement.product}
                        </strong>
                        <span>
                          {movement.destinationCode ??
                            movement.originCode ??
                            "Parceiro"}
                        </span>
                      </div>

                      <div className="bank-charge-value">
                        <span className="badge gray">Legado</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    color: "var(--muted)",
                    fontSize: 9,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  Estes registros mostram o que foi movimentado para a
                  parceria. Quando o legado não identifica explicitamente
                  “brinde”, o sistema não presume a classificação.
                </div>
              </div>
            </article>
          )}

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Vendas vinculadas</h2>
                <p>Histórico comercial atribuído a este parceiro.</p>
              </div>
              <strong>{sales.length}</strong>
            </div>

            {sales.length === 0 ? (
              <div className="empty">
                <TrendingUp size={25} />
                <strong>Nenhuma venda vinculada</strong>
                Selecione o parceiro ao registrar uma nova venda.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table partner-sales-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Produto</th>
                      <th>Data</th>
                      <th>Pagamento</th>
                      <th>Entrega</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <Link
                            className="table-link"
                            href={`/vendas/${sale.id}`}
                          >
                            <strong>{sale.customer_name}</strong>
                          </Link>
                        </td>
                        <td>{sale.product_summary ?? "—"}</td>
                        <td>{formatDateOnly(sale.sale_date)}</td>
                        <td>
                          <Badge value={sale.payment_status} />
                        </td>
                        <td>
                          <Badge value={sale.delivery_status} />
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(sale.total_amount)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {partner.reward_type === "gift_per_sales" ? (
            <PartnerRewardPanel
              partner={partner}
              settlements={settlements}
            />
          ) : partner.reward_type === "none" ? null : (
            <PartnerSettlementPanel
              partner={partner}
              settlements={settlements}
            />
          )}

          <PartnerUnassignedSales
            partnerId={partner.id}
            sales={unassignedSales}
          />
        </div>

        <aside className="partner-detail-side">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Dados da parceria</h2>
                <p>Contato e configuração atual.</p>
              </div>
              <Handshake size={19} />
            </div>

            <div className="panel-body sale-detail-list">
              {partner.contact_name && (
                <div className="sale-detail-line">
                  <span>Responsável</span>
                  <strong>{partner.contact_name}</strong>
                </div>
              )}

              {partner.phone && (
                <div className="sale-detail-line">
                  <span>Telefone</span>
                  <strong className="detail-with-icon">
                    <Phone size={14} />
                    {partner.phone}
                  </strong>
                </div>
              )}

              {partner.city && (
                <div className="sale-detail-line">
                  <span>Cidade</span>
                  <strong className="detail-with-icon">
                    <MapPin size={14} />
                    {partner.city}
                  </strong>
                </div>
              )}

              <div className="sale-detail-line">
                <span>Modelo</span>
                <strong>{rewardLabel(partner.reward_type)}</strong>
              </div>

              {partner.target_sales && (
                <div className="sale-detail-line">
                  <span>Intervalo da recompensa</span>
                  <strong>
                    A cada {partner.target_sales} vendas
                  </strong>
                </div>
              )}

              {isGiftReward && (
                <div className="sale-detail-line">
                  <span>Próxima meta</span>
                  <strong>{nextRewardAt} vendas</strong>
                </div>
              )}

              {partner.reward_value > 0 && (
                <div className="sale-detail-line">
                  <span>Valor</span>
                  <strong>
                    {partner.reward_type === "percentage"
                      ? `${partner.reward_value}%`
                      : formatCurrency(partner.reward_value)}
                  </strong>
                </div>
              )}

              {partner.settlement_day && (
                <div className="sale-detail-line">
                  <span>Dia do acerto</span>
                  <strong>Dia {partner.settlement_day}</strong>
                </div>
              )}

              {partner.coupon_code && (
                <div className="sale-detail-line">
                  <span>Cupom</span>
                  <strong>{partner.coupon_code}</strong>
                </div>
              )}

              {partner.linked_location_name && (
                <div className="sale-detail-line">
                  <span>Ponto físico</span>
                  <strong className="detail-with-icon">
                    <Store size={14} />
                    {partner.linked_location_code}
                  </strong>
                </div>
              )}

              <div className="sale-detail-line">
                <span>Contabilização</span>
                <strong>
                  {partner.counts_only_delivered
                    ? "Somente entregues"
                    : "Todas as vendas"}
                </strong>
              </div>

              {partner.last_settlement_on && (
                <div className="sale-detail-line">
                  <span>
                    {partner.reward_type === "gift_per_sales"
                      ? "Última recompensa"
                      : "Último acerto"}
                  </span>
                  <strong>
                    {formatDateOnly(partner.last_settlement_on)}
                  </strong>
                </div>
              )}
            </div>
          </article>

          {(partner.partnership_model ||
            partner.settlement_rule ||
            partner.notes) && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Regras e observações</h2>
                </div>
              </div>

              <div className="panel-body partner-notes-block">
                {partner.partnership_model && (
                  <div>
                    <span>Modelo</span>
                    <p>{partner.partnership_model}</p>
                  </div>
                )}

                {partner.settlement_rule && (
                  <div>
                    <span>Regra</span>
                    <p>{partner.settlement_rule}</p>
                  </div>
                )}

                {partner.notes && (
                  <div>
                    <span>Observações</span>
                    <p>{partner.notes}</p>
                  </div>
                )}
              </div>
            </article>
          )}
        </aside>
      </section>
    </>
  );
}
