"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BankMobileAgenda } from "@/components/bank-mobile-agenda";
import { BankPlannerLogo } from "@/components/bank-planner-logo";
import { bankCardBrand } from "@/lib/bank-card-brand";
import { calculateBankPlan } from "@/lib/bank-planning";
import { BankInstallmentSimulator } from "@/components/bank-installment-simulator";
import { BankCardCycle } from "@/components/bank-card-cycle";
import { BankPlanningIncomes } from "@/components/bank-planning-incomes";
import type { BankPlanningData } from "@/lib/bank-planning-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import "./bank-month-planner.css";

function moveBankCard(event: ReactPointerEvent<HTMLButtonElement>) {
  if (event.pointerType !== "mouse" || event.buttons || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  card.style.setProperty("--card-rx", `${((.5 - y / rect.height) * 7).toFixed(2)}deg`);
  card.style.setProperty("--card-ry", `${((x / rect.width - .5) * 8).toFixed(2)}deg`);
  card.style.setProperty("--pointer-x", `${x.toFixed(0)}px`);
  card.style.setProperty("--pointer-y", `${y.toFixed(0)}px`);
}

function resetBankCard(event: ReactPointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.setProperty("--card-rx", "0deg");
  event.currentTarget.style.setProperty("--card-ry", "0deg");
}

export function BankMonthPlanner({ data, initialMonth, today = "", initialQueue = "all" }: { data: BankPlanningData; initialMonth?: string; today?: string; initialQueue?: "all" | "overdue" | "today" | "upcoming" }) {
  const [queue, setQueue] = useState(initialQueue);
  const [cycleDate, setCycleDate] = useState(today);
  const [monthKey, setMonthKey] = useState(data.months.some(month => month.referenceMonth === initialMonth) ? initialMonth! : data.currentMonth);
  const [cardId, setCardId] = useState("all");
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ startX: 0, scroll: 0, pointer: -1, moved: false });
  const skipClick = useRef(false);
  function scrollCards(direction: number) {
    const element = track.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>("button");
    const step = (card?.offsetWidth ?? 250) + 14;
    element.scrollBy({ left: direction * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const month = data.months.find(row => row.referenceMonth === monthKey) ?? data.months[0];
  const plan = calculateBankPlan({ month: month.referenceMonth, currentMonth: data.currentMonth, balance: data.balance, reserves: data.reserves, incomes: month.incomes, commitments: month.rows.map(row => row.amount) });
  const rows = month.rows.filter(row => queue === "all" || (row.dueMode === "fixed_day" && row.dueDate && (queue === "overdue" ? row.dueDate < today : queue === "today" ? row.dueDate === today : row.dueDate > today))).filter(row => cardId === "all" || (cardId === "other" ? !row.cardId : row.cardId === cardId)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.title.localeCompare(b.title));
  return <section className="bank-planner">
    <header className="bank-planner-head"><div><span>CANDINHO BANK · PLANEJAMENTO</span><h1>Seu mês, com clareza.</h1><p>O que está disponível, o que falta pagar e o que cabe nos seus planos.</p></div><Link className="button ghost" href="/bank">Visão completa e edição</Link></header>
    <nav className="bank-planner-months" aria-label="Selecionar mês">{data.months.map(item => <button key={item.referenceMonth} aria-pressed={month.referenceMonth === item.referenceMonth} onClick={() => { setMonthKey(item.referenceMonth); setCardId("all"); }}>{item.label}</button>)}</nav>
    <div className="bank-planner-summary">
      <article><span>Disponível neste mês</span><strong>{formatCurrency(plan.available)}</strong><small>{month.referenceMonth === data.currentMonth ? `Saldo conferido${data.balanceDate ? ` em ${formatDateOnly(data.balanceDate)}` : " · data a conferir"}` : "Somente reserva destinada a este mês; sem sobra automática"}</small>{plan.reserve > 0 ? <small>Reserva incluída uma vez: {formatCurrency(plan.reserve)}</small> : null}</article>
      <article><span>Entradas previstas</span><strong>{formatCurrency(plan.pending)}</strong><small>A conferir · não incluídas no disponível</small></article>
      <article><span>Compromissos em aberto</span><strong>{formatCurrency(plan.commitments)}</strong><small>Todas as contas do mês, inclusive atrasadas</small></article>
      <article><span>Diferença com o disponível</span><strong className={plan.difference < 0 ? "negative" : "positive"}>{formatCurrency(plan.difference)}</strong><small>Se todas as previsões entrarem: {formatCurrency(plan.projected)}</small></article>
    </div>
    <BankPlanningIncomes key={month.referenceMonth} incomes={month.incomes} month={month.referenceMonth} canWrite={data.canWrite === true}/>
    <BankInstallmentSimulator data={data}/>
    <div className="bank-planner-card-head"><div><h2>Contas e cartões</h2><small>Arraste para o lado ou use as setas</small></div><div><button aria-label="Cartões anteriores" onClick={() => scrollCards(-1)}><ChevronLeft/></button><button aria-label="Próximos cartões" onClick={() => scrollCards(1)}><ChevronRight/></button></div></div>
    <div className="bank-card-cycle-controls"><label>Se eu comprar em…<input type="date" value={cycleDate} onChange={event => setCycleDate(event.target.value)}/></label><Link href="/bank/faturas">Conferir ou editar datas dos cartões</Link><small>Estimativa por fechamento e vencimento cadastrados, não autorização para gastar. No dia do fechamento, confirme com o banco.</small></div>
    <div className="bank-planner-cards" ref={track} role="group" aria-label="Filtrar compromissos por cartão"
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
        buttons[next]?.focus({ preventScroll: true });
        buttons[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
      onPointerDown={event => {
        skipClick.current = false;
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        drag.current = { startX: event.clientX, scroll: event.currentTarget.scrollLeft, pointer: event.pointerId, moved: false };
      }}
      onPointerMove={event => {
        const state = drag.current;
        if (state.pointer !== event.pointerId || event.buttons !== 1) return;
        const delta = event.clientX - state.startX;
        if (!state.moved && Math.abs(delta) < 6) return;
        state.moved = true;
        skipClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.dataset.dragging = "true";
        event.currentTarget.scrollLeft = state.scroll - delta;
        event.preventDefault();
      }}
      onPointerUp={event => {
        drag.current.pointer = -1;
        delete event.currentTarget.dataset.dragging;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={event => { drag.current.pointer = -1; delete event.currentTarget.dataset.dragging; }}
      onPointerLeave={event => { if (!drag.current.moved) drag.current.pointer = -1; if (!event.buttons) { drag.current.pointer = -1; delete event.currentTarget.dataset.dragging; } }}
      onClickCapture={event => { if (skipClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); skipClick.current = false; } }}
      onDragStart={event => event.preventDefault()}>
      {[{ id: "all", name: "Todas as contas", institution: "Visão geral", holder: "Todos os titulares" }, ...data.cards, { id: "other", name: "Demais compromissos", institution: "Sem cartão vinculado", holder: "Recorrências, empréstimos e cobranças" }].map(card => <button key={card.id} onPointerMove={moveBankCard} onPointerLeave={resetBankCard} onPointerDown={resetBankCard} style={{ "--bank-color": bankCardBrand(card.institution).color, "--bank-background": bankCardBrand(card.institution).background } as CSSProperties} aria-pressed={cardId === card.id} onClick={() => setCardId(card.id)}><BankPlannerLogo institution={card.institution}/><span>{card.institution}</span><strong>{card.name}</strong><small>Titular: {card.holder}</small>{card.id !== "all" && card.id !== "other" ? <BankCardCycle card={card} date={cycleDate}/> : null}<b>{formatCurrency(month.rows.filter(row => card.id === "all" || (card.id === "other" ? !row.cardId : row.cardId === card.id)).reduce((sum, row) => sum + row.amount, 0))}</b></button>)}
    </div>
    <p className="bank-planner-filter-note">O cartão filtra somente a lista abaixo. O resumo e o simulador continuam considerando o mês inteiro.</p>
    <nav id="compromissos" className="bank-planner-months" aria-label="Fila dos compromissos">{([ ["all","Todos"],["overdue","Vencidos"],["today","Hoje"],["upcoming","Próximos"] ] as const).map(([value,label])=><button key={value} aria-pressed={queue===value} onClick={()=>setQueue(value)}>{label}</button>)}</nav>
    <BankMobileAgenda key={`${month.referenceMonth}:${cardId}`} showSummary={false} months={[{ label: cardId === "all" ? month.label : `${month.label} · ${cardId === "other" ? "Demais compromissos" : data.cards.find(card => card.id === cardId)?.name}`, referenceMonth: month.referenceMonth, rows, openingBalance: 0, receivable: 0 }]}/>
    <aside className="bank-planner-notes"><h2>O que precisa de conferência</h2>{data.warnings.map(note => <p key={note}>{note}</p>)}<Link href="/bank/objetivos">Conferir reservas e objetivos</Link></aside>
  </section>;
}
