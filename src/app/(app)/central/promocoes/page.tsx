import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgePercent,
  CalendarDays,
  CircleDollarSign,
  Eye,
  Lightbulb,
  PackageSearch,
  Plus,
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

type View = "active" | "scheduled" | "draft" | "ended" | "all";

function normalizeView(value: string | undefined): View {
  return ["active", "scheduled", "draft", "ended", "all"].includes(value ?? "")
    ? (value as View)
    : "active";
}

export default async function CentralPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [access, params, data] = await Promise.all([
    getCurrentUserAccess(),
    searchParams,
    getPromotionsCenter(),
  ]);

  const canManage =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canManage) redirect("/central");

  const { promotions, suggestions } = data;
  const view = normalizeView(params.status);

  const active = promotions.filter((item) => item.effective_status === "active");
  const scheduled = promotions.filter((item) => item.effective_status === "scheduled");
  const drafts = promotions.filter((item) => item.effective_status === "draft");

  const visiblePromotions =
    view === "all"
      ? promotions
      : promotions.filter((promotion) => promotion.effective_status === view);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Promoções"
        description="Crie campanhas, escolha os produtos visualmente, configure as ofertas e confira a exposição antes de publicar."
        action={
          <Link className="button ghost" href="/promocoes">
            <Eye size={16} />
            Ver exposição
          </Link>
        }
      />

      <section className="stats-grid promotion-stats-grid">
        <StatCard href="/central/promocoes?status=active" label="Ativas" value={String(active.length)} note="Campanhas em execução" icon={BadgePercent} />
        <StatCard href="/central/promocoes?status=scheduled" label="Agendadas" value={String(scheduled.length)} note="Próximas campanhas" icon={CalendarDays} />
        <StatCard href="/central/promocoes?status=draft" label="Rascunhos" value={String(drafts.length)} note="Aguardando configuração" icon={PackageSearch} />
        <StatCard href="#sugestoes-nexus" label="Sugestões Nexus" value={String(suggestions.length)} note="Oportunidades detectadas" icon={Sparkles} />
      </section>

      <details className="panel promotion-ux-create" open={promotions.length === 0}>
        <summary>
          <div>
            <div className="promotion-ux-step-number">+</div>
            <div>
              <strong>Criar nova promoção</strong>
              <span>Comece pela campanha. A escolha visual dos produtos acontece na próxima tela.</span>
            </div>
          </div>
          <Plus size={18} />
        </summary>

        <form action={createPromotion} className="promotion-form promotion-ux-create-form">
          <label className="field promotion-ux-wide">
            <span>Nome da promoção</span>
            <input className="input" name="name" placeholder="Ex.: Semana do Whey" required />
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
              <input className="input" name="default_discount_pct" inputMode="decimal" defaultValue="0" />
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
            <textarea className="input promotion-textarea" name="notes" placeholder="Regra, público ou condição especial..." />
          </label>

          <button className="button gold" type="submit">
            Criar rascunho e escolher produtos
          </button>
        </form>
      </details>

      <section className="promotion-ux-section-head">
        <div>
          <span>CAMPANHAS</span>
          <h2>Gerenciar promoções</h2>
          <p>Entre em uma campanha para selecionar produtos, configurar preços e visualizar a exposição.</p>
        </div>

        <nav className="promotion-ux-tabs">
          {[
            ["active", "Ativas"],
            ["scheduled", "Agendadas"],
            ["draft", "Rascunhos"],
            ["ended", "Encerradas"],
            ["all", "Todas"],
          ].map(([value, label]) => (
            <Link className={view === value ? "active" : ""} href={`/central/promocoes?status=${value}`} key={value}>
              {label}
            </Link>
          ))}
        </nav>
      </section>

      {visiblePromotions.length === 0 ? (
        <div className="panel promotion-ux-empty large">
          <BadgePercent size={28} />
          <strong>Nenhuma campanha nesta situação</strong>
          <span>Crie uma nova promoção ou consulte outra aba.</span>
        </div>
      ) : (
        <div className="promotion-ux-admin-grid">
          {visiblePromotions.map((promotion) => (
            <Link className="promotion-ux-admin-card" href={`/central/promocoes/${promotion.id}`} key={promotion.id}>
              <div className="promotion-ux-admin-card-top">
                <span className={`promotion-ux-status ${promotion.effective_status}`}>
                  {statusLabel[promotion.effective_status] ?? promotion.effective_status}
                </span>
                <small>{operationLabel[promotion.operation_scope]}</small>
              </div>

              <strong>{promotion.name}</strong>
              <p>
                {typeLabel[promotion.promotion_type] ?? promotion.promotion_type}
                {promotion.default_discount_pct > 0 ? ` · ${promotion.default_discount_pct}% padrão` : ""}
              </p>

              <div className="promotion-ux-admin-card-numbers">
                <span><b>{promotion.item_count}</b> produtos</span>
                <span><b>{promotion.supplement_item_count}</b> Sup.</span>
                <span><b>{promotion.fitness_item_count}</b> Fitness</span>
              </div>

              <footer>
                <span>
                  {promotion.starts_on ? formatDateOnly(promotion.starts_on) : "Sem início"}
                  {" → "}
                  {promotion.ends_on ? formatDateOnly(promotion.ends_on) : "Sem fim"}
                </span>
                <b>Abrir campanha →</b>
              </footer>
            </Link>
          ))}
        </div>
      )}

      <details className="panel promotion-ux-suggestions" id="sugestoes-nexus">
        <summary>
          <div>
            <Lightbulb size={18} />
            <div>
              <strong>Sugestões Nexus</strong>
              <span>{suggestions.length} oportunidade(s) detectada(s) por giro e estoque.</span>
            </div>
          </div>
          <Sparkles size={18} />
        </summary>

        {suggestions.length === 0 ? (
          <div className="promotion-ux-empty">
            <Sparkles size={25} />
            <strong>Nenhuma oportunidade forte agora</strong>
          </div>
        ) : (
          <div className="promotion-suggestion-grid">
            {suggestions.map((suggestion) => (
              <article className={`promotion-suggestion-card ${suggestion.protected_price ? "protected" : ""}`} key={suggestion.suggestion_key}>
                <div className="promotion-suggestion-head">
                  <span className="badge blue">{operationLabel[suggestion.operation_scope]}</span>
                  <b>Score {suggestion.score}</b>
                </div>

                <strong>{suggestion.entity_label}</strong>
                <p>{suggestion.reason}</p>

                <div className="promotion-suggestion-numbers">
                  <span>Estoque<strong>{suggestion.available_quantity}</strong></span>
                  <span>Saída 30d<strong>{suggestion.units_30d}</strong></span>
                  <span>Saída 90d<strong>{suggestion.units_90d}</strong></span>
                </div>

                <div className="promotion-suggestion-price">
                  <span>Atual<strong>{formatCurrency(suggestion.current_price)}</strong></span>
                  <span>
                    {suggestion.protected_price ? "Preço protegido" : "Sugestão"}
                    <strong>
                      {suggestion.protected_price
                        ? "Sem desconto"
                        : `${suggestion.recommended_discount_pct}% · ${formatCurrency(suggestion.recommended_price)}`}
                    </strong>
                  </span>
                </div>

                <form action={createPromotionFromSuggestion}>
                  <input type="hidden" name="operation_scope" value={suggestion.operation_scope} />
                  <input type="hidden" name="entity_id" value={suggestion.entity_id} />
                  <input type="hidden" name="entity_label" value={suggestion.entity_label} />
                  <input type="hidden" name="recommended_discount_pct" value={suggestion.recommended_discount_pct} />
                  <input type="hidden" name="protected_price" value={String(suggestion.protected_price)} />
                  <button className="button ghost dashboard-full-button" type="submit">
                    Criar rascunho com esta sugestão
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}

        <div className="promotion-footnote">
          <CircleDollarSign size={17} />
          <span>Nenhuma promoção é ativada automaticamente pelo Nexus.</span>
        </div>
      </details>
    </>
  );
}
