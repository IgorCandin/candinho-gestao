"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ContactRound, History, LoaderCircle, MessageCircle, PhoneOff, Search, ShoppingBag, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type TimelineEntry = { event_at?: string; event_type?: string; operation?: string; title?: string; subtitle?: string | null; amount?: number | null; status?: string | null };
type CareContext = { timeline: TimelineEntry[]; nexusSuggestion: string };
export type CompanyCareItem = { id: string; sourceId: string; customerId: string; customerName: string; phone: string | null; city: string | null; operation: "Suplementos" | "Fitness"; kind: "post_sale" | "follow_up" | "waiting"; dueOn: string | null; title: string; note: string; href: string; recommendedProductId?: string | null; opportunityGroup?: string | null; opportunitySubtype?: string | null };
type Filter = "today" | "waiting" | "post_sale" | "follow_up" | "all";
type Result = "resolved" | "sold" | "wait" | "not_interested" | "no_response" | "lost";

const resultLabels: Record<Result, string> = { resolved: "Atendimento resolvido", sold: "Convertido em venda", wait: "Preferiu esperar um mês", not_interested: "Não quer neste momento", no_response: "Não respondeu", lost: "Perdi o contato" };
function localToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
function inDays(days: number) { const value = new Date(`${localToday()}T12:00:00-03:00`); value.setDate(value.getDate() + days); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function whatsapp(phone: string | null, name: string) { const number = (phone ?? "").replace(/\D/g, ""); return number ? `https://wa.me/${number.startsWith("55") ? number : `55${number}`}?text=${encodeURIComponent(`Olá, ${name}! Tudo bem?`)}` : null; }

export function CompanyCareWorkspace({ items }: { items: CompanyCareItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("today");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responded, setResponded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [contexts, setContexts] = useState<Record<string, CareContext>>({});
  const [contextLoading, setContextLoading] = useState<string | null>(null);
  const today = localToday();
  const counts = useMemo(() => ({ today: items.filter((item) => item.dueOn && item.dueOn <= today).length, waiting: items.filter((item) => item.kind === "waiting").length, post_sale: items.filter((item) => item.kind === "post_sale").length, follow_up: items.filter((item) => item.kind === "follow_up").length }), [items, today]);
  const visible = useMemo(() => items.filter((item) => { const matches = filter === "all" || (filter === "today" ? Boolean(item.dueOn && item.dueOn <= today) : item.kind === filter); const needle = query.trim().toLocaleLowerCase("pt-BR"); return matches && (!needle || `${item.customerName} ${item.title} ${item.note} ${item.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle)); }).sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.customerName.localeCompare(b.customerName, "pt-BR")), [filter, items, query, today]);
  const filters: Array<{ id: Filter; label: string; count: number }> = [{ id: "today", label: "Atender hoje", count: counts.today }, { id: "waiting", label: "Aguardando resposta", count: counts.waiting }, { id: "post_sale", label: "Pós-venda", count: counts.post_sale }, { id: "follow_up", label: "Retornos", count: counts.follow_up }, { id: "all", label: "Todos", count: items.length }];

  async function openCard(item: CompanyCareItem) {
    if (expanded === item.id) { setExpanded(null); setResponded(null); return; }
    setExpanded(item.id); setResponded(null);
    if (contexts[item.customerId]) return;
    setContextLoading(item.id);
    try { const response = await fetch(`/api/company/customers/${item.customerId}/care-context`); const payload = await response.json() as CareContext & { error?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o histórico."); setContexts((current) => ({ ...current, [item.customerId]: payload })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar o histórico."); }
    finally { setContextLoading(null); }
  }

  async function resolve(item: CompanyCareItem, result: Result) {
    setBusy(item.id); setMessage(null);
    try {
      const supabase = createClient();
      const nextDate = ["wait", "not_interested", "no_response"].includes(result) ? inDays(30) : null;
      if (item.kind === "post_sale" && item.operation === "Fitness") {
        const response = nextDate ? await supabase.rpc("reschedule_fitness_post_sale", { p_customer_id: item.customerId, p_due_on: nextDate }) : await supabase.rpc("complete_fitness_post_sale", { p_customer_id: item.customerId, p_outcome: resultLabels[result], p_notes: item.note || null }); if (response.error) throw response.error;
      } else if (item.kind === "post_sale") {
        const response = nextDate ? await supabase.rpc("reschedule_operational_event", { p_source_type: "sale_post_sale", p_source_id: item.sourceId, p_due_at: `${nextDate}T12:00:00-03:00` }) : await supabase.rpc("complete_operational_event", { p_source_type: "sale_post_sale", p_source_id: item.sourceId, p_completed_on: today, p_outcome: resultLabels[result], p_notes: item.note || null, p_payment_method: null }); if (response.error) throw response.error;
      } else if (item.kind === "follow_up") {
        const { error } = await supabase.rpc("register_customer_interaction", { p_customer_id: item.customerId, p_interaction_type: result === "lost" ? "lost" : "contact", p_contact_on: today, p_channel: "WhatsApp", p_outcome: resultLabels[result], p_notes: item.note || null, p_sale_id: null, p_next_contact_on: nextDate, p_followup_id: item.sourceId }); if (error) throw error;
      } else {
        const status = result === "sold" ? "sale_completed" : result === "lost" ? "dismissed" : result === "not_interested" ? "not_interested" : result === "resolved" ? "dismissed" : "later";
        const { error } = await supabase.rpc("record_sales_opportunity_feedback_v1", { p_customer_id: item.customerId, p_recommended_product_id: item.recommendedProductId ?? null, p_opportunity_group: item.opportunityGroup ?? null, p_opportunity_subtype: item.opportunitySubtype ?? null, p_feedback_status: status, p_notes: resultLabels[result], p_next_action_on: nextDate }); if (error) throw error;
      }
      setMessage(nextDate ? `${item.customerName} voltará em ${formatDateOnly(nextDate)}.` : `${item.customerName} foi retirado desta fila.`);
      setExpanded(null); setResponded(null);
      if (result === "sold") router.push("/company/vendas/nova"); else router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o acompanhamento."); }
    finally { setBusy(null); }
  }

  return <div className="company-workspace-v2 company-care-v2">
    <header className="company-workspace-head"><div><span>COMPANY · CRM OPERACIONAL</span><h1>Atender e acompanhar</h1><p>Histórico, orientação e resultado da conversa no mesmo lugar.</p></div><Link className="company-registry-link" href="/company/clientes"><ContactRound size={17}/>Ficha de Clientes</Link></header>
    <section className="company-workspace-metrics"><article><CalendarClock/><span>Agir agora</span><strong>{counts.today}</strong></article><article><MessageCircle/><span>Aguardando resposta</span><strong>{counts.waiting}</strong></article><article><UsersRound/><span>Pós-vendas ativos</span><strong>{counts.post_sale}</strong></article><article><CheckCircle2/><span>Retornos combinados</span><strong>{counts.follow_up}</strong></article></section>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div>{filters.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label} · {item.count}</button>)}</div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, cidade ou motivo"/></label></div>{message ? <p className="company-care-feedback">{message}</p> : null}<p className="company-workspace-count">{visible.length} pessoa(s) nesta fila</p>
      <div className="company-care-grid">{visible.map((item) => { const wa = whatsapp(item.phone, item.customerName); const overdue = Boolean(item.dueOn && item.dueOn < today); const open = expanded === item.id; const context = contexts[item.customerId]; return <article className={`company-care-card ${open ? "is-open" : ""}`} key={item.id}>
        <div className="company-care-avatar"><UserRound/></div><div className="company-care-copy"><div><span className={overdue ? "overdue" : ""}>{overdue ? "Atrasado" : item.dueOn === today ? "Hoje" : item.kind === "waiting" ? "Aguardando" : "Agendado"}</span><small>{item.operation}</small></div><h2>{item.customerName}</h2><strong>{item.title}</strong><p>{item.note}</p><small>{[item.city, item.phone, item.dueOn ? `Próxima ação: ${formatDateOnly(item.dueOn)}` : null].filter(Boolean).join(" · ")}</small></div>
        <div className="company-care-actions">{wa ? <a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15}/>WhatsApp</a> : null}<button type="button" onClick={() => void openCard(item)}>{open ? "Fechar" : "Resolver atendimento"}</button></div>
        {open ? <div className="company-care-inline company-care-console">
          <div className="company-care-context"><div className="company-care-nexus"><Sparkles size={17}/><div><strong>Nexus sugere</strong><span>{context?.nexusSuggestion ?? (contextLoading === item.id ? "Analisando histórico e compras…" : "Carregando orientação…")}</span></div></div><div className="company-care-timeline"><strong><History size={15}/>Histórico recente</strong>{context?.timeline.length ? context.timeline.slice(0, 5).map((entry, index) => <div key={`${entry.event_at}-${index}`}><span>{entry.operation === "fitness" ? "Fitness" : entry.operation === "supplements" ? "Suplementos" : "Company"}</span><div><b>{entry.title ?? "Registro"}</b><small>{entry.event_at ? formatDateOnly(entry.event_at.slice(0, 10)) : ""}{entry.subtitle ? ` · ${entry.subtitle}` : ""}</small></div>{entry.amount ? <em>{formatCurrency(entry.amount)}</em> : null}</div>) : <small>{contextLoading === item.id ? "Buscando registros…" : "Nenhuma movimentação recente."}</small>}</div></div>
          <div className="company-care-resolution"><strong>Como terminou?</strong>{responded === item.id ? <><span>Respondeu — escolha o resultado:</span><div className="company-care-inline-actions"><button disabled={busy === item.id} onClick={() => void resolve(item, "sold")}><ShoppingBag size={15}/>Vendeu</button><button disabled={busy === item.id} onClick={() => void resolve(item, "wait")}><CalendarClock size={15}/>Preferiu esperar</button><button disabled={busy === item.id} onClick={() => void resolve(item, "not_interested")}><PhoneOff size={15}/>Não quer</button><button disabled={busy === item.id} onClick={() => void resolve(item, "resolved")}><CheckCircle2 size={15}/>Resolvido</button><button className="quiet" onClick={() => setResponded(null)}>Voltar</button></div></> : <div className="company-care-inline-actions"><button disabled={busy === item.id} onClick={() => setResponded(item.id)}><CheckCircle2 size={15}/>Respondeu</button><button disabled={busy === item.id} onClick={() => void resolve(item, "no_response")}><MessageCircle size={15}/>Não respondeu</button><button disabled={busy === item.id} onClick={() => void resolve(item, "resolved")}><CheckCircle2 size={15}/>Resolvido</button><button disabled={busy === item.id} onClick={() => void resolve(item, "lost")}><PhoneOff size={15}/>Perdi contato</button></div>}{busy === item.id ? <span><LoaderCircle className="spin" size={15}/>Salvando resultado…</span> : null}<Link href={`/company/clientes/${item.customerId}`}>Ver ficha completa</Link></div>
        </div> : null}
      </article>; })}</div>
      {visible.length === 0 ? <div className="company-empty-state"><CheckCircle2/><strong>Ninguém nesta fila.</strong><span>Escolha outro filtro para ver os demais acompanhamentos.</span></div> : null}
    </section>
  </div>;
}
