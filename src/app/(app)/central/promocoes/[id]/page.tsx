import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Boxes,
  CalendarDays,
  Save,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PromotionItemSelector } from "@/components/promotion-item-selector";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getPromotionDetail } from "@/lib/promotion-data";
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

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Promoções"
        title={promotion.name}
        description={`${operationLabel[promotion.operation_scope]} · ${
          statusLabel[promotion.effective_status]
        } · ${promotion.item_count} item(ns)`}
        action={
          <Link className="button ghost" href="/central/promocoes">
            <ArrowLeft size={16} />
            Voltar às promoções
          </Link>
        }
      />

      <section className="promotion-detail-status">
        <article>
          <span>Status atual</span>
          <strong>{statusLabel[promotion.effective_status]}</strong>
        </article>

        <article>
          <span>Período</span>
          <strong>
            {promotion.starts_on ? formatDateOnly(promotion.starts_on) : "—"}
            {" → "}
            {promotion.ends_on ? formatDateOnly(promotion.ends_on) : "—"}
          </strong>
        </article>

        <article>
          <span>Produtos</span>
          <strong>
            {promotion.supplement_item_count} Suplementos ·{" "}
            {promotion.fitness_item_count} Fitness
          </strong>
        </article>
      </section>

      <article className="panel promotion-status-panel">
        <div className="panel-head">
          <div>
            <h2>Fluxo da promoção</h2>
            <p>Rascunho → agendada → ativa → encerrada.</p>
          </div>
          <CalendarDays size={20} />
        </div>

        <div className="promotion-status-actions">
          {["draft", "scheduled", "active", "ended", "cancelled"].map((status) => (
            <form action={updatePromotionStatus} key={status}>
              <input type="hidden" name="promotion_id" value={promotion.id} />
              <input type="hidden" name="status" value={status} />
              <button
                className={`button ${
                  promotion.status === status ? "gold" : "ghost"
                }`}
                type="submit"
              >
                {statusLabel[status]}
              </button>
            </form>
          ))}
        </div>
      </article>

      <section className="promotion-detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Configuração</h2>
              <p>Período, tipo, desconto e canais da campanha.</p>
            </div>
            <BadgePercent size={20} />
          </div>

          <form action={updatePromotionBasics} className="promotion-form">
            <input type="hidden" name="promotion_id" value={promotion.id} />

            <label className="field">
              <span>Nome</span>
              <input className="input" name="name" defaultValue={promotion.name} required />
            </label>

            <div className="promotion-form-grid">
              <label className="field">
                <span>Operação</span>
                <select
                  className="select"
                  name="operation_scope"
                  defaultValue={promotion.operation_scope}
                >
                  <option value="both">Suplementos + Fitness</option>
                  <option value="supplements">Suplementos</option>
                  <option value="fitness">Fitness</option>
                </select>
              </label>

              <label className="field">
                <span>Objetivo</span>
                <select
                  className="select"
                  name="objective"
                  defaultValue={promotion.objective}
                >
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
                <select
                  className="select"
                  name="promotion_type"
                  defaultValue={promotion.promotion_type}
                >
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
                  defaultValue={promotion.default_discount_pct}
                />
              </label>

              <label className="field">
                <span>Início</span>
                <input
                  className="input"
                  type="date"
                  name="starts_on"
                  defaultValue={promotion.starts_on ?? ""}
                />
              </label>

              <label className="field">
                <span>Fim</span>
                <input
                  className="input"
                  type="date"
                  name="ends_on"
                  defaultValue={promotion.ends_on ?? ""}
                />
              </label>

              <label className="field">
                <span>Cupom</span>
                <input
                  className="input"
                  name="coupon_code"
                  defaultValue={promotion.coupon_code ?? ""}
                />
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
                  <input
                    type="checkbox"
                    name="channels"
                    value={value}
                    defaultChecked={promotion.channels.includes(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span>Observações</span>
              <textarea
                className="input promotion-textarea"
                name="notes"
                defaultValue={promotion.notes ?? ""}
              />
            </label>

            <button className="button gold" type="submit">
              <Save size={16} />
              Salvar configuração
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Resultado</h2>
              <p>Feche a campanha registrando o resultado consolidado.</p>
            </div>
            <BarChart3 size={20} />
          </div>

          <form action={savePromotionResults} className="promotion-form">
            <input type="hidden" name="promotion_id" value={promotion.id} />

            <label className="field">
              <span>Receita gerada</span>
              <input
                className="input"
                name="result_revenue"
                defaultValue={promotion.result_revenue ?? ""}
              />
            </label>

            <label className="field">
              <span>Lucro bruto</span>
              <input
                className="input"
                name="result_profit"
                defaultValue={promotion.result_profit ?? ""}
              />
            </label>

            <label className="field">
              <span>Unidades vendidas</span>
              <input
                className="input"
                name="result_units"
                defaultValue={promotion.result_units ?? ""}
              />
            </label>

            <label className="field">
              <span>Leitura final</span>
              <textarea
                className="input promotion-textarea"
                name="result_notes"
                defaultValue={promotion.result_notes ?? ""}
                placeholder="O que funcionou, o que não funcionou e o que repetir..."
              />
            </label>

            {promotion.result_revenue != null && (
              <div className="promotion-result-snapshot">
                <span>
                  Receita
                  <strong>{formatCurrency(promotion.result_revenue)}</strong>
                </span>
                <span>
                  Lucro
                  <strong>{formatCurrency(promotion.result_profit ?? 0)}</strong>
                </span>
                <span>
                  Unidades
                  <strong>{promotion.result_units ?? 0}</strong>
                </span>
              </div>
            )}

            <button className="button ghost" type="submit">
              Salvar resultado
            </button>
          </form>
        </article>
      </section>

      <article className="panel promotion-products-panel">
        <div className="panel-head">
          <div>
            <h2>Produtos da promoção</h2>
            <p>Adicione um produto ou selecione vários de uma vez.</p>
          </div>
          <Boxes size={20} />
        </div>

        <PromotionItemSelector
          operationScope={promotion.operation_scope}
          supplementOptions={supplementOptions}
          fitnessOptions={fitnessOptions}
          action={addPromotionItems}
          promotionId={promotion.id}
        />
      </article>

      <article className="panel promotion-items-panel">
        <div className="panel-head">
          <div>
            <h2>Itens configurados</h2>
            <p>Defina desconto, preço final, papel e limite por item.</p>
          </div>
          <BadgePercent size={20} />
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <Boxes size={26} />
            <strong>Nenhum produto adicionado</strong>
            Use o seletor acima para montar a promoção.
          </div>
        ) : (
          <div className="promotion-items-list">
            {items.map((item) => (
              <article className="promotion-item-row" key={item.id}>
                <div className="promotion-item-copy">
                  <span className="badge blue">
                    {item.operation_scope === "supplements"
                      ? "Suplementos"
                      : "Fitness"}
                  </span>
                  <strong>{item.item_label}</strong>
                  <small>
                    Preço atual {formatCurrency(item.current_price)} · custo{" "}
                    {formatCurrency(item.cost_price)}
                  </small>
                </div>

                <form action={updatePromotionItem} className="promotion-item-form">
                  <input type="hidden" name="promotion_id" value={promotion.id} />
                  <input type="hidden" name="item_id" value={item.id} />

                  <select
                    className="select"
                    name="item_role"
                    defaultValue={item.item_role}
                  >
                    <option value="discounted">Com desconto</option>
                    <option value="anchor">Chamariz sem desconto</option>
                    <option value="cross_sell">Cross-sell</option>
                  </select>

                  <input
                    className="input"
                    name="discount_pct"
                    placeholder="%"
                    defaultValue={item.discount_pct ?? ""}
                  />

                  <input
                    className="input"
                    name="promotional_price"
                    placeholder="Preço promo"
                    defaultValue={item.promotional_price ?? ""}
                  />

                  <input
                    className="input"
                    name="quantity_limit"
                    placeholder="Limite"
                    defaultValue={item.quantity_limit ?? ""}
                  />

                  <button className="button ghost compact-button" type="submit">
                    Salvar
                  </button>
                </form>

                <form action={removePromotionItem}>
                  <input type="hidden" name="promotion_id" value={promotion.id} />
                  <input type="hidden" name="item_id" value={item.id} />
                  <button
                    className="icon-link promotion-remove-item"
                    type="submit"
                    title="Remover da promoção"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
