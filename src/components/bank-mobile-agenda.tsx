"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Clock3, X } from "lucide-react";
import { useState } from "react";
import { BankPaidForm } from "@/components/bank-paid-form";
import type { BankMonthCommitment } from "@/lib/bank-home-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type MonthBlock = { label: string; referenceMonth: string; rows: BankMonthCommitment[] };

function groupByDay(rows: BankMonthCommitment[]) {
  const groups = new Map<string, BankMonthCommitment[]>();
  for (const row of rows) {
    const key = row.dueDate ?? "Sem dia definido";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()];
}

export function BankMobileAgenda({ months, balance, receivable }: { months: MonthBlock[]; balance: number; receivable: number }) {
  const [selected, setSelected] = useState<(BankMonthCommitment & { referenceMonth: string }) | null>(null);
  const totalCommitments = months.reduce((monthTotal, month) => monthTotal + month.rows.reduce((sum, row) => sum + row.amount, 0), 0);
  let runningBalance = balance + receivable;

  return <div className="bank-mobile-agenda">
    <section className="bank-mobile-summary" aria-label="Resumo financeiro">
      <div><span>Saldo atual</span><strong>{formatCurrency(balance)}</strong><small>Saldo real das contas</small></div>
      <div><span>A receber</span><strong>{formatCurrency(receivable)}</strong><small>Valores ainda pendentes</small></div>
      <div><span>Contas exibidas</span><strong>{formatCurrency(totalCommitments)}</strong><small>Mês atual + próximo</small></div>
      <div className={balance + receivable - totalCommitments < 0 ? "negative" : "positive"}><span>Diferença projetada</span><strong>{formatCurrency(balance + receivable - totalCommitments)}</strong><small>Saldo + receber − contas</small></div>
    </section>
    {months.map((month) => <section className="bank-mobile-month" key={month.referenceMonth}>
      <header><div><span>AGENDA FINANCEIRA</span><h2>{month.label}</h2></div><strong>{formatCurrency(month.rows.reduce((sum, row) => sum + row.amount, 0))}</strong></header>
      {groupByDay(month.rows).map(([day, rows]) => {
        const dayTotal = rows.reduce((sum, row) => sum + row.amount, 0);
        runningBalance -= dayTotal;
        return <div className="bank-mobile-day" key={day}>
        <div className="bank-mobile-day-label"><CalendarClock size={18}/><div><strong>{day === "Sem dia definido" ? day : `Dia ${Number(day.slice(8, 10))}`}</strong><span>{day === "Sem dia definido" ? "Compromissos do mês" : formatDateOnly(day)}</span></div></div>
        <div className="bank-mobile-day-rows">
          <div className="bank-mobile-day-balance"><span>Total do dia <strong>{formatCurrency(dayTotal)}</strong></span><span>Saldo depois do dia <strong className={runningBalance < 0 ? "negative" : "positive"}>{formatCurrency(runningBalance)}</strong></span></div>
          {rows.map((item) => <article key={item.id}>
            <button type="button" className="bank-mobile-detail" onClick={() => setSelected({ ...item, referenceMonth: month.referenceMonth })}>
              <div><strong>{item.title}</strong><span>{item.origin ?? "Geral"}</span></div><b>{formatCurrency(item.amount)}</b><ChevronRight size={16}/>
            </button>
            <div className="bank-mobile-row-actions">
              <button type="button" onClick={() => setSelected({ ...item, referenceMonth: month.referenceMonth })}>Detalhes</button>
              <BankPaidForm commitmentKey={item.id} referenceMonth={month.referenceMonth} returnTo="/bank/mobile" />
              <Link href={item.kind === "debt" ? `/bank/emprestimos?adiar=${encodeURIComponent(item.id.split(":")[1] ?? "")}` : item.href}>Adiar</Link>
            </div>
          </article>)}
        </div>
      </div>})}
      {month.rows.length === 0 ? <p className="bank-mobile-empty">Nenhum compromisso aberto neste mês.</p> : null}
    </section>)}

    {selected ? <div className="bank-mobile-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="bank-mobile-modal" role="dialog" aria-modal="true" aria-label="Detalhes da conta">
        <header><div><span>DETALHES</span><h2>{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18}/></button></header>
        <dl><div><dt>Valor</dt><dd>{formatCurrency(selected.amount)}</dd></div><div><dt>Vencimento</dt><dd>{selected.dueDate ? formatDateOnly(selected.dueDate) : "Sem dia definido"}</dd></div><div><dt>Origem</dt><dd>{selected.origin ?? "Geral"}</dd></div></dl>
        <div className="bank-mobile-modal-actions"><BankPaidForm commitmentKey={selected.id} referenceMonth={selected.referenceMonth} returnTo="/bank/mobile"/><Link href={selected.href}><Clock3 size={15}/>Abrir e adiar</Link></div>
      </section>
    </div> : null}
  </div>;
}
