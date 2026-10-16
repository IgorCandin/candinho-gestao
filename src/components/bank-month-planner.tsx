"use client";

import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BankMobileAgenda } from "@/components/bank-mobile-agenda";
import { BankPlannerLogo } from "@/components/bank-planner-logo";
import { calculateBankPlan, parsePlanBudget } from "@/lib/bank-planning";
import type { BankPlanningData } from "@/lib/bank-planning-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import "./bank-month-planner.css";

function bankColor(institution: string) {
  const name = institution.toLowerCase();
  if (name.includes("sicoob")) return "#008b83";
  if (name.includes("nubank")) return "#8a36cf";
  if (name.includes("brasil")) return "#b69c08";
  if (name.includes("caixa") || name.includes("brb")) return "#1675b9";
  if (name.includes("shopee")) return "#d74b29";
  return "#168e9e";
}

export function BankMonthPlanner({ data, initialMonth }: { data: BankPlanningData; initialMonth?: string }) {
  const [monthKey, setMonthKey] = useState(data.months.some(month => month.referenceMonth === initialMonth) ? initialMonth! : data.currentMonth);
  const [cardId, setCardId] = useState("all");
  const [budget, setBudget] = useState("");
  const [title, setTitle] = useState("Chá de bebê do Mateus");
  const track = useRef<HTMLDivElement>(null);
  const month = data.months.find(row => row.referenceMonth === monthKey) ?? data.months[0];
  const parsed = parsePlanBudget(budget);
  const plan = calculateBankPlan({ month: month.referenceMonth, currentMonth: data.currentMonth, balance: data.balance, reserves: data.reserves, incomes: month.incomes, commitments: month.rows.map(row => row.amount), budget: parsed ?? 0 });
  const rows = month.rows.filter(row => cardId === "all" || (cardId === "other" ? !row.cardId : row.cardId === cardId)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.title.localeCompare(b.title));
  return <section className="bank-planner">
    <header className="bank-planner-head"><div><span>CANDINHO BANK · PLANEJAMENTO</span><h1>Seu mês, com clareza.</h1><p>O que está disponível, o que falta pagar e o que cabe nos seus planos.</p></div><Link className="button ghost" href="/bank">Visão completa e edição</Link></header>
    <nav className="bank-planner-months" aria-label="Selecionar mês">{data.months.map(item => <button key={item.referenceMonth} aria-pressed={month.referenceMonth === item.referenceMonth} onClick={() => { setMonthKey(item.referenceMonth); setCardId("all"); }}>{item.label}</button>)}</nav>
    <div className="bank-planner-summary">
      <article><span>Disponível neste mês</span><strong>{formatCurrency(plan.available)}</strong><small>{month.referenceMonth === data.currentMonth ? `Saldo conferido${data.balanceDate ? ` em ${formatDateOnly(data.balanceDate)}` : " · data a conferir"}` : "Somente reserva destinada a este mês; sem sobra automática"}</small>{plan.reserve > 0 ? <small>Reserva incluída uma vez: {formatCurrency(plan.reserve)}</small> : null}</article>
      <article><span>Entradas previstas</span><strong>{formatCurrency(plan.pending)}</strong><small>A conferir · não incluídas no disponível</small></article>
      <article><span>Compromissos em aberto</span><strong>{formatCurrency(plan.commitments)}</strong><small>Todas as contas do mês, inclusive atrasadas</small></article>
      <article><span>Diferença com o disponível</span><strong className={plan.difference < 0 ? "negative" : "positive"}>{formatCurrency(plan.difference)}</strong><small>Se todas as previsões entrarem: {formatCurrency(plan.projected)}</small></article>
    </div>
    <details className="bank-planner-incomes"><summary>Conferir entradas e valores já recebidos</summary><p>Recebidos são informativos: não somamos novamente ao saldo. Salários adiantados são abatidos das previsões.</p>{month.incomes.map(row => <div key={row.id}><span>{row.title}{row.kind === "transfer" ? " · transferência, não renda" : ""}</span><strong>{formatCurrency(row.amount)} · {row.state === "received" ? "conferido" : "a conferir"}</strong></div>)}<Link href="/bank/entradas">Abrir entradas e conferência</Link></details>
    <section className="bank-planner-simulator" aria-label="Simulador de plano"><div><h2>Cabe um plano?</h2><p>Simulação apenas. Não cria despesa nem altera seu saldo.</p></div><label>Nome do plano<input value={title} onChange={event => setTitle(event.target.value)} /></label><label>Orçamento (R$)<input inputMode="decimal" placeholder="0,00" value={budget} onChange={event => setBudget(event.target.value)} aria-invalid={parsed === null}/></label><output aria-live="polite">{parsed === null ? "Informe um valor como 1.200,50." : <><strong>{title || "Seu plano"}: {plan.afterPlan < 0 ? "faltariam" : "sobrariam"} {formatCurrency(Math.abs(plan.afterPlan))}</strong><small>Após pagar os compromissos. Com entradas ainda a conferir: {formatCurrency(plan.projectedAfterPlan)}.</small></>}</output></section>
    <div className="bank-planner-card-head"><h2>Contas e cartões</h2><div><button aria-label="Cartões anteriores" onClick={() => track.current?.scrollBy({ left: -300, behavior: "smooth" })}><ChevronLeft/></button><button aria-label="Próximos cartões" onClick={() => track.current?.scrollBy({ left: 300, behavior: "smooth" })}><ChevronRight/></button></div></div>
    <div className="bank-planner-cards" ref={track} aria-label="Filtrar compromissos por cartão">
      {[{ id: "all", name: "Todas as contas", institution: "Visão geral", holder: "Todos os titulares" }, ...data.cards, { id: "other", name: "Demais compromissos", institution: "Sem cartão vinculado", holder: "Recorrências, empréstimos e cobranças" }].map(card => <button key={card.id} style={{ "--bank-color": bankColor(card.institution) } as CSSProperties} aria-pressed={cardId === card.id} onClick={() => setCardId(card.id)}><BankPlannerLogo institution={card.institution}/><span>{card.institution}</span><strong>{card.name}</strong><small>Titular: {card.holder}</small><b>{formatCurrency(month.rows.filter(row => card.id === "all" || (card.id === "other" ? !row.cardId : row.cardId === card.id)).reduce((sum, row) => sum + row.amount, 0))}</b></button>)}
    </div>
    <p className="bank-planner-filter-note">O cartão filtra somente a lista abaixo. O resumo e o simulador continuam considerando o mês inteiro.</p>
    <BankMobileAgenda key={`${month.referenceMonth}:${cardId}`} showSummary={false} months={[{ label: cardId === "all" ? month.label : `${month.label} · ${cardId === "other" ? "Demais compromissos" : data.cards.find(card => card.id === cardId)?.name}`, referenceMonth: month.referenceMonth, rows, openingBalance: 0, receivable: 0 }]}/>
    <aside className="bank-planner-notes"><h2>O que precisa de conferência</h2>{data.warnings.map(note => <p key={note}>{note}</p>)}<Link href="/bank/objetivos">Conferir reservas e objetivos</Link></aside>
  </section>;
}
