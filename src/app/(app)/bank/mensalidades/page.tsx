import Link from "next/link";
import { CalendarDays, CheckCircle2, PauseCircle, PlayCircle, Plus, Save, X } from "lucide-react";
import { getBankAccounts, getBankCardsAndInvoices, getBankSubscriptions } from "@/lib/bank-data";
import { formatCurrency } from "@/lib/format";
import { createBankSubscription, toggleBankSubscription } from "./actions";

function cycleLabel(value: unknown) {
  const cycle = String(value ?? "monthly");
  if (cycle === "annual") return "Anual";
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

export default async function BankSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; salvo?: string }>;
}) {
  const params = await searchParams;
  const [subscriptions, accounts, cardData] = await Promise.all([
    getBankSubscriptions(),
    getBankAccounts(),
    getBankCardsAndInvoices(),
  ]);
  const creating = params.acao === "nova";

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Planos e Mensalidades</h1>
          <p>Assinaturas recorrentes e a forma como cada uma participa da sua projeção.</p>
        </div>
        <div className="bank-header-actions">
          <span className="bank-module-badge"><CalendarDays size={16} />{subscriptions.length} planos</span>
          {!creating && <Link className="button gold" href="/bank/mensalidades?acao=nova"><Plus size={16} />Nova mensalidade</Link>}
        </div>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div><strong>Mensalidades atualizadas.</strong><span>A projeção anual já considera a alteração salva.</span></div>
        </div>
      )}

      {creating && (
        <article className="panel bank-charge-form-panel">
          <div className="panel-head">
            <div><h2>Nova mensalidade</h2><p>Cadastre o plano e informe onde ele é cobrado para evitar duplicidade na projeção.</p></div>
            <Link className="icon-link" href="/bank/mensalidades" aria-label="Fechar"><X size={17} /></Link>
          </div>
          <form action={createBankSubscription}>
            <div className="panel-body bank-charge-form-grid">
              <label className="field"><span>Nome</span><input className="input" name="name" placeholder="Ex.: ChatGPT Plus" required /></label>
              <label className="field"><span>Fornecedor</span><input className="input" name="provider" placeholder="Ex.: OpenAI" /></label>
              <label className="field"><span>Valor</span><input className="input" name="amount" inputMode="decimal" placeholder="R$ 0,00" required /></label>
              <label className="field"><span>Dia da cobrança</span><input className="input" name="billing_day" type="number" min="1" max="31" placeholder="Ex.: 15" /></label>
              <label className="field"><span>Ciclo</span><select className="input" name="billing_cycle" defaultValue="monthly"><option value="monthly">Mensal</option><option value="annual">Anual</option><option value="weekly">Semanal</option><option value="custom">Personalizado</option></select></label>
              <label className="field"><span>Forma de pagamento</span><select className="input" name="payment_method_type" defaultValue="card"><option value="card">Cartão</option><option value="account">Conta</option><option value="cash">Dinheiro</option><option value="other">Outro</option></select></label>
              <label className="field"><span>Cartão</span><select className="input" name="card_id" defaultValue=""><option value="">Selecione quando for cartão</option>{cardData.cards.map((card) => <option key={String(card.id)} value={String(card.id)}>{String(card.name ?? "Cartão")}</option>)}</select></label>
              <label className="field"><span>Conta</span><select className="input" name="account_id" defaultValue=""><option value="">Selecione quando for conta</option>{accounts.map((account) => <option key={String(account.id)} value={String(account.id)}>{String(account.name ?? "Conta")}</option>)}</select></label>
              <label className="field"><span>Modo na projeção</span><select className="input" name="projection_mode" defaultValue="inside_card"><option value="inside_card">Dentro da fatura</option><option value="direct_charge">Cobrança direta</option><option value="reference_only">Só referência</option></select></label>
              <label className="field"><span>Origem</span><input className="input" name="origin" placeholder="Pessoal, Company..." /></label>
              <label className="field"><span>Categoria</span><input className="input" name="category" placeholder="Software, streaming..." /></label>
              <label className="field"><span>Começa em</span><input className="input" name="starts_on" type="date" /></label>
              <label className="field"><span>Termina em</span><input className="input" name="ends_on" type="date" /></label>
              <label className="field bank-charge-form-wide"><span>Observações</span><textarea className="input bank-textarea" name="notes" /></label>
              <label className="field bank-charge-form-wide"><span><input type="checkbox" name="include_in_projection" defaultChecked /> Incluir na projeção financeira</span></label>
            </div>
            <div className="bank-balance-update-actions"><Link className="button ghost" href="/bank/mensalidades">Cancelar</Link><button className="button gold" type="submit"><Save size={16} />Salvar mensalidade</button></div>
          </form>
        </article>
      )}

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plano</th><th>Cobrança</th><th>Pagamento</th><th>Projeção</th><th>Status</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {subscriptions.map((item) => {
                const active = Boolean(item.is_active);
                return (
                  <tr key={String(item.id)}>
                    <td><div className="cell-main">{String(item.name ?? "Plano")}</div><div className="cell-sub">{String(item.provider ?? item.category ?? "—")}</div></td>
                    <td>Dia {String(item.billing_day ?? "—")} · {cycleLabel(item.billing_cycle)}</td>
                    <td>{String(item.payment_source_name ?? item.payment_method_type ?? "—")}</td>
                    <td><span className="badge gray">{projectionLabel(item.projection_mode)}</span></td>
                    <td><span className={`badge ${active ? "green" : "gray"}`}>{active ? "Ativa" : "Pausada"}</span></td>
                    <td className="amount">{formatCurrency(Number(item.amount ?? 0))}</td>
                    <td>
                      <form action={toggleBankSubscription}>
                        <input type="hidden" name="subscription_id" value={String(item.id)} />
                        <input type="hidden" name="active" value={active ? "false" : "true"} />
                        <button className="button ghost" type="submit">{active ? <><PauseCircle size={14} />Pausar</> : <><PlayCircle size={14} />Ativar</>}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && <tr><td colSpan={7}><div className="empty"><strong>Nenhum plano cadastrado</strong>Netflix, ChatGPT, Canva e outras recorrências aparecerão aqui.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
