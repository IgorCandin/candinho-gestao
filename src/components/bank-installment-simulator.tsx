"use client";

import { useState } from "react";
import type { BankPlanningData } from "@/lib/bank-planning-data";
import { calculateBankPlan, firstInstallmentMonth, installmentSchedule, parsePlanBudget } from "@/lib/bank-planning";
import { formatCurrency } from "@/lib/format";

export function BankInstallmentSimulator({ data }: { data: BankPlanningData }) {
  const [title, setTitle] = useState("Chá de bebê do Mateus");
  const [budget, setBudget] = useState("");
  const [count, setCount] = useState("10");
  const [cardId, setCardId] = useState("");
  const [purchase, setPurchase] = useState("");
  const [override, setOverride] = useState("");
  const card = data.cards.find(row => row.id === cardId);
  const suggested = firstInstallmentMonth(purchase, card?.closingDay, card?.dueDay);
  const firstMonth = override || suggested || "";
  const parsed = parsePlanBudget(budget);
  const schedule = parsed !== null && budget.trim() ? installmentSchedule(parsed, Number(count), firstMonth) : [];
  return <section className="bank-planner-simulator" aria-label="Simulador parcelado">
    <div><h2>Cabe um plano parcelado?</h2><p>Veja o impacto em cada mês. Esta simulação não cria despesas nem altera faturas.</p></div>
    <label>Nome do plano<input name="plan-title" value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label>Valor total (R$)<input name="plan-total" inputMode="decimal" placeholder="1.000,00" value={budget} aria-invalid={parsed === null} onChange={event => setBudget(event.target.value)} /></label>
    <label>Parcelas (1 a 60)<input type="number" name="plan-count" min="1" max="60" step="1" value={count} onChange={event => setCount(event.target.value)} /></label>
    <label>Cartão<select value={cardId} onChange={event => { setCardId(event.target.value); setOverride(""); }}><option value="">Sem cartão / escolher início manualmente</option>{data.cards.map(row => <option key={row.id} value={row.id}>{row.name} · {row.holder}</option>)}</select></label>
    <label>Data prevista da compra<input type="date" value={purchase} onChange={event => { setPurchase(event.target.value); setOverride(""); }} /></label>
    <label>Mês da primeira parcela<input type="month" value={firstMonth} onChange={event => setOverride(event.target.value)} /><small>{override ? "Início ajustado manualmente." : suggested ? `Sugestão: fechamento dia ${card?.closingDay}, vencimento dia ${card?.dueDay}.` : "Informe o início; cartão sem datas completas ou compra ainda não informada."}</small></label>
    <div><p>Compra no dia do fechamento: confirme a fatura com o banco e ajuste o início se necessário. Não transportamos sobra projetada entre meses.</p>{override && suggested ? <button onClick={() => setOverride("")}>Usar início sugerido pelo cartão</button> : null}</div>
    <output aria-live="polite">{parsed === null ? "Informe o total como 1.000,00." : !schedule.length ? "Informe o total, de 1 a 60 parcelas e o mês inicial para simular." : `${title || "Seu plano"}: ${schedule.length} parcelas, total ${formatCurrency(parsed ?? 0)}.`}</output>
    {schedule.length > 0 ? <div className="bank-installment-months">{schedule.map((row, index) => {
      const month = data.months.find(item => item.referenceMonth === row.month);
      const plan = month ? calculateBankPlan({ month: row.month, currentMonth: data.currentMonth, balance: data.balance, reserves: data.reserves, incomes: month.incomes, commitments: month.rows.map(item => item.amount), budget: row.amount }) : null;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.month}T12:00:00Z`));
      return <article key={row.month}><h3>{label}</h3><strong>Parcela {index + 1}/{schedule.length}: {formatCurrency(row.amount)}</strong>{plan ? <><small>Compromissos em aberto + parcela: {formatCurrency(plan.commitments + row.amount)}</small><p className={plan.afterPlan < 0 ? "negative" : "positive"}>{plan.afterPlan < 0 ? "Faltariam" : "Sobrariam"} {formatCurrency(Math.abs(plan.afterPlan))}</p><small>Incluindo entradas a conferir: {formatCurrency(plan.projectedAfterPlan)}</small></> : <p>A conferir: saldo, entradas e compromissos deste mês ainda não foram carregados. Não é possível afirmar se cabe no orçamento.</p>}</article>;
    })}</div> : null}
  </section>;
}
