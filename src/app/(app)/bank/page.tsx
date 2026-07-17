import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  CreditCard,
  Landmark,
  RefreshCcw,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getBankDashboardData } from "@/lib/bank-data";
import { formatCurrency, formatDateOnly, formatMonthYear } from "@/lib/format";

function statusLabel(status: string) {
  if (status === "overdue") return "Vencida";
  if (status === "partial") return "Parcial";
  return "Pendente";
}

function statusClass(status: string) {
  if (status === "overdue") return "red";
  if (status === "partial") return "orange";
  return "gray";
}

export default async function BankDashboardPage() {
  const data = await getBankDashboardData();
  const currentProjection = data.annualProjection[0];
  const currentCommitments = currentProjection?.totalCommitments ?? (data.summary.dueThisMonth + data.summary.invoicesThisMonth);
  const currentExpectedIncome = currentProjection?.totalExpectedIncome ?? data.summary.receivableThisMonth;
  const operationReceivables = data.operationReceivablesSummary;
  const projectedAvailable = data.summary.totalBalance + currentExpectedIncome - currentCommitments;
  const differenceLabel = projectedAvailable < 0 ? "Falta para cobrir" : "Saldo após compromissos";
  const visibleProjection = data.annualProjection.slice(0, 6);

  return (
    <section className="bank-dashboard">
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Seu financeiro hoje</h1>
          <p>Saldo real, compromissos, entradas previstas e projeção dos próximos meses em uma única visão.</p>
        </div>
        <div className="bank-header-actions">
          <Link className="button ghost" href="/bank/atualizar"><RefreshCcw size={16} />Atualização rápida</Link>
          <Link className="button gold" href="/bank/faturas?acao=atualizar"><CreditCard size={16} />Atualizar faturas</Link>
        </div>
      </div>

      <div className="bank-balance-hero">
        <div>
          <span className="bank-balance-kicker">Saldo total disponível</span>
          <strong>{formatCurrency(data.summary.totalBalance)}</strong>
          <small>
            {data.summary.latestBalanceDate
              ? `Saldos atualizados em ${formatDateOnly(data.summary.latestBalanceDate)}`
              : "Nenhum saldo diário informado ainda"}
          </small>
        </div>
        <Wallet size={42} />
      </div>

      <div className="grid stats-grid bank-stats-grid">
        <article className="stat-card">
          <div className="stat-head"><span>Saldo disponível</span><span className="stat-icon"><Landmark size={17} /></span></div>
          <div className="stat-value">{formatCurrency(data.summary.totalBalance)}</div>
          <div className="stat-note">Soma do saldo mais recente das contas ativas.</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>A receber</span><span className="stat-icon"><TrendingUp size={17} /></span></div>
          <div className="stat-value">{formatCurrency(currentExpectedIncome)}</div>
          <div className="stat-note">Entradas recorrentes, recebimentos e operações previstos no mês atual.</div>
        </article>
        <Link className="stat-card stat-card-link" href="/bank/operacoes">
          <div className="stat-head"><span>À receber nas operações</span><span className="stat-icon"><CircleDollarSign size={17} /></span></div>
          <div className="stat-value">{formatCurrency(operationReceivables.total)}</div>
          <div className="stat-note">Suplementos {formatCurrency(operationReceivables.supplementsTotal)} · Fitness {formatCurrency(operationReceivables.fitnessTotal)}. Clique para detalhar.</div>
        </Link>
        <article className="stat-card">
          <div className="stat-head"><span>A pagar</span><span className="stat-icon"><ReceiptText size={17} /></span></div>
          <div className="stat-value">{formatCurrency(currentCommitments)}</div>
          <div className="stat-note">Compromissos previstos no mês, sem duplicar mensalidades.</div>
        </article>
        <article className={`stat-card bank-difference-card ${projectedAvailable < 0 ? "negative" : "positive"}`}>
          <div className="stat-head"><span>{differenceLabel}</span><span className="stat-icon"><CircleDollarSign size={17} /></span></div>
          <div className="stat-value">{formatCurrency(Math.abs(projectedAvailable))}</div>
          <div className="stat-note">Saldo atual + entradas previstas − compromissos do mês.</div>
        </article>
      </div>

      <div className="bank-quick-actions">
        <Link href="/bank/atualizar" className="bank-quick-card">
          <RefreshCcw size={20} />
          <div><strong>Atualização rápida</strong><span>Atualize saldos e faturas em uma única tela.</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/bank/faturas?acao=atualizar" className="bank-quick-card">
          <CreditCard size={20} />
          <div><strong>Atualizar faturas</strong><span>Preencha individualmente ou avance cartão por cartão.</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/bank/cobrancas?acao=nova" className="bank-quick-card">
          <ReceiptText size={20} />
          <div><strong>Nova cobrança</strong><span>Registre uma conta com vencimento e origem.</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/bank/entradas?acao=nova-receber" className="bank-quick-card">
          <TrendingUp size={20} />
          <div><strong>Nova entrada</strong><span>Registre um valor previsto ou uma conta a receber.</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/bank/visao-anual" className="bank-quick-card">
          <CalendarRange size={20} />
          <div><strong>Ver visão anual</strong><span>Acompanhe compromissos e resultado mês a mês.</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/bank/fechamento" className="bank-quick-card">
          <Archive size={20} />
          <div><strong>Fechar o mês</strong><span>Guarde uma fotografia do saldo, estoque, recebíveis e dívidas.</span></div>
          <ArrowRight size={17} />
        </Link>
      </div>

      {data.reviewAlerts.length > 0 && (
        <article className="panel bank-review-panel">
          <div className="panel-head"><div><h2>Revisões recomendadas</h2><p>Pontos que podem deixar sua projeção menos confiável se ficarem desatualizados.</p></div><AlertTriangle size={20}/></div>
          <div className="panel-body bank-review-list">
            {data.reviewAlerts.map((alert) => (
              <Link className="bank-review-item" href={alert.href} key={alert.kind}>
                <AlertTriangle size={17}/><div><strong>{alert.title}</strong><span>{alert.description}</span></div>{alert.amount !== undefined && <b>{formatCurrency(alert.amount)}</b>}<ArrowRight size={15}/>
              </Link>
            ))}
          </div>
        </article>
      )}

      <article className="panel bank-patrimony-panel">
        <div className="panel-head"><div><h2>Patrimônio Candinho Company</h2><p>Uma leitura gerencial usando dinheiro, estoque a custo, recebíveis e dívidas. Os cards levam direto para a origem do dado.</p></div><span className={`badge ${data.patrimony.operationalNetPosition < 0 ? "red" : "green"}`}>Posição operacional {formatCurrency(data.patrimony.operationalNetPosition)}</span></div>
        <div className="panel-body bank-patrimony-grid">
          <Link href="/bank/contas" className="bank-patrimony-card"><Landmark size={19}/><span>Dinheiro Company</span><strong>{formatCurrency(data.patrimony.companyCashBalance)}</strong><small>Total geral em contas: {formatCurrency(data.patrimony.totalCashBalance)}</small></Link>
          <Link href="/estoque" className="bank-patrimony-card"><Wallet size={19}/><span>Estoque Suplementos · custo</span><strong>{formatCurrency(data.patrimony.supplementsStockCost)}</strong><small>Valor potencial de venda: {formatCurrency(data.patrimony.supplementsStockSaleValue)}</small></Link>
          <Link href="/fitness/estoque" className="bank-patrimony-card"><Wallet size={19}/><span>Estoque Fitness · custo</span><strong>{formatCurrency(data.patrimony.fitnessStockCost)}</strong><small>Valor potencial de venda: {formatCurrency(data.patrimony.fitnessStockSaleValue)}</small></Link>
          <Link href="/bank/operacoes" className="bank-patrimony-card"><TrendingUp size={19}/><span>À receber nas operações</span><strong>{formatCurrency(data.patrimony.operationReceivables)}</strong><small>Bank + operações: {formatCurrency(data.patrimony.totalReceivables)}</small></Link>
          <Link href="/bank/emprestimos" className="bank-patrimony-card"><ReceiptText size={19}/><span>Dívidas da Company</span><strong>{formatCurrency(data.patrimony.companyDebtRemaining)}</strong><small>Dívidas gerais: {formatCurrency(data.patrimony.totalDebtRemaining)}</small></Link>
          <Link href="/bank/fechamento" className={`bank-patrimony-card featured ${data.patrimony.totalNetPosition < 0 ? "negative" : "positive"}`}><CircleDollarSign size={19}/><span>Posição líquida geral</span><strong>{formatCurrency(data.patrimony.totalNetPosition)}</strong><small>Saldo + estoques + recebíveis − dívidas.</small></Link>
        </div>
      </article>

      <div className="grid bank-dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Próximas cobranças</h2>
              <p>Contas pendentes organizadas pela data de vencimento.</p>
            </div>
            <Link className="bank-panel-link" href="/bank/cobrancas">Ver todas <ArrowRight size={14} /></Link>
          </div>
          <div className="panel-body">
            {data.upcomingCharges.length === 0 ? (
              <div className="bank-empty-state">Nenhuma cobrança pendente cadastrada.</div>
            ) : (
              <div className="bank-charge-list">
                {data.upcomingCharges.map((charge) => (
                  <div className="bank-charge-item" key={charge.id}>
                    <div className="bank-charge-date">
                      <strong>{formatDateOnly(charge.dueDate).slice(0, 5)}</strong>
                      <span>{charge.origin ?? charge.category ?? "Geral"}</span>
                    </div>
                    <div className="bank-charge-main">
                      <strong>{charge.title}</strong>
                      <span>{charge.category ?? "Sem categoria"}</span>
                    </div>
                    <div className="bank-charge-value">
                      <strong>{formatCurrency(charge.remainingAmount)}</strong>
                      <span className={`badge ${statusClass(charge.effectiveStatus)}`}>{statusLabel(charge.effectiveStatus)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Próximos recebimentos</h2>
              <p>Valores que ainda precisam cair, organizados pela data prevista.</p>
            </div>
            <Link className="bank-panel-link" href="/bank/entradas">Ver entradas <ArrowRight size={14} /></Link>
          </div>
          <div className="panel-body">
            {data.upcomingReceivables.length === 0 ? (
              <div className="bank-empty-state">Nenhuma conta a receber pendente.</div>
            ) : (
              <div className="bank-charge-list">
                {data.upcomingReceivables.map((item) => (
                  <div className="bank-charge-item" key={item.id}>
                    <div className="bank-charge-date">
                      <strong>{formatDateOnly(item.dueDate).slice(0, 5)}</strong>
                      <span>{item.origin ?? "Entrada"}</span>
                    </div>
                    <div className="bank-charge-main">
                      <strong>{item.title}</strong>
                      <span>{item.payerName ?? "Sem pagador informado"}</span>
                    </div>
                    <div className="bank-charge-value">
                      <strong>{formatCurrency(item.remainingAmount)}</strong>
                      <span className={`badge ${statusClass(item.effectiveStatus)}`}>{statusLabel(item.effectiveStatus)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="panel bank-dashboard-accounts-panel">
          <div className="panel-head">
            <div>
              <h2>Onde está seu dinheiro</h2>
              <p>Saldo mais recente por conta e carteira.</p>
            </div>
            <Link className="bank-panel-link" href="/bank/contas">Gerenciar <ArrowRight size={14} /></Link>
          </div>
          <div className="panel-body">
            {data.accounts.length === 0 ? (
              <div className="bank-empty-state">Cadastre suas contas para começar a acompanhar o saldo real.</div>
            ) : (
              <div className="bank-account-list">
                {data.accounts.slice(0, 6).map((account) => (
                  <div className="bank-account-item" key={account.id}>
                    <div><strong>{account.name}</strong><span>{account.origin ?? account.accountType}</span></div>
                    <div><strong>{formatCurrency(account.balance)}</strong><span>{account.balanceDate ? formatDateOnly(account.balanceDate) : "Sem atualização"}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="panel bank-projection-panel">
        <div className="panel-head">
          <div>
            <h2>Projeção dos próximos meses</h2>
            <p>Entradas previstas, compromissos e resultado projetado.</p>
          </div>
          <Link className="bank-panel-link" href="/bank/visao-anual">Abrir 12 meses <ArrowRight size={14} /></Link>
        </div>
        <div className="panel-body">
          {visibleProjection.length === 0 ? (
            <div className="bank-empty-state">A projeção aparecerá assim que houver dados financeiros cadastrados.</div>
          ) : (
            <div className="bank-projection-list">
              {visibleProjection.map((month) => {
                const maxValue = Math.max(month.totalCommitments, month.totalExpectedIncome, 1);
                const commitmentWidth = `${Math.min((month.totalCommitments / maxValue) * 100, 100)}%`;
                const incomeWidth = `${Math.min((month.totalExpectedIncome / maxValue) * 100, 100)}%`;
                return (
                  <div className="bank-projection-row" key={month.referenceMonth}>
                    <div className="bank-projection-month"><strong>{formatMonthYear(month.referenceMonth)}</strong></div>
                    <div className="bank-projection-bars">
                      <div><span>Entradas</span><i className="income" style={{ width: incomeWidth }} /></div>
                      <div><span>Compromissos</span><i className="commitment" style={{ width: commitmentWidth }} /></div>
                    </div>
                    <div className={`bank-projection-result ${month.projectedResult < 0 ? "negative" : "positive"}`}>
                      <span>Resultado</span>
                      <strong>{formatCurrency(month.projectedResult)}</strong>
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
