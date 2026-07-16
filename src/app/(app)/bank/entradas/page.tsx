import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Save,
  X,
} from "lucide-react";
import { getBankAccounts, getBankIncomeSources, getBankReceivables } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  createBankIncomeSource,
  createBankReceivable,
  receiveBankReceivable,
  toggleBankIncomeSource,
} from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function frequencyLabel(value: unknown) {
  const frequency = String(value ?? "monthly");
  if (frequency === "annual") return "Anual";
  if (frequency === "weekly") return "Semanal";
  if (frequency === "custom") return "Personalizada";
  return "Mensal";
}

function receivableStatusLabel(value: unknown) {
  const status = String(value ?? "pending");
  if (status === "received") return "Recebido";
  if (status === "partial") return "Parcial";
  if (status === "overdue") return "Vencido";
  if (status === "cancelled") return "Cancelado";
  return "Pendente";
}

function receivableStatusClass(value: unknown) {
  const status = String(value ?? "pending");
  if (status === "received") return "green";
  if (status === "overdue") return "red";
  if (status === "partial") return "orange";
  return "gray";
}

export default async function BankIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; salvo?: string; receber?: string }>;
}) {
  const params = await searchParams;
  const [incomeSources, receivables, accounts] = await Promise.all([
    getBankIncomeSources(),
    getBankReceivables(),
    getBankAccounts(),
  ]);

  const creatingSource = params.acao === "nova-prevista";
  const creatingReceivable = params.acao === "nova-receber";
  const selectedReceivable = params.receber
    ? receivables.find((item) => String(item.id) === params.receber)
    : null;
  const today = todayInBrazil();

  const pendingReceivables = receivables.filter((item) => !["received", "cancelled"].includes(String(item.effective_status ?? item.status ?? "pending")));
  const totalPending = pendingReceivables.reduce((sum, item) => sum + Number(item.remaining_amount ?? 0), 0);
  const activeSources = incomeSources.filter((item) => Boolean(item.is_active));
  const recurringTotal = activeSources
    .filter((item) => String(item.frequency ?? "monthly") === "monthly" && Boolean(item.include_in_projection))
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Entradas e Contas a Receber</h1>
          <p>Cadastre receitas recorrentes para projeção e valores pontuais que realmente precisam cair.</p>
        </div>
        <div className="bank-header-actions">
          <Link className="button ghost" href="/bank/entradas?acao=nova-prevista"><CalendarDays size={16} />Nova entrada prevista</Link>
          <Link className="button gold" href="/bank/entradas?acao=nova-receber"><Plus size={16} />Nova conta a receber</Link>
        </div>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>
              {params.salvo === "recebido"
                ? "Recebimento registrado com sucesso."
                : params.salvo.startsWith("entrada-")
                  ? "Entrada prevista atualizada com sucesso."
                  : "Conta a receber cadastrada com sucesso."}
            </strong>
            <span>Dashboard e Visão Anual já foram recalculados com os dados atuais.</span>
          </div>
        </div>
      )}

      <div className="grid stats-grid bank-stats-grid bank-income-stats">
        <article className="stat-card">
          <div className="stat-head"><span>A receber pendente</span><span className="stat-icon"><CircleDollarSign size={17} /></span></div>
          <div className="stat-value">{formatCurrency(totalPending)}</div>
          <div className="stat-note">Valores pontuais ainda não recebidos.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Entradas mensais previstas</span><span className="stat-icon"><CalendarDays size={17} /></span></div>
          <div className="stat-value">{formatCurrency(recurringTotal)}</div>
          <div className="stat-note">Estimativa das fontes mensais ativas incluídas na projeção.</div>
        </article>
      </div>

      {creatingSource && (
        <article className="panel bank-income-form-panel">
          <div className="panel-head">
            <div><h2>Nova entrada prevista</h2><p>Use para salário, renda fixa, retirada ou outra receita que tende a se repetir.</p></div>
            <Link className="icon-link" href="/bank/entradas" aria-label="Fechar"><X size={17} /></Link>
          </div>
          <form action={createBankIncomeSource}>
            <div className="bank-income-form-grid">
              <label className="field bank-income-form-wide"><span>Nome da entrada</span><input className="input" name="name" placeholder="Ex.: Salário Igor" required /></label>
              <label className="field"><span>Quem paga</span><input className="input" name="payer_name" placeholder="Ex.: Centrão" /></label>
              <label className="field"><span>Valor previsto</span><div className="bank-money-input"><b>R$</b><input className="input" name="amount" inputMode="decimal" placeholder="0,00" required /></div></label>
              <label className="field"><span>Frequência</span><select className="select" name="frequency" defaultValue="monthly"><option value="monthly">Mensal</option><option value="annual">Anual</option><option value="weekly">Semanal</option><option value="custom">Personalizada</option></select></label>
              <label className="field"><span>Dia esperado</span><input className="input" name="expected_day" type="number" min="1" max="31" placeholder="Ex.: 5" /></label>
              <label className="field"><span>Início</span><input className="input" name="starts_on" type="date" defaultValue={today} /></label>
              <label className="field"><span>Fim (opcional)</span><input className="input" name="ends_on" type="date" /></label>
              <label className="field"><span>Categoria</span><input className="input" name="category" placeholder="Ex.: Salário" /></label>
              <label className="field"><span>Origem</span><input className="input" name="origin" placeholder="Ex.: Pessoal" /></label>
              <label className="bank-check-option"><input type="checkbox" name="is_variable" /><span><strong>Valor variável</strong><small>O valor pode mudar de um mês para outro.</small></span></label>
              <label className="bank-check-option"><input type="checkbox" name="include_in_projection" defaultChecked /><span><strong>Incluir na projeção</strong><small>Considerar esta entrada nos próximos meses.</small></span></label>
              <label className="field bank-income-form-wide"><span>Observações</span><textarea className="input bank-textarea" name="notes" placeholder="Detalhes desta fonte de renda..." /></label>
            </div>
            <div className="bank-balance-update-actions"><Link className="button ghost" href="/bank/entradas">Cancelar</Link><button className="button gold" type="submit"><Save size={16} />Salvar entrada prevista</button></div>
          </form>
        </article>
      )}

      {creatingReceivable && (
        <article className="panel bank-income-form-panel">
          <div className="panel-head">
            <div><h2>Nova conta a receber</h2><p>Registre um valor específico que precisa entrar em uma data determinada.</p></div>
            <Link className="icon-link" href="/bank/entradas" aria-label="Fechar"><X size={17} /></Link>
          </div>
          <form action={createBankReceivable}>
            <div className="bank-income-form-grid">
              <label className="field bank-income-form-wide"><span>Nome</span><input className="input" name="title" placeholder="Ex.: Venda parcelada João" required /></label>
              <label className="field"><span>Quem vai pagar</span><input className="input" name="payer_name" placeholder="Ex.: João" /></label>
              <label className="field"><span>Valor a receber</span><div className="bank-money-input"><b>R$</b><input className="input" name="amount" inputMode="decimal" placeholder="0,00" required /></div></label>
              <label className="field"><span>Data prevista</span><input className="input" name="due_date" type="date" defaultValue={today} required /></label>
              <label className="field"><span>Categoria</span><input className="input" name="category" placeholder="Ex.: Venda, Extra" /></label>
              <label className="field"><span>Origem</span><input className="input" name="origin" placeholder="Ex.: Pessoal, Candinho Suplementos" /></label>
              <label className="field bank-income-form-wide"><span>Vincular a entrada prevista (opcional)</span><select className="select" name="income_source_id" defaultValue=""><option value="">Não vincular</option>{activeSources.map((source) => <option key={String(source.id)} value={String(source.id)}>{String(source.name ?? "Entrada")} — {formatCurrency(Number(source.amount ?? 0))}</option>)}</select><small>Ao vincular, a projeção evita somar a entrada recorrente e esta conta a receber duas vezes no mesmo mês.</small></label>
              <label className="field bank-income-form-wide"><span>Descrição</span><input className="input" name="description" placeholder="Do que se trata este recebimento?" /></label>
              <label className="field bank-income-form-wide"><span>Observações</span><textarea className="input bank-textarea" name="notes" /></label>
            </div>
            <div className="bank-balance-update-actions"><Link className="button ghost" href="/bank/entradas">Cancelar</Link><button className="button gold" type="submit"><Save size={16} />Salvar conta a receber</button></div>
          </form>
        </article>
      )}

      {selectedReceivable && (
        <article className="panel bank-income-form-panel">
          <div className="panel-head">
            <div><h2>Registrar recebimento</h2><p>Pode receber o valor total ou somente uma parte.</p></div>
            <Link className="icon-link" href="/bank/entradas" aria-label="Fechar"><X size={17} /></Link>
          </div>
          <div className="bank-charge-payment-summary">
            <div><span>Conta a receber</span><strong>{String(selectedReceivable.title ?? "Recebimento")}</strong></div>
            <div><span>Saldo restante</span><strong>{formatCurrency(Number(selectedReceivable.remaining_amount ?? 0))}</strong></div>
            <div><span>Data prevista</span><strong>{formatDateOnly(String(selectedReceivable.due_date ?? ""))}</strong></div>
          </div>
          <form action={receiveBankReceivable}>
            <input type="hidden" name="receivable_id" value={String(selectedReceivable.id)} />
            <div className="bank-income-form-grid">
              <label className="field"><span>Valor recebido</span><div className="bank-money-input"><b>R$</b><input className="input" name="amount" inputMode="decimal" placeholder="Vazio = receber tudo" /></div></label>
              <label className="field"><span>Data do recebimento</span><input className="input" name="received_on" type="date" defaultValue={today} required /></label>
              <label className="field bank-income-form-wide"><span>Conta onde entrou</span><select className="select" name="receiving_account_id" defaultValue=""><option value="">Não informar</option>{accounts.map((account) => <option key={String(account.id)} value={String(account.id)}>{String(account.name ?? "Conta")}</option>)}</select></label>
            </div>
            <div className="bank-balance-update-actions"><Link className="button ghost" href="/bank/entradas">Cancelar</Link><button className="button gold" type="submit"><CheckCircle2 size={16} />Registrar recebimento</button></div>
          </form>
        </article>
      )}

      <div className="grid bank-dashboard-grid bank-income-sections">
        <article className="panel">
          <div className="panel-head"><div><h2>Contas a receber</h2><p>Valores pontuais previstos e histórico dos recebimentos.</p></div><span className="bank-module-badge"><CircleDollarSign size={15} />{receivables.length}</span></div>
          <div className="panel-body">
            {receivables.length === 0 ? <div className="bank-empty-state">Nenhuma conta a receber cadastrada.</div> : (
              <div className="bank-income-list">
                {receivables.map((item) => {
                  const effective = String(item.effective_status ?? item.status ?? "pending");
                  const pending = !["received", "cancelled"].includes(effective);
                  return (
                    <div className="bank-income-list-item" key={String(item.id)}>
                      <div><strong>{String(item.title ?? "Recebimento")}</strong><span>{String(item.payer_name ?? item.origin ?? "Sem pagador informado")}</span></div>
                      <div><strong>{formatCurrency(Number(item.remaining_amount ?? 0))}</strong><span>{formatDateOnly(String(item.due_date ?? ""))}</span></div>
                      <span className={`badge ${receivableStatusClass(effective)}`}>{receivableStatusLabel(effective)}</span>
                      {pending ? <Link className="button ghost bank-income-action" href={`/bank/entradas?receber=${encodeURIComponent(String(item.id))}`}>Receber</Link> : <span className="bank-charge-action-done"><CheckCircle2 size={14} />Concluído</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Entradas previstas</h2><p>Fontes recorrentes usadas para estimar os próximos meses.</p></div><span className="bank-module-badge"><CalendarDays size={15} />{activeSources.length} ativas</span></div>
          <div className="panel-body">
            {incomeSources.length === 0 ? <div className="bank-empty-state">Nenhuma entrada recorrente cadastrada.</div> : (
              <div className="bank-income-list">
                {incomeSources.map((source) => {
                  const active = Boolean(source.is_active);
                  return (
                    <div className="bank-income-list-item bank-source-item" key={String(source.id)}>
                      <div><strong>{String(source.name ?? "Entrada")}</strong><span>{String(source.payer_name ?? source.origin ?? "Sem origem informada")}</span></div>
                      <div><strong>{formatCurrency(Number(source.amount ?? 0))}</strong><span>{frequencyLabel(source.frequency)}{source.expected_day ? ` · dia ${String(source.expected_day)}` : ""}</span></div>
                      <span className={`badge ${active ? "green" : "gray"}`}>{active ? "Ativa" : "Pausada"}</span>
                      <form action={toggleBankIncomeSource}>
                        <input type="hidden" name="source_id" value={String(source.id)} />
                        <input type="hidden" name="active" value={active ? "false" : "true"} />
                        <button className="button ghost bank-income-action" type="submit">{active ? "Pausar" : "Ativar"}</button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="panel bank-income-note-panel">
        <div className="panel-body bank-income-note">
          <Building2 size={20} />
          <div><strong>Saldo real continua sendo manual.</strong><span>Registrar um recebimento não altera automaticamente o saldo da conta. O saldo real é atualizado pelo fluxo “Atualizar saldo”, evitando divergências com o banco.</span></div>
        </div>
      </article>
    </section>
  );
}
