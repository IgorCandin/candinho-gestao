import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  PauseCircle,
  PencilLine,
  PlayCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  getBankAccounts,
  getBankCardsAndInvoices,
  getBankSubscriptions,
} from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";
import {
  createBankSubscription,
  toggleBankSubscription,
  updateBankSubscription,
} from "./actions";

function cycleLabel(value: unknown) {
  const cycle = String(value ?? "monthly");
  if (["annual", "yearly"].includes(cycle)) return "Anual";
  if (cycle === "weekly") return "Semanal";
  if (cycle === "custom") return "Personalizado";
  return "Mensal";
}

function projectionLabel(value: unknown) {
  const mode = String(value ?? "inside_card");
  if (mode === "direct_charge") return "Cobrança direta";
  if (mode === "reference_only") return "Só referência";
  return "Dentro da fatura";
}

function moneyInput(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0
    ? amount.toFixed(2).replace(".", ",")
    : "";
}

function dateInput(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

export default async function BankSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    acao?: string;
    editar?: string;
    salvo?: string;
  }>;
}) {
  const params = await searchParams;
  const [subscriptions, accounts, cardData] = await Promise.all([
    getBankSubscriptions(),
    getBankAccounts(),
    getBankCardsAndInvoices(),
  ]);

  const creating = params.acao === "nova";
  const editing = params.editar
    ? subscriptions.find((item) => String(item.id) === params.editar) ?? null
    : null;
  const showingForm = creating || Boolean(editing);
  const formItem = editing ?? {};
  const formAction = editing ? updateBankSubscription : createBankSubscription;
  const defaultCycle = String(formItem.billing_cycle ?? "monthly") === "annual"
    ? "yearly"
    : String(formItem.billing_cycle ?? "monthly");
  const defaultPaymentMethod = String(formItem.payment_method_type ?? "card");

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Planos e Mensalidades</h1>
          <p>
            Cadastre, altere, pause ou ative recorrências sem precisar recriar o plano.
          </p>
        </div>

        <div className="bank-header-actions">
          <span className="bank-module-badge">
            <CalendarDays size={16} />
            {subscriptions.length} planos
          </span>
          {!showingForm && (
            <Link className="button gold" href="/bank/mensalidades?acao=nova">
              <Plus size={16} />
              Nova mensalidade
            </Link>
          )}
        </div>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>
              {params.salvo === "editada"
                ? "Mensalidade alterada com sucesso."
                : "Mensalidades atualizadas."}
            </strong>
            <span>A projeção anual já considera os dados salvos.</span>
          </div>
        </div>
      )}

      {showingForm && (
        <article className="panel bank-charge-form-panel">
          <div className="panel-head">
            <div>
              <h2>{editing ? "Alterar mensalidade" : "Nova mensalidade"}</h2>
              <p>
                {editing
                  ? "Mude valor, vencimento, forma de pagamento e demais dados do plano."
                  : "Cadastre o plano e informe onde ele é cobrado para evitar duplicidade na projeção."}
              </p>
            </div>
            <Link className="icon-link" href="/bank/mensalidades" aria-label="Fechar">
              <X size={17} />
            </Link>
          </div>

          <form action={formAction}>
            {editing && (
              <input type="hidden" name="subscription_id" value={String(editing.id)} />
            )}

            <div className="panel-body bank-charge-form-grid">
              <label className="field">
                <span>Nome</span>
                <input
                  className="input"
                  name="name"
                  placeholder="Ex.: ChatGPT Plus"
                  defaultValue={String(formItem.name ?? "")}
                  required
                />
              </label>

              <label className="field">
                <span>Fornecedor</span>
                <input
                  className="input"
                  name="provider"
                  placeholder="Ex.: OpenAI"
                  defaultValue={String(formItem.provider ?? "")}
                />
              </label>

              <label className="field">
                <span>Valor</span>
                <input
                  className="input"
                  name="amount"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  defaultValue={moneyInput(formItem.amount)}
                  required
                />
              </label>

              <label className="field">
                <span>Dia da cobrança</span>
                <input
                  className="input"
                  name="billing_day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex.: 15"
                  defaultValue={formItem.billing_day == null ? "" : String(formItem.billing_day)}
                />
              </label>

              {editing && (
                <label className="field">
                  <span>Como vence</span>
                  <select
                    className="input"
                    name="due_mode"
                    defaultValue={String(formItem.due_mode ?? "fixed_day") === "month_only" ? "month_only" : "fixed_day"}
                  >
                    <option value="fixed_day">Dia fixo</option>
                    <option value="month_only">Somente no mês</option>
                  </select>
                </label>
              )}

              <label className="field">
                <span>Ciclo</span>
                <select className="input" name="billing_cycle" defaultValue={defaultCycle}>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>

              <label className="field">
                <span>Forma de pagamento</span>
                <select className="input" name="payment_method_type" defaultValue={defaultPaymentMethod}>
                  <option value="card">Cartão</option>
                  <option value="account">Conta</option>
                  <option value="cash">Dinheiro</option>
                  <option value="other">Outro</option>
                </select>
              </label>

              <label className="field">
                <span>Cartão</span>
                <select className="input" name="card_id" defaultValue={String(formItem.card_id ?? "")}>
                  <option value="">Selecione quando for cartão</option>
                  {cardData.cards.map((card) => (
                    <option key={String(card.id)} value={String(card.id)}>
                      {String(card.name ?? "Cartão")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Conta</span>
                <select className="input" name="account_id" defaultValue={String(formItem.account_id ?? "")}>
                  <option value="">Selecione quando for conta</option>
                  {accounts.map((account) => (
                    <option key={String(account.id)} value={String(account.id)}>
                      {String(account.name ?? "Conta")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Modo na projeção</span>
                <select
                  className="input"
                  name="projection_mode"
                  defaultValue={String(formItem.projection_mode ?? "inside_card")}
                >
                  <option value="inside_card">Dentro da fatura</option>
                  <option value="direct_charge">Cobrança direta</option>
                  <option value="reference_only">Só referência</option>
                </select>
              </label>

              <label className="field">
                <span>Origem</span>
                <input
                  className="input"
                  name="origin"
                  placeholder="Pessoal, Company..."
                  defaultValue={String(formItem.origin ?? "")}
                />
              </label>

              <label className="field">
                <span>Categoria</span>
                <input
                  className="input"
                  name="category"
                  placeholder="Software, streaming..."
                  defaultValue={String(formItem.category ?? "")}
                />
              </label>

              <label className="field">
                <span>Começa em</span>
                <input
                  className="input"
                  name="starts_on"
                  type="date"
                  defaultValue={dateInput(formItem.starts_on)}
                />
              </label>

              <label className="field">
                <span>Termina em</span>
                <input
                  className="input"
                  name="ends_on"
                  type="date"
                  defaultValue={dateInput(formItem.ends_on)}
                />
              </label>

              <label className="field bank-charge-form-wide">
                <span>Observações</span>
                <textarea
                  className="input bank-textarea"
                  name="notes"
                  defaultValue={String(formItem.notes ?? "")}
                />
              </label>

              <label className="field bank-charge-form-wide">
                <span>
                  <input
                    type="checkbox"
                    name="include_in_projection"
                    defaultChecked={editing ? Boolean(formItem.include_in_projection) : true}
                  />{" "}
                  Incluir na projeção financeira
                </span>
              </label>
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/mensalidades">
                Cancelar
              </Link>
              <button className="button gold" type="submit">
                <Save size={16} />
                {editing ? "Salvar alterações" : "Salvar mensalidade"}
              </button>
            </div>
          </form>
        </article>
      )}

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Recorrências cadastradas</h2>
            <p>No celular, cada plano agora fica em um cartão simples de editar.</p>
          </div>
        </div>

        <div className="panel-body">
          {subscriptions.length === 0 ? (
            <div className="empty">
              <strong>Nenhum plano cadastrado</strong>
              Netflix, ChatGPT, Canva e outras recorrências aparecerão aqui.
            </div>
          ) : (
            <div className="bank-income-list">
              {subscriptions.map((item) => {
                const active = Boolean(item.is_active);
                return (
                  <div className="bank-income-list-item" key={String(item.id)}>
                    <div>
                      <strong>{String(item.name ?? "Plano")}</strong>
                      <span>{String(item.provider ?? item.category ?? "Sem fornecedor")}</span>
                    </div>

                    <div>
                      <strong>{formatCurrency(Number(item.amount ?? 0))}</strong>
                      <span>
                        {String(item.due_mode ?? "fixed_day") === "month_only"
                          ? "Sem dia fixo"
                          : `Dia ${String(item.billing_day ?? "—")}`} · {cycleLabel(item.billing_cycle)}
                      </span>
                    </div>

                    <div>
                      <span className={`badge ${active ? "green" : "gray"}`}>
                        {active ? "Ativa" : "Pausada"}
                      </span>
                      <span className="badge gray" style={{ marginLeft: 6 }}>
                        {projectionLabel(item.projection_mode)}
                      </span>
                    </div>

                    <div className="bank-header-actions">
                      <Link
                        className="button ghost compact-button"
                        href={`/bank/mensalidades?editar=${encodeURIComponent(String(item.id))}`}
                      >
                        <PencilLine size={14} />
                        Alterar
                      </Link>

                      <form action={toggleBankSubscription}>
                        <input type="hidden" name="subscription_id" value={String(item.id)} />
                        <input type="hidden" name="active" value={active ? "false" : "true"} />
                        <button className="button ghost compact-button" type="submit">
                          {active ? (
                            <>
                              <PauseCircle size={14} />
                              Pausar
                            </>
                          ) : (
                            <>
                              <PlayCircle size={14} />
                              Ativar
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
