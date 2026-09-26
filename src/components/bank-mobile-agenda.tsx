"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Clock3, X } from "lucide-react";
import { useState } from "react";
import { BankPaidForm } from "@/components/bank-paid-form";
import type { BankMonthCommitment } from "@/lib/bank-home-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type MonthBlock = {
  label: string;
  referenceMonth: string;
  rows: BankMonthCommitment[];
  openingBalance: number;
  receivable: number;
};

function groupByDay(rows: BankMonthCommitment[]) {
  const groups = new Map<string, BankMonthCommitment[]>();
  for (const row of rows) {
    const key = row.dueDate ?? "Sem dia definido";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()];
}

export function BankMobileAgenda({ months }: { months: MonthBlock[] }) {
  const [selected, setSelected] = useState<(BankMonthCommitment & { referenceMonth: string }) | null>(null);

  return <div className="bank-mobile-agenda">
    {months.map((month, monthIndex) => {
      const monthCommitments = month.rows.reduce((sum, row) => sum + row.amount, 0);
      const monthDifference = month.openingBalance + month.receivable - monthCommitments;
      let runningBalance = month.openingBalance + month.receivable;
      return <section className="bank-mobile-month" key={month.referenceMonth}>
      <header><div><span>AGENDA FINANCEIRA</span><h2>{month.label}</h2></div><strong>{formatCurrency(month.rows.reduce((sum, row) => sum + row.amount, 0))}</strong></header>
      <div className="bank-mobile-summary" aria-label={`Resumo de ${month.label}`}>
        <div><span>{monthIndex === 0 ? "Saldo atual" : "Saldo inicial projetado"}</span><strong>{formatCurrency(month.openingBalance)}</strong><small>{monthIndex === 0 ? "Saldo real das contas" : "Diferença final do mês anterior"}</small></div>
        <div><span>A receber no mês</span><strong>{formatCurrency(month.receivable)}</strong><small>Operações + demais entradas previstas</small></div>
        <div><span>Contas do mês</span><strong>{formatCurrency(monthCommitments)}</strong><small>Somente este mês</small></div>
        <div className={monthDifference < 0 ? "negative" : "positive"}><span>Diferença do mês</span><strong>{formatCurrency(monthDifference)}</strong><small>Saldo inicial + receber − contas</small></div>
      </div>
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
    </section>})}

    {selected ? <div className="bank-mobile-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="bank-mobile-modal" role="dialog" aria-modal="true" aria-label="Detalhes da conta">
        <header><div><span>DETALHES</span><h2>{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18}/></button></header>
        <dl><div><dt>Valor</dt><dd>{formatCurrency(selected.amount)}</dd></div><div><dt>Vencimento</dt><dd>{selected.dueDate ? formatDateOnly(selected.dueDate) : "Sem dia definido"}</dd></div><div><dt>Origem</dt><dd>{selected.origin ?? "Geral"}</dd></div></dl>
        <div className="bank-mobile-modal-actions"><BankPaidForm commitmentKey={selected.id} referenceMonth={selected.referenceMonth} returnTo="/bank/mobile"/><Link href={selected.href}><Clock3 size={15}/>Abrir e adiar</Link></div>
      </section>
    </div> : null}
  </div>;
}
