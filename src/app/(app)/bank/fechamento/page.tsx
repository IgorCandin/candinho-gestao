import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  RefreshCcw,
  Save,
  TrendingUp,
} from "lucide-react";
import { getBankDashboardData, getBankMonthClosures } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly, formatMonthYear } from "@/lib/format";
import { closeBankMonth } from "./actions";

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export default async function BankClosingPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const [closures, dashboard] = await Promise.all([
    getBankMonthClosures(),
    getBankDashboardData(),
  ]);
  const defaultMonth = (params.mes ?? `${currentMonth()}-01`).slice(0, 7);
  const referenceDate = `${defaultMonth}-01`;

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Histórico mensal</h1>
          <p>
            Aqui você salva uma fotografia do Bank para comparar sua evolução mês a mês.
            Isso não paga contas, não altera saldos e não muda lançamentos.
          </p>
        </div>
        <span className="bank-module-badge">
          <Archive size={16} />
          {closures.length} fotografia(s)
        </span>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Fotografia do mês salva.</strong>
            <span>Se o mês já existia, os números foram atualizados com o estado mais recente do Bank.</span>
          </div>
        </div>
      )}

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>O que significa “fechar o mês”?</h2>
            <p>É só guardar os números daquele momento para você poder comparar depois.</p>
          </div>
        </div>
        <div className="panel-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: 12,
            }}
          >
            <div className="stat-card">
              <div className="stat-head"><span>1. Atualize os saldos</span><RefreshCcw size={16} /></div>
              <div className="stat-note">Confira quanto realmente existe nas contas.</div>
              <Link className="button ghost compact-button" href="/bank/atualizar">Atualizar saldos</Link>
            </div>
            <div className="stat-card">
              <div className="stat-head"><span>2. Confira pagamentos</span><ReceiptText size={16} /></div>
              <div className="stat-note">Veja se faturas, parcelas e pendências já foram marcadas corretamente.</div>
              <Link className="button ghost compact-button" href="/bank">Revisar este mês</Link>
            </div>
            <div className="stat-card">
              <div className="stat-head"><span>3. Salve a fotografia</span><Archive size={16} /></div>
              <div className="stat-note">Depois disso, você terá um registro para comparar com outros meses.</div>
            </div>
          </div>
        </div>
      </article>

      <article className="panel bank-close-month-panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>O que será salvo agora</h2>
            <p>Prévia dos principais números atuais antes de registrar a fotografia.</p>
          </div>
        </div>

        <div className="grid stats-grid bank-stats-grid panel-body">
          <article className="stat-card">
            <div className="stat-head"><span>Saldo em contas</span><Landmark size={16} /></div>
            <div className="stat-value">{formatCurrency(dashboard.patrimony.totalCashBalance)}</div>
          </article>
          <article className="stat-card">
            <div className="stat-head"><span>Total a receber</span><TrendingUp size={16} /></div>
            <div className="stat-value">{formatCurrency(dashboard.patrimony.totalReceivables)}</div>
          </article>
          <article className="stat-card">
            <div className="stat-head"><span>Dívidas restantes</span><ReceiptText size={16} /></div>
            <div className="stat-value">{formatCurrency(dashboard.patrimony.totalDebtRemaining)}</div>
          </article>
          <article className="stat-card">
            <div className="stat-head"><span>Posição líquida geral</span><CircleDollarSign size={16} /></div>
            <div className="stat-value">{formatCurrency(dashboard.patrimony.totalNetPosition)}</div>
          </article>
        </div>

        <form action={closeBankMonth}>
          <div className="panel-body bank-charge-form-grid">
            <label className="field">
              <span>Mês desta fotografia</span>
              <input className="input" type="month" name="reference_month" defaultValue={defaultMonth} required />
            </label>
            <label className="field bank-charge-form-wide">
              <span>Observação opcional</span>
              <textarea
                className="input bank-textarea"
                name="notes"
                placeholder="Ex.: mês com compra grande de estoque, viagem, investimento..."
              />
            </label>
          </div>
          <div className="bank-balance-update-actions">
            <button className="button gold" type="submit">
              <Save size={16} />
              Salvar fotografia de {formatMonthYear(referenceDate)}
            </button>
          </div>
        </form>
      </article>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Fotografias já salvas</h2>
            <p>Use este histórico para ver se sua posição financeira está evoluindo.</p>
          </div>
        </div>

        <div className="panel-body">
          <div className="bank-annual-grid bank-closure-grid">
            {closures.map((item) => (
              <article className="panel bank-annual-card" key={item.id}>
                <div className="panel-body">
                  <div className="bank-annual-card-head">
                    <h2>{formatMonthYear(item.referenceMonth)}</h2>
                    <span className={`badge ${item.totalNetPosition < 0 ? "red" : "green"}`}>
                      {formatCurrency(item.totalNetPosition)}
                    </span>
                  </div>

                  <div className="bank-annual-lines">
                    <div><span>Saldo em contas</span><strong>{formatCurrency(item.totalBalance)}</strong></div>
                    <div><span>Total a receber</span><strong>{formatCurrency(item.bankReceivables + item.operationReceivables)}</strong></div>
                    <div><span>Dívidas totais</span><strong>- {formatCurrency(item.totalDebtRemaining)}</strong></div>
                    <div className="total"><span>Posição líquida geral</span><strong>{formatCurrency(item.totalNetPosition)}</strong></div>
                    <div><span>Salvo em</span><strong>{formatDateOnly(item.closedOn)}</strong></div>
                  </div>

                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>Ver composição completa</summary>
                    <div className="bank-annual-lines" style={{ marginTop: 10 }}>
                      <div><span>Estoque Suplementos</span><strong>{formatCurrency(item.supplementsStockCost)}</strong></div>
                      <div><span>Estoque Fitness</span><strong>{formatCurrency(item.fitnessStockCost)}</strong></div>
                      <div><span>À receber Bank</span><strong>{formatCurrency(item.bankReceivables)}</strong></div>
                      <div><span>À receber operações</span><strong>{formatCurrency(item.operationReceivables)}</strong></div>
                      <div><span>Posição operacional Company</span><strong>{formatCurrency(item.operationalNetPosition)}</strong></div>
                      {item.notes && <div><span>Observação</span><strong>{item.notes}</strong></div>}
                    </div>
                  </details>
                </div>
              </article>
            ))}

            {closures.length === 0 && (
              <article className="panel">
                <div className="empty">
                  <strong>Nenhuma fotografia ainda</strong>
                  Salve a primeira quando quiser começar a acompanhar sua evolução mensal.
                </div>
              </article>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
