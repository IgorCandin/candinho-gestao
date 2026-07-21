import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgePercent,
  CalendarDays,
  CircleDollarSign,
  Lightbulb,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getPromotionsCenter } from "@/lib/promotion-data";
import {
  createPromotion,
  createPromotionFromSuggestion,
} from "./actions";

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  active: "Ativa",
  ended: "Encerrada",
  cancelled: "Cancelada",
};

const operationLabel: Record<string, string> = {
  supplements: "Suplementos",
  fitness: "Fitness",
  both: "Suplementos + Fitness",
};

const typeLabel: Record<string, string> = {
  percentage: "% de desconto",
  fixed_price: "Preço promocional",
  bundle: "Combo",
  buy_x_pay_y: "Leve X / pague Y",
  coupon: "Cupom",
  cross_sell: "Cross-sell",
};

export default async function CentralPromotionsPage() {
  const access = await getCurrentUserAccess();

  const canManage =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canManage) redirect("/central");

  const { promotions, suggestions } = await getPromotionsCenter();

  const active = promotions.filter((item) => item.effective_status === "active");
  const scheduled = promotions.filter(
    (item) => item.effective_status === "scheduled",
  );
  const drafts = promotions.filter((item) => item.effective_status === "draft");

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Promoções"
        description="Planeje campanhas de Suplementos e Fitness, selecione produtos individualmente ou em lote e use os dados reais de giro e estoque para decidir onde vale promover."
      />

      <section className="stats-grid promotion-stats-grid">
        <StatCard
          href="/central/promocoes"
          label="Ativas"
          value={String(active.length)}
          note="Campanhas em execução agora"
          icon={BadgePercent}
        />

        <StatCard
          href="/central/promocoes"
          label="Agendadas"
          value={String(scheduled.length)}
          note="Próximas campanhas"
          icon={CalendarDays}
        />

        <StatCard
          href="/central/promocoes"
          label="Rascunhos"
          value={String(drafts.length)}
          note="Planejamento ainda não ativado"
          icon={PackageSearch}
        />

        <StatCard
          href="#sugestoes-nexus"
          label="Sugestões Nexus"
          value={String(suggestions.length)}
          note="Oportunidades detectadas nos dados"
          icon={Sparkles}
        />
      </section>

      <section className="promotion-main-grid">
        <article className="panel promotion-create-panel">
          <div className="panel-head">
            <div>
              <h2>Nova promoção</h2>
              <p>Crie a campanha primeiro e depois escolha os produtos em lote.</p>
            </div>
            <BadgePercent size={20} />
          </div>

          <form action={createPromotion} className="promotion-form">
            <label className="field">
              <span>Nome da promoção</span>
              <input
                className="input"
                name="name"
                placeholder="Ex.: Semana do Whey"
                required
              />
            </label>

            <div className="promotion-form-grid">
              <label className="field">
                <span>Operação</span>
                <select className="select" name="operation_scope" defaultValue="both">
                  <option value="both">Suplementos + Fitness</option>
                  <option value="supplements">Suplementos</option>
                  <option value="fitness">Fitness</option>
                </select>
              </label>

              <label className="field">
                <span>Objetivo</span>
                <select className="select" name="objective" defaultValue="stock_turnover">
                  <option value="stock_turnover">Girar estoque</option>
                  <option value="revenue">Aumentar faturamento</option>
                  <option value="customer_acquisition">Atrair clientes</option>
                  <option value="launch">Lançamento</option>
                  <option value="cross_sell">Cross-sell</option>
                  <option value="seasonal">Campanha sazonal</option>
                </select>
              </label>

              <label className="field">
                <span>Tipo</span>
                <select className="select" name="promotion_type" defaultValue="percentage">
                  <option value="percentage">% de desconto</option>
                  <option value="fixed_price">Preço promocional</option>
                  <option value="bundle">Combo</option>
                  <option value="buy_x_pay_y">Leve X / pague Y</option>
                  <option value="coupon">Cupom</option>
                  <option value="cross_sell">Cross-sell</option>
                </select>
              </label>

              <label className="field">
                <span>Desconto padrão (%)</span>
                <input
                  className="input"
                  name="default_discount_pct"
                  inputMode="decimal"
                  defaultValue="0"
                />
              </label>

              <label className="field">
                <span>Início</span>
                <input className="input" type="date" name="starts_on" />
              </label>

              <label className="field">
                <span>Fim</span>
                <input className="input" type="date" name="ends_on" />
              </label>

              <label className="field">
                <span>Cupom</span>
                <input className="input" name="coupon_code" placeholder="Opcional" />
              </label>
            </div>

            <fieldset className="promotion-channels">
              <legend>Canais</legend>
              {["Instagram", "WhatsApp", "Loja", "Parceiros"].map((channel) => (
                <label key={channel}>
                  <input type="checkbox" name="channels" value={channel.toLowerCase()} />
                  {channel}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span>Observações</span>
              <textarea
                className="input promotion-textarea"
                name="notes"
                placeholder="Objetivo, regra da campanha, público, condição especial..."
              />
            </label>

            <button className="button gold" type="submit">
              Criar rascunho e escolher produtos
            </button>
          </form>
        </article>

        <article className="panel promotion-rules-panel">
          <div className="panel-head">
            <div>
              <h2>Regra de decisão</h2>
              <p>O Nexus não recomenda desconto só porque existe estoque.</p>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div className="promotion-rules-list">
            <div>
              <strong>Produto A saudável</strong>
              <span>Protege preço. Pode virar chamariz ou cross-sell sem desconto.</span>
            </div>
            <div>
              <strong>Estoque parado</strong>
              <span>Prioridade para queima controlada e liberação de capital.</span>
            </div>
            <div>
              <strong>Excesso de estoque</strong>
              <span>Campanha de giro, combo ou desconto moderado.</span>
            </div>
            <div>
              <strong>Curva C</strong>
              <span>Só entra quando existe saldo real a girar; zerado não é problema.</span>
            </div>
            <div>
              <strong>Curva Z</strong>
              <span>Nunca entra automaticamente em promoção pública.</span>
            </div>
          </div>
        </article>
      </section>

      <article className="panel promotion-list-panel">
        <div className="panel-head">
          <div>
            <h2>Promoções cadastradas</h2>
            <p>Ativas, próximas, rascunhos e histórico no mesmo lugar.</p>
          </div>
          <BadgePercent size={20} />
        </div>

        {promotions.length === 0 ? (
          <div className="empty">
            <BadgePercent size={28} />
            <strong>Nenhuma promoção cadastrada</strong>
            Crie o primeiro rascunho ou transforme uma sugestão do Nexus em campanha.
          </div>
        ) : (
          <div className="promotion-list-grid">
            {promotions.map((promotion) => (
              <Link
                className="promotion-list-card"
                href={`/central/promocoes/${promotion.id}`}
                key={promotion.id}
              >
                <div className="promotion-list-card-head">
                  <span className={`badge promotion-status-${promotion.effective_status}`}>
                    {statusLabel[promotion.effective_status] ?? promotion.effective_status}
                  </span>
                  <small>{operationLabel[promotion.operation_scope]}</small>
                </div>

                <strong>{promotion.name}</strong>

                <span>
                  {typeLabel[promotion.promotion_type] ?? promotion.promotion_type}
                  {promotion.default_discount_pct > 0
                    ? ` · ${promotion.default_discount_pct}% padrão`
                    : ""}
                </span>

                <div className="promotion-list-card-meta">
                  <small>
                    {promotion.starts_on
                      ? formatDateOnly(promotion.starts_on)
                      : "Sem início"}
                    {" → "}
                    {promotion.ends_on ? formatDateOnly(promotion.ends_on) : "Sem fim"}
                  </small>
                  <b>{promotion.item_count} item(ns)</b>
                </div>
              </Link>
            ))}
          </div>
        )}
      </article>

      <article className="panel promotion-suggestions-panel" id="sugestoes-nexus">
        <div className="panel-head">
          <div>
            <h2>Sugestões Nexus</h2>
            <p>
              Leitura automática de saída, estoque disponível, excesso e tempo sem giro.
              O desconto sugerido é limitado para preservar margem mínima.
            </p>
          </div>
          <Lightbulb size={20} />
        </div>

        {suggestions.length === 0 ? (
          <div className="empty">
            <Sparkles size={28} />
            <strong>Nenhuma oportunidade forte agora</strong>
            O Nexus não encontrou estoque que justifique uma campanha automática.
          </div>
        ) : (
          <div className="promotion-suggestion-grid">
            {suggestions.map((suggestion) => (
              <article
                className={`promotion-suggestion-card ${
                  suggestion.protected_price ? "protected" : ""
                }`}
                key={suggestion.suggestion_key}
              >
                <div className="promotion-suggestion-head">
                  <span className="badge blue">
                    {operationLabel[suggestion.operation_scope]}
                  </span>
                  <b>Score {suggestion.score}</b>
                </div>

                <strong>{suggestion.entity_label}</strong>
                <p>{suggestion.reason}</p>

                <div className="promotion-suggestion-numbers">
                  <span>
                    Estoque
                    <strong>{suggestion.available_quantity}</strong>
                  </span>
                  <span>
                    Saída 30d
                    <strong>{suggestion.units_30d}</strong>
                  </span>
                  <span>
                    Saída 90d
                    <strong>{suggestion.units_90d}</strong>
                  </span>
                </div>

                <div className="promotion-suggestion-action">
                  <Sparkles size={16} />
                  <span>{suggestion.recommended_action}</span>
                </div>

                <div className="promotion-suggestion-price">
                  <span>
                    Atual
                    <strong>{formatCurrency(suggestion.current_price)}</strong>
                  </span>
                  <span>
                    {suggestion.protected_price ? "Preço protegido" : "Sugestão"}
                    <strong>
                      {suggestion.protected_price
                        ? "Sem desconto"
                        : `${suggestion.recommended_discount_pct}% · ${formatCurrency(
                            suggestion.recommended_price,
                          )}`}
                    </strong>
                  </span>
                </div>

                <form action={createPromotionFromSuggestion}>
                  <input
                    type="hidden"
                    name="operation_scope"
                    value={suggestion.operation_scope}
                  />
                  <input type="hidden" name="entity_id" value={suggestion.entity_id} />
                  <input
                    type="hidden"
                    name="entity_label"
                    value={suggestion.entity_label}
                  />
                  <input
                    type="hidden"
                    name="recommended_discount_pct"
                    value={suggestion.recommended_discount_pct}
                  />
                  <input
                    type="hidden"
                    name="protected_price"
                    value={String(suggestion.protected_price)}
                  />

                  <button className="button ghost dashboard-full-button" type="submit">
                    Criar rascunho com esta sugestão
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="promotion-footnote">
        <CircleDollarSign size={17} />
        <span>
          As sugestões são apoio à decisão. Nenhuma promoção é ativada ou publicada
          automaticamente pelo Nexus.
        </span>
      </article>
    </>
  );
}
