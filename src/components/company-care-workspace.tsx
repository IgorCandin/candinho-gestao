"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ContactRound, LoaderCircle, MessageCircle, Search, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { formatDateOnly } from "@/lib/format";

export type CompanyCareItem = { id: string; sourceId: string; customerId: string; customerName: string; phone: string | null; city: string | null; operation: "Suplementos" | "Fitness"; kind: "post_sale" | "follow_up" | "waiting"; dueOn: string | null; title: string; note: string; href: string };
type Filter = "today" | "waiting" | "post_sale" | "follow_up" | "all";

function localToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
function whatsapp(phone: string | null, name: string) { const number = (phone ?? "").replace(/\D/g, ""); return number ? `https://wa.me/${number.startsWith("55") ? number : `55${number}`}?text=${encodeURIComponent(`Olá, ${name}! Tudo bem?`)}` : null; }

export function CompanyCareWorkspace({ items }: { items: CompanyCareItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("today");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = localToday();
  const counts = useMemo(() => ({ today: items.filter((item) => item.dueOn && item.dueOn <= today).length, waiting: items.filter((item) => item.kind === "waiting").length, post_sale: items.filter((item) => item.kind === "post_sale").length, follow_up: items.filter((item) => item.kind === "follow_up").length }), [items, today]);
  const visible = useMemo(() => items.filter((item) => {
    const matches = filter === "all" || (filter === "today" ? Boolean(item.dueOn && item.dueOn <= today) : item.kind === filter);
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return matches && (!needle || `${item.customerName} ${item.title} ${item.note} ${item.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }).sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.customerName.localeCompare(b.customerName, "pt-BR")), [filter, items, query, today]);

  const filters: Array<{ id: Filter; label: string; count?: number }> = [{ id: "today", label: "Atender hoje", count: counts.today }, { id: "waiting", label: "Aguardando resposta", count: counts.waiting }, { id: "post_sale", label: "Pós-venda", count: counts.post_sale }, { id: "follow_up", label: "Retornos", count: counts.follow_up }, { id: "all", label: "Todos", count: items.length }];
  async function resolve(item: CompanyCareItem, waitMonth: boolean) {
    setBusy(item.id); setMessage(null);
    try {
      const today = localToday();
      const next = new Date(`${today}T12:00:00-03:00`); next.setMonth(next.getMonth() + 1);
      const nextDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(next);
      const { error } = await createClient().rpc("register_customer_interaction", { p_customer_id: item.customerId, p_interaction_type: "contact", p_contact_on: today, p_channel: "WhatsApp", p_outcome: waitMonth ? "Preferiu esperar um mês" : "Acompanhamento resolvido", p_notes: item.note || null, p_sale_id: null, p_next_contact_on: waitMonth ? nextDate : null, p_followup_id: item.sourceId });
      if (error) throw error;
      setMessage(waitMonth ? `${item.customerName} voltará daqui a um mês.` : `${item.customerName} foi removido desta fila.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o acompanhamento."); }
    finally { setBusy(null); }
  }
  return <div className="company-workspace-v2 company-care-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CRM OPERACIONAL</span><h1>Atender e acompanhar</h1><p>Veja quem precisa de atenção e saia de cada contato com a próxima ação definida.</p></div><Link className="company-registry-link" href="/company/clientes"><ContactRound size={17}/> Ficha de Clientes</Link></header>
    <section className="company-workspace-metrics"><article><CalendarClock/><span>Agir agora</span><strong>{counts.today}</strong></article><article><MessageCircle/><span>Aguardando resposta</span><strong>{counts.waiting}</strong></article><article><UsersRound/><span>Pós-vendas ativos</span><strong>{counts.post_sale}</strong></article><article><CheckCircle2/><span>Retornos combinados</span><strong>{counts.follow_up}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div>{filters.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label} · {item.count}</button>)}</div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, cidade ou motivo"/></label></div>{message ? <p className="company-care-feedback">{message}</p> : null}<p className="company-workspace-count">{visible.length} pessoa(s) nesta fila</p>
      <div className="company-care-grid">{visible.map((item) => { const wa = whatsapp(item.phone, item.customerName); const overdue = Boolean(item.dueOn && item.dueOn < today); return <article className="company-care-card" key={item.id}><div className="company-care-avatar"><UserRound/></div><div className="company-care-copy"><div><span className={overdue ? "overdue" : ""}>{overdue ? "Atrasado" : item.dueOn === today ? "Hoje" : item.kind === "waiting" ? "Aguardando" : "Agendado"}</span><small>{item.operation}</small></div><h2>{item.customerName}</h2><strong>{item.title}</strong><p>{item.note}</p><small>{[item.city, item.phone, item.dueOn ? `Próxima ação: ${formatDateOnly(item.dueOn)}` : null].filter(Boolean).join(" · ")}</small></div><div className="company-care-actions">{wa ? <a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a> : null}{item.kind === "follow_up" ? <><button type="button" disabled={busy === item.id} onClick={() => void resolve(item, false)}>{busy === item.id ? <LoaderCircle className="spin" size={15}/> : <CheckCircle2 size={15}/>} Resolvido</button><button type="button" disabled={busy === item.id} onClick={() => void resolve(item, true)}><CalendarClock size={15}/> Retornar em 1 mês</button></> : null}<Link href={item.href}>Abrir acompanhamento →</Link></div></article>; })}</div>
      {visible.length === 0 ? <div className="company-empty-state"><CheckCircle2/><strong>Ninguém nesta fila.</strong><span>Escolha outro filtro para ver os demais acompanhamentos.</span></div> : null}
    </section>
  </div>;
}
