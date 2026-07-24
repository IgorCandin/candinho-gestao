import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Eye,
  ExternalLink,
  ImageIcon,
  Save,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PromotionItemSelector } from "@/components/promotion-item-selector";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getPromotionDetail, type PromotionItem } from "@/lib/promotion-data";
import {
  addPromotionItems,
  removePromotionItem,
  savePromotionResults,
  updatePromotionBasics,
  updatePromotionItem,
  updatePromotionStatus,
} from "../actions";

const operationLabel: Record<string, string> = {
  supplements: "Suplementos",
  fitness: "Fitness",
  both: "Suplementos + Fitness",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  active: "Ativa",
  ended: "Encerrada",
  cancelled: "Cancelada",
};

function effectivePrice(item: PromotionItem) {
  if (item.promotional_price != null) return item.promotional_price;
  if (item.discount_pct != null && item.discount_pct > 0) {
    return Math.max(0, item.current_price * (1 - item.discount_pct / 100));
  }
  return item.current_price;
}

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getCurrentUserAccess();

  const canManage =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canManage) redirect("/central");

  const { id } = await params;
  const data = await getPromotionDetail(id);

  if (!data) notFound();

  const { promotion, items, supplementOptions, fitnessOptions } = data;

  const existingSupplementIds = items
    .map((item) => item.supplement_product_id)
    .filter((value): value is string => Boolean(value));

  const existingFitnessIds = items
    .map((item) => item.fitness_variant_id)
    .filter((value): value is string => Boolean(value));

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Promoções"
        title={promotion.name}
        description={`${operationLabel[promotion.operation_scope]} · ${statusLabel[promotion.effective_status]} · ${promotion.item_count} produto(s)`}
        action={
          <div className="promotion-ux-header-actions">
            <Link className="button ghost" href="/central/promocoes">
              <ArrowLeft size={16} />
              Promoções
            </Link>
            <Link className="button ghost" href="/promocoes">
              <Eye size={16} />
              Ver exposição
            </Link>
          </div>
        }
      />

      <section className="promotion-ux-flow">
        {[
          ["1", "Configuração", "Defina período e regra"],
          ["2", "Produtos", `${promotion.item_count} selecionado(s)`],
          ["3", "Ofertas", "Configure preço e limite"],
          ["4", "Publicar", statusLabel[promotion.effective_status]],
        ].map(([number, title, note]) => (
          <article key={number}>
            <b>{number}</b>
            <div><strong>{title}</strong><span>{note}</span></div>
          </article>
        ))}
      </section>

      <article className="panel promotion-ux-step-panel">
        <div className="promotion-ux-step-head">
          <div className="promotion-ux-step-number">1</div>
          <div>
            <span>CONFIGURAÇÃO</span>
            <h2>Dados da campanha</h2>
            <p>Período, tipo, desconto padrão e canais.</p>
          </div>
          <BadgePercent size={20} />
        </div>

        <form action={updatePromotionBasics} className="promotion-form promotion-ux-config-form">
          <input type="hidden" name="promotion_id" value={promotion.id} />

          <label className="field promotion-ux-wide">
            <span>Nome</span>
            <input className="input" name="name" defaultValue={promotion.name} required />
          </label>

          <div className="promotion-form-grid">
            <label className="field">
              <span>Operação</span>
              <select className="select" name="operation_scope" defaultValue={promotion.operation_scope}>
                <option value="both">Suplementos + Fitness</option>
                <option value="supplements">Suplementos</option>
                <option value="fitness">Fitness</option>
              </select>
            </label>

            <label className="field">
              <span>Objetivo</span>
              <select className="select" name="objective" defaultValue={promotion.objective}>
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
              <select className="select" name="promotion_type" defaultValue={promotion.promotion_type}>
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
              <input className="input" name="default_discount_pct" defaultValue={promotion.default_discount_pct} />
            </label>

            <label className="field">
              <span>Início</span>
              <input className="input" type="date" name="starts_on" defaultValue={promotion.starts_on ?? ""} />
            </label>

            <label className="field">
              <span>Fim</span>
              <input className="input" type="date" name="ends_on" defaultValue={promotion.ends_on ?? ""} />
            </label>

            <label className="field">
              <span>Cupom</span>
              <input className="input" name="coupon_code" defaultValue={promotion.coupon_code ?? ""} />
            </label>
          </div>

          <fieldset className="promotion-channels">
            <legend>Canais</legend>
            {[
              ["instagram", "Instagram"],
              ["whatsapp", "WhatsApp"],
              ["loja", "Loja"],
              ["parceiros", "Parceiros"],
            ].map(([value, label]) => (
              <label key={value}>
                <input type="checkbox" name="channels" value={value} defaultChecked={promotion.channels.includes(value)} />
                {label}
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Observações</span>
            <textarea className="input promotion-textarea" name="notes" defaultValue={promotion.notes ?? ""} />
          </label>

          <button className="button gold" type="submit">
            <Save size={16} />
            Salvar configuração
          </button>
        </form>
      </article>

      <article className="panel promotion-ux-step-panel">
        <div className="promotion-ux-step-head">
          <div className="promotion-ux-step-number">2</div>
          <div>
            <span>PRODUTOS</span>
            <h2>Escolha visualmente o que entra</h2>
            <p>Busque, filtre por operação/categoria/estoque e selecione vários de uma vez.</p>
          </div>
        </div>

        <PromotionItemSelector
          operationScope={promotion.operation_scope}
          supplementOptions={supplementOptions}
          fitnessOptions={fitnessOptions}
          action={addPromotionItems}
          promotionId={promotion.id}
          existingSupplementIds={existingSupplementIds}
          existingFitnessIds={existingFitnessIds}
        />
      </article>

      <article className="panel promotion-ux-step-panel">
        <div className="promotion-ux-step-head">
          <div className="promotion-ux-step-number">3</div>
          <div>
            <span>OFERTAS</span>
            <h2>Configure somente os produtos escolhidos</h2>
            <p>Cada item mostra preço atual, custo e a oferta salva.</p>
          </div>
          <BadgePercent size={20} />
        </div>

        {items.length === 0 ? (
          <div className="promotion-ux-empty large">
            <BadgePercent size={26} />
            <strong>Nenhum produto adicionado</strong>
            <span>Use a etapa 2 para montar a campanha.</span>
          </div>
        ) : (
          <div className="promotion-ux-configured-grid">
            {items.map((item) => {
              const finalPrice = effectivePrice(item);
              const margin = finalPrice - item.cost_price;

              return (
                <article className="promotion-ux-configured-card" key={item.id}>
                  <div className="promotion-ux-configured-product">
                    <div className="promotion-ux-configured-image">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.item_label} />
                      ) : (
                        <ImageIcon size={23} />
                      )}
                    </div>
                    <div>
                      <span>{item.operation_scope === "supplements" ? "Suplementos" : "Fitness"}</span>
                      <strong>{item.item_label}</strong>
                      <small>{item.category ?? "Sem categoria"}</small>
                    </div>
                  </div>

                  <div className="promotion-ux-price-summary">
                    <span>Preço atual<b>{formatCurrency(item.current_price)}</b></span>
                    <span>Custo<b>{formatCurrency(item.cost_price)}</b></span>
                    <span>Preço promo<b>{formatCurrency(finalPrice)}</b></span>
                    <span>Margem bruta<b className={margin < 0 ? "danger" : ""}>{formatCurrency(margin)}</b></span>
                  </div>

                  <form action={updatePromotionItem} className="promotion-ux-item-form">
                    <input type="hidden" name="promotion_id" value={promotion.id} />
                    <input type="hidden" name="item_id" value={item.id} />

                    <label>
                      <span>Papel do produto</span>
                      <select className="select" name="item_role" defaultValue={item.item_role}>
                        <option value="discounted">Com desconto</option>
                        <option value="anchor">Chamariz sem desconto</option>
                        <option value="cross_sell">Cross-sell</option>
                      </select>
                    </label>

                    <label>
                      <span>Desconto (%)</span>
                      <input className="input" name="discount_pct" placeholder="0" defaultValue={item.discount_pct ?? ""} />
                    </label>

                    <label>
                      <span>Preço promocional</span>
                      <input className="input" name="promotional_price" placeholder="R$" defaultValue={item.promotional_price ?? ""} />
                    </label>

                    <label>
                      <span>Limite por cliente</span>
                      <input className="input" name="quantity_limit" placeholder="Sem limite" defaultValue={item.quantity_limit ?? ""} />
                    </label>

                    <button className="button ghost" type="submit">Salvar item</button>
                  </form>

                  <form action={removePromotionItem} className="promotion-ux-remove-form">
                    <input type="hidden" name="promotion_id" value={promotion.id} />
                    <input type="hidden" name="item_id" value={item.id} />
                    <button className="button ghost promotion-remove-item" type="submit">
                      <Trash2 size={15} />
                      Remover
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </article>

      <article className="panel promotion-ux-step-panel">
        <div className="promotion-ux-step-head">
          <div className="promotion-ux-step-number">4</div>
          <div>
            <span>PRÉVIA E PUBLICAÇÃO</span>
            <h2>Confira como a campanha está ficando</h2>
            <p>Revise os produtos e só depois altere o status da promoção.</p>
          </div>
          <Eye size={20} />
        </div>

        <div className="promotion-ux-preview">
          <header>
            <div>
              <span className={`promotion-ux-status ${promotion.effective_status}`}>
                {statusLabel[promotion.effective_status]}
              </span>
              <h3>{promotion.name}</h3>
              <p>
                {promotion.starts_on ? formatDateOnly(promotion.starts_on) : "Sem início"}
                {" → "}
                {promotion.ends_on ? formatDateOnly(promotion.ends_on) : "Sem fim"}
              </p>
            </div>

            <Link className="button ghost" href="/promocoes">
              <ExternalLink size={15} />
              Abrir exposição completa
            </Link>
          </header>

          {items.length === 0 ? (
            <div className="promotion-ux-empty">
              <Eye size={24} />
              <strong>A prévia aparecerá após adicionar produtos</strong>
            </div>
          ) : (
            <div className="promotion-ux-preview-grid">
              {items.slice(0, 8).map((item) => {
                const finalPrice = effectivePrice(item);
                return (
                  <div key={item.id}>
                    <div>
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.item_label} />
                      ) : (
                        <ImageIcon size={22} />
                      )}
                    </div>
                    <small>{item.operation_scope === "supplements" ? "Suplementos" : "Fitness"}</small>
                    <strong>{item.item_label}</strong>
                    <span>
                      {finalPrice < item.current_price && <s>{formatCurrency(item.current_price)}</s>}
                      <b>{formatCurrency(finalPrice)}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="promotion-ux-status-area">
          <div>
            <CalendarDays size={18} />
            <div>
              <strong>Status da campanha</strong>
              <span>Rascunho → agendada → ativa → encerrada.</span>
            </div>
          </div>

          <div className="promotion-status-actions">
            {["draft", "scheduled", "active", "ended", "cancelled"].map((status) => (
              <form action={updatePromotionStatus} key={status}>
                <input type="hidden" name="promotion_id" value={promotion.id} />
                <input type="hidden" name="status" value={status} />
                <button className={`button ${promotion.status === status ? "gold" : "ghost"}`} type="submit">
                  {promotion.status === status && <CheckCircle2 size={14} />}
                  {statusLabel[status]}
                </button>
              </form>
            ))}
          </div>
        </div>
      </article>

      <details className="panel promotion-ux-results">
        <summary>
          <div><BarChart3 size={18} /><div><strong>Resultado da campanha</strong><span>Preencha ao encerrar ou revisar a promoção.</span></div></div>
        </summary>

        <form action={savePromotionResults} className="promotion-form">
          <input type="hidden" name="promotion_id" value={promotion.id} />

          <div className="promotion-form-grid">
            <label className="field">
              <span>Receita gerada</span>
              <input className="input" name="result_revenue" defaultValue={promotion.result_revenue ?? ""} />
            </label>
            <label className="field">
              <span>Lucro bruto</span>
              <input className="input" name="result_profit" defaultValue={promotion.result_profit ?? ""} />
            </label>
            <label className="field">
              <span>Unidades vendidas</span>
              <input className="input" name="result_units" defaultValue={promotion.result_units ?? ""} />
            </label>
          </div>

          <label className="field">
            <span>Leitura final</span>
            <textarea className="input promotion-textarea" name="result_notes" defaultValue={promotion.result_notes ?? ""} placeholder="O que funcionou, o que não funcionou e o que repetir..." />
          </label>

          <button className="button ghost" type="submit">Salvar resultado</button>
        </form>
      </details>
    </>
  );
}
