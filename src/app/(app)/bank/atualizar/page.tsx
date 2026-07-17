import Link from "next/link";
import { CheckCircle2, RefreshCcw, Save, WalletCards } from "lucide-react";
import { getBankAccounts, getBankCardsAndInvoices } from "@/lib/bank-data";
import { formatDateOnly, formatMonthYear } from "@/lib/format";
import { saveBankQuickUpdate } from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function currentMonthInBrazil() {
  return todayInBrazil().slice(0, 7) + "-01";
}
function inputMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2).replace(".", ",");
}

export default async function BankQuickUpdatePage({ searchParams }: { searchParams: Promise<{ salvo?: string; data?: string; mes?: string }> }) {
  const params = await searchParams;
  const [accounts, cardData] = await Promise.all([getBankAccounts(), getBankCardsAndInvoices()]);
  const balanceDate = params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : todayInBrazil();
  const referenceMonth = params.mes && /^\d{4}-\d{2}-01$/.test(params.mes) ? params.mes : currentMonthInBrazil();
  const invoiceMap = new Map(cardData.invoices.filter((invoice) => String(invoice.reference_month) === referenceMonth).map((invoice) => [String(invoice.card_id), invoice]));

  return (
    <section>
      <div className="page-header bank-page-header">
        <div><div className="eyebrow">Candinho Bank</div><h1>Central de Atualização</h1><p>Atualize saldos e faturas em uma única tela. O objetivo é manter a Bank confiável gastando poucos minutos.</p></div>
        <span className="bank-module-badge"><RefreshCcw size={16} />Rotina rápida</span>
      </div>

      {params.salvo && <div className="bank-success-banner"><CheckCircle2 size={18}/><div><strong>Bank atualizada com sucesso.</strong><span>Saldos de {formatDateOnly(balanceDate)} e faturas de {formatMonthYear(referenceMonth)} já alimentam o Dashboard e a Visão Anual.</span></div></div>}

      <form action={saveBankQuickUpdate} className="bank-manual-update-form">
        <article className="panel bank-manual-update-settings">
          <div className="panel-head"><div><h2>1. Período da atualização</h2><p>Você pode atualizar só os campos que mudaram. Campo vazio preserva o que já existe.</p></div></div>
          <div className="panel-body bank-charge-form-grid">
            <label className="field"><span>Data dos saldos</span><input className="input" type="date" name="balance_date" defaultValue={balanceDate} required /></label>
            <label className="field"><span>Mês das faturas</span><input className="input" type="month" defaultValue={referenceMonth.slice(0,7)} readOnly /><input type="hidden" name="reference_month" value={referenceMonth}/><small>Para alterar outro mês, use a tela Faturas. Aqui a rotina é focada no mês atual.</small></label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>2. Saldos das contas</h2><p>Digite quanto existe agora em cada conta ou carteira.</p></div><Link className="bank-panel-link" href="/bank/contas">Gerenciar contas</Link></div>
          <div className="panel-body bank-manual-update-list">
            {accounts.map((account) => {
              const id=String(account.id); return <div className="bank-manual-update-row" key={id}>
                <input type="hidden" name="account_id" value={id}/>
                <div><strong>{String(account.name ?? "Conta")}</strong><span>{String(account.origin ?? account.account_type ?? "Conta")}</span></div>
                <label className="field"><span>Saldo atual</span><div className="bank-money-input"><b>R$</b><input className="input" name={`balance:${id}`} inputMode="decimal" defaultValue={inputMoney(account.balance)} /></div></label>
                <small>{account.balance_date ? `Último registro: ${formatDateOnly(String(account.balance_date))}` : "Nunca atualizado"}</small>
              </div>;
            })}
            {accounts.length===0 && <div className="bank-empty-state">Nenhuma conta cadastrada.</div>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>3. Faturas do mês</h2><p>Informe o valor atual ou previsto de cada cartão. Escolha se o valor já inclui as mensalidades recorrentes.</p></div><Link className="bank-panel-link" href="/bank/faturas">Abrir faturas</Link></div>
          <div className="panel-body bank-manual-update-list">
            {cardData.cards.map((card) => {
              const id=String(card.id); const invoice=invoiceMap.get(id); const mode=invoice?.includes_recurring===false ? "installments" : "total";
              return <div className="bank-manual-update-row bank-manual-card-row" key={id}>
                <input type="hidden" name="card_id" value={id}/>
                <div><strong>{String(card.name ?? "Cartão")}</strong><span>{String(card.holder_name ?? card.institution ?? "Cartão")}</span></div>
                <label className="field"><span>Fatura</span><div className="bank-money-input"><b>R$</b><input className="input" name={`invoice:${id}`} inputMode="decimal" defaultValue={inputMoney(invoice?.amount)} placeholder="Não alterar"/></div></label>
                <label className="field"><span>O valor informado representa</span><select className="input" name={`invoice_mode:${id}`} defaultValue={mode}><option value="total">Total da fatura · já inclui recorrências</option><option value="installments">Parcelas/compras conhecidas · somar recorrências</option></select></label>
              </div>;
            })}
            {cardData.cards.length===0 && <div className="bank-empty-state">Nenhum cartão cadastrado.</div>}
          </div>
        </article>

        <div className="bank-manual-update-submit"><div><WalletCards size={20}/><span><strong>Uma atualização, várias telas.</strong> O Dashboard, patrimônio e projeções são recalculados automaticamente.</span></div><button className="button gold" type="submit"><Save size={16}/>Salvar atualização completa</button></div>
      </form>
    </section>
  );
}
