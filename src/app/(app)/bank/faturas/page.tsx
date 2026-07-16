import Link from "next/link";
import { CheckCircle2, ChevronRight, CreditCard, Layers3, Save, X } from "lucide-react";
import { getBankCardsAndInvoices } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly, formatMonthYear } from "@/lib/format";
import { saveBankInvoices } from "./actions";

function currentMonthInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function invoiceDueDate(referenceMonth: string, dueDay: unknown) {
  const day = Number(dueDay ?? 0);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const [year, month] = referenceMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function inputMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2).replace(".", ",");
}

function statusLabel(status: unknown) {
  const value = String(status ?? "planned");
  if (value === "open") return "Aberta";
  if (value === "closed") return "Fechada";
  if (value === "paid") return "Paga";
  if (value === "overdue") return "Vencida";
  if (value === "cancelled") return "Cancelada";
  return "Planejada";
}

export default async function BankInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; modo?: string; cartao?: string; salvo?: string }>;
}) {
  const params = await searchParams;
  const { cards, invoices } = await getBankCardsAndInvoices();
  const updating = params.acao === "atualizar";
  const mode = params.modo === "todas" ? "todas" : "individual";
  const selectedCard = cards.find((card) => String(card.id) === params.cartao) ?? cards[0] ?? null;
  const selectedIndex = selectedCard ? cards.findIndex((card) => String(card.id) === String(selectedCard.id)) : -1;
  const nextCard = mode === "todas" && selectedIndex >= 0 ? cards[selectedIndex + 1] ?? null : null;
  const startMonth = currentMonthInBrazil();
  const months = Array.from({ length: 12 }, (_, index) => addMonths(startMonth, index));
  const invoiceMap = new Map(
    invoices
      .filter((invoice) => String(invoice.card_id) === String(selectedCard?.id ?? ""))
      .map((invoice) => [String(invoice.reference_month), invoice]),
  );

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Faturas</h1>
          <p>Acompanhe seus cartões e informe os valores previstos para os próximos 12 meses.</p>
        </div>
        <div className="bank-header-actions">
          <span className="bank-module-badge"><CreditCard size={16} />{cards.length} cartões</span>
          {!updating && cards.length > 0 && (
            <Link className="button gold" href="/bank/faturas?acao=atualizar">
              <CreditCard size={16} />Atualizar faturas
            </Link>
          )}
        </div>
      </div>

      {params.salvo === "1" && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Faturas salvas com sucesso.</strong>
            <span>{mode === "todas" && selectedCard ? `Próximo cartão carregado: ${String(selectedCard.name ?? "Cartão")}.` : "A projeção e o Dashboard já usam os novos valores."}</span>
          </div>
        </div>
      )}

      {updating && cards.length > 0 && selectedCard && (
        <article className="panel bank-invoice-update-panel">
          <div className="panel-head">
            <div>
              <h2>Atualizar faturas</h2>
              <p>Campo vazio significa não informado. Digitar R$ 0,00 registra explicitamente uma fatura zerada.</p>
            </div>
            <Link className="icon-link" href="/bank/faturas" aria-label="Fechar atualização"><X size={17} /></Link>
          </div>

          <div className="bank-invoice-mode-row">
            <div className="bank-invoice-mode-tabs">
              <Link className={mode === "individual" ? "active" : ""} href={`/bank/faturas?acao=atualizar&modo=individual&cartao=${encodeURIComponent(String(selectedCard.id))}`}>
                <CreditCard size={15} />Individualmente
              </Link>
              <Link className={mode === "todas" ? "active" : ""} href={`/bank/faturas?acao=atualizar&modo=todas&cartao=${encodeURIComponent(String(cards[0]?.id ?? ""))}`}>
                <Layers3 size={15} />Atualizar todas
              </Link>
            </div>
            {mode === "todas" && (
              <span className="bank-invoice-progress">Cartão {selectedIndex + 1} de {cards.length}</span>
            )}
          </div>

          <form className="bank-invoice-selector" method="get">
            <input type="hidden" name="acao" value="atualizar" />
            <input type="hidden" name="modo" value={mode} />
            <label className="field">
              <span>Cartão selecionado</span>
              <select className="input" name="cartao" defaultValue={String(selectedCard.id)}>
                {cards.map((card) => (
                  <option key={String(card.id)} value={String(card.id)}>{String(card.name ?? "Cartão")}</option>
                ))}
              </select>
            </label>
            <button className="button ghost" type="submit">Abrir cartão</button>
          </form>

          <form action={saveBankInvoices}>
            <input type="hidden" name="card_id" value={String(selectedCard.id)} />
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="next_card_id" value={String(nextCard?.id ?? "")} />

            <div className="bank-invoice-card-summary">
              <div>
                <span>Cartão</span>
                <strong>{String(selectedCard.name ?? "Cartão")}</strong>
              </div>
              <div>
                <span>Titular</span>
                <strong>{String(selectedCard.holder_name ?? "Não informado")}</strong>
              </div>
              <div>
                <span>Vencimento</span>
                <strong>{selectedCard.due_day ? `Dia ${String(selectedCard.due_day)}` : "Não informado"}</strong>
              </div>
            </div>

            <div className="bank-invoice-month-list">
              {months.map((month) => {
                const invoice = invoiceMap.get(month);
                const dueDate = invoice?.due_date ? String(invoice.due_date) : invoiceDueDate(month, selectedCard.due_day);
                const status = invoice?.status ?? "planned";
                const paid = String(status) === "paid";
                return (
                  <div className="bank-invoice-month-row" key={month}>
                    <input type="hidden" name="reference_month" value={month} />
                    <div className="bank-invoice-month-title">
                      <strong>{formatMonthYear(month)}</strong>
                      <span>{dueDate ? `Vence em ${formatDateOnly(dueDate)}` : "Vencimento não configurado"}</span>
                    </div>
                    <label className="field">
                      <span>Valor da fatura</span>
                      <div className="bank-money-input">
                        <b>R$</b>
                        <input
                          className="input"
                          type="text"
                          inputMode="decimal"
                          name={`amount:${month}`}
                          defaultValue={inputMoney(invoice?.amount)}
                          placeholder="Não informado"
                          readOnly={paid}
                        />
                      </div>
                    </label>
                    <div className="bank-invoice-month-status">
                      <span className={`badge ${paid ? "green" : "gray"}`}>{statusLabel(status)}</span>
                      {paid && <small>Fatura paga não é apagada por campo vazio.</small>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bank-balance-update-actions">
              <Link className="button ghost" href="/bank/faturas">Cancelar</Link>
              <button className="button gold" type="submit">
                {mode === "todas" ? (
                  <>{nextCard ? <ChevronRight size={16} /> : <Save size={16} />}{nextCard ? "Salvar e próxima fatura" : "Salvar e finalizar"}</>
                ) : (
                  <><Save size={16} />Salvar faturas</>
                )}
              </button>
            </div>
          </form>
        </article>
      )}

      {updating && cards.length === 0 && (
        <article className="panel">
          <div className="empty"><strong>Nenhum cartão cadastrado</strong>Cadastre seus cartões antes de informar as faturas dos próximos meses.</div>
        </article>
      )}

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cartão</th><th>Mês</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={String(invoice.id)}>
                  <td><div className="cell-main">{String(invoice.card_name ?? "Cartão")}</div><div className="cell-sub">{String(invoice.holder_name ?? invoice.institution ?? "—")}</div></td>
                  <td>{formatMonthYear(String(invoice.reference_month ?? ""))}</td>
                  <td>{invoice.due_date ? formatDateOnly(String(invoice.due_date)) : "—"}</td>
                  <td><span className="badge gray">{statusLabel(invoice.status)}</span></td>
                  <td className="amount">{invoice.amount === null ? "Não informado" : formatCurrency(Number(invoice.amount ?? 0))}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={5}><div className="empty"><strong>Nenhuma fatura informada</strong>Use Atualizar faturas para preencher os próximos 12 meses de cada cartão.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
