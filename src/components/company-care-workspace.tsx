"use client";

import Link from "next/link";
import type { FitnessContactState } from "@/lib/fitness-opportunity-contact";
import { FitnessOpportunityContactActions } from "@/components/fitness-opportunity-contact-actions";
import { CalendarClock, CheckCircle2, ContactRound, History, LoaderCircle, MessageCircle, PackageMinus, PhoneOff, Radar, Search, ShoppingBag, X, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { careContactKey, careGuidance } from "@/lib/company-care-guidance";
import "./company-completion-filters.css";
import "./company-care-workspace.css";
import { notifyCompanyWorkflowUpdated } from "@/components/company-workflow-sync";

type TimelineEntry = { event_at?: string; event_type?: string; operation?: string; title?: string; subtitle?: string | null; amount?: number | null; status?: string | null };
type CareContext = { timeline: TimelineEntry[]; nexusSuggestion: string };
export type CompanyCareItem = { id: string; sourceId: string; customerId: string; customerName: string; phone: string | null; city: string | null; operation: "Suplementos" | "Fitness"; kind: "post_sale" | "follow_up" | "waiting"; dueOn: string | null; title: string; note: string; href: string; recommendedProductId?: string | null; opportunityGroup?: string | null; opportunitySubtype?: string | null; fitnessContact?: FitnessContactState };
type Filter = "today" | "waiting" | "post_sale" | "follow_up" | "all";
type Result = "resolved" | "sold" | "wait" | "not_interested" | "no_response" | "lost";

const resultLabels: Record<Result, string> = { resolved: "Atendimento resolvido", sold: "Convertido em venda", wait: "Preferiu esperar um mês", not_interested: "Não quer neste momento", no_response: "Não respondeu", lost: "Perdi o contato" };
function localToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
function inDays(days: number) { const value = new Date(`${localToday()}T12:00:00-03:00`); value.setDate(value.getDate() + days); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function whatsapp(phone: string | null, name: string) { const number = (phone ?? "").replace(/\D/g, ""); return number ? `https://wa.me/${number.startsWith("55") ? number : `55${number}`}?text=${encodeURIComponent(`Olá, ${name}! Tudo bem?`)}` : null; }

export function CompanyCareWorkspace({ items, canWriteFitness = false, initialFilter = "today", initialOperation = "all" }: { items: CompanyCareItem[]; canWriteFitness?: boolean; initialFilter?: Filter; initialOperation?: "all" | "Suplementos" | "Fitness" }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [operation, setOperation] = useState(initialOperation);
  const scopedItems = useMemo(() => items.filter(item => operation === "all" || item.operation === operation), [items, operation]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responded, setResponded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [contexts, setContexts] = useState<Record<string, CareContext>>({});
  const [contextLoading, setContextLoading] = useState<string | null>(null);
  const today = localToday();
  const counts = useMemo(() => {
    const people = (match: (item: CompanyCareItem) => boolean) => new Set(scopedItems.filter(match).map(careContactKey)).size;
    return { today: people((item) => Boolean(item.dueOn && item.dueOn <= today)), waiting: people((item) => item.kind === "waiting"), post_sale: people((item) => item.kind === "post_sale"), follow_up: people((item) => item.kind === "follow_up"), all: people(() => true) };
  }, [scopedItems, today]);
  const visible = useMemo(() => scopedItems.filter((item) => { const matches = filter === "all" || (filter === "today" ? Boolean(item.dueOn && item.dueOn <= today) : item.kind === filter); const needle = query.trim().toLocaleLowerCase("pt-BR"); return matches && (!needle || `${item.customerName} ${item.title} ${item.note} ${item.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle)); }).sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.customerName.localeCompare(b.customerName, "pt-BR")), [filter, scopedItems, query, today]);
  const grouped = useMemo(() => {
    const people = new Map<string, CompanyCareItem[]>();
    for (const item of visible) {
      const group = people.get(careContactKey(item));
      if (group) group.push(item); else people.set(careContactKey(item), [item]);
    }
    return Array.from(people.values());
  }, [visible]);
  const filters: Array<{ id: Filter; label: string; count: number }> = [{ id: "today", label: "Atender hoje", count: counts.today }, { id: "waiting", label: "Aguardando resposta", count: counts.waiting }, { id: "post_sale", label: "Pós-venda", count: counts.post_sale }, { id: "follow_up", label: "Retornos", count: counts.follow_up }, { id: "all", label: "Todos", count: counts.all }];

  async function openCard(item: CompanyCareItem) {
    if (expanded === item.id) { setExpanded(null); setResponded(null); return; }
    setExpanded(item.id); setResponded(null);
    if (item.fitnessContact || contexts[item.customerId]) return;
    setContextLoading(item.id);
    try { const response = await fetch(`/api/company/customers/${item.customerId}/care-context`); const payload = await response.json() as CareContext & { error?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o histórico."); setContexts((current) => ({ ...current, [item.customerId]: payload })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar o histórico."); }
    finally { setContextLoading(null); }
  }

  async function resolve(item: CompanyCareItem, result: Result) {
    if (result === "sold") { router.push(`/company/vendas/nova/${item.operation === "Fitness" ? "fitness" : "suplementos"}?cliente=${encodeURIComponent(item.customerId)}`); return; }
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
        const status = result === "lost" ? "dismissed" : result === "not_interested" ? "not_interested" : result === "resolved" ? "dismissed" : "later";
        const { error } = await supabase.rpc("record_sales_opportunity_feedback_v1", { p_customer_id: item.customerId, p_recommended_product_id: item.recommendedProductId ?? null, p_opportunity_group: item.opportunityGroup ?? null, p_opportunity_subtype: item.opportunitySubtype ?? null, p_feedback_status: status, p_notes: resultLabels[result], p_next_action_on: nextDate }); if (error) throw error;
      }
      notifyCompanyWorkflowUpdated();
      setMessage(nextDate ? `${item.customerName} voltará em ${formatDateOnly(nextDate)}.` : `${item.customerName} foi retirado desta fila.`);
      setExpanded(null); setResponded(null);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o acompanhamento."); }
    finally { setBusy(null); }
  }

  return <div className="company-workspace-v2 company-care-v2 company-care-workspace company-queue-workspace">
    <header className="company-workspace-head"><div><span>COMPANY · CRM OPERACIONAL</span><h1>Atender e acompanhar</h1><p>Histórico, orientação e resultado da conversa no mesmo lugar.</p></div><div className="company-registry-create"><Link href="/company/clientes"><ContactRound size={17}/>Ficha de Clientes</Link><Link href="/company/clientes/radar"><Radar size={17}/>Radar comercial</Link><Link href="/company/acoes-comerciais"><PackageMinus size={17}/>Ações comerciais</Link></div></header>
    <section className="company-workspace-metrics" aria-label={`Resumo: ${operation === "all" ? "todas as operações" : operation}`}><article><CalendarClock/><span>Agir agora</span><strong>{counts.today}</strong></article><article><MessageCircle/><span>Aguardando resposta</span><strong>{counts.waiting}</strong></article><article><UsersRound/><span>Pós-vendas ativos</span><strong>{counts.post_sale}</strong></article><article><CheckCircle2/><span>Retornos combinados</span><strong>{counts.follow_up}</strong></article></section>
    <section className="company-workspace-panel"><div className="completion-filters">
        <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all", "Suplementos", "Fitness"] as const).map(value => <button type="button" key={value} aria-pressed={operation === value} onClick={() => { setOperation(value); setExpanded(null); setResponded(null); }}><span>{value === "all" ? "Todas" : value}</span><span className="completion-filter-count">{new Set(items.filter(item => value === "all" || item.operation === value).map(careContactKey)).size}</span></button>)}</div></fieldset>
        <label className="completion-search"><span>Buscar atendimento</span><div><Search size={18} aria-hidden="true"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cliente, cidade ou motivo"/>{query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={17}/></button>}</div></label>
        <fieldset className="completion-status"><legend>Qual atendimento precisa de atenção?</legend><div className="completion-segments">{filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setExpanded(null); setResponded(null); }}><span>{item.label}</span><span className="completion-filter-count">{item.count}</span></button>)}</div></fieldset>
      </div>{message ? <p className="company-care-feedback" role="status">{message}</p> : null}
      <div className="completion-filter-result"><p className="company-workspace-count" role="status" aria-live="polite">{grouped.length} contato(s) por operação · {visible.length} assunto(s){operation !== "all" ? ` · ${operation}` : ""}</p>{(operation !== "all" || filter !== "all" || query) && <button type="button" onClick={() => { setOperation("all"); setFilter("all"); setQuery(""); setExpanded(null); setResponded(null); }}>Limpar filtros</button>}</div>
      <div className="company-care-grid">{grouped.map((personItems) => { const person = personItems[0]; const wa = whatsapp(person.phone, person.customerName); return <article className="company-care-person" key={careContactKey(person)}><div className="company-care-person-head"><div className="company-care-avatar"><UserRound/></div><div><h2>{person.customerName}</h2><span className="care-operation-label">{person.operation}</span><small>{[person.city, person.phone].filter(Boolean).join(" · ")}</small></div>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/>WhatsApp</a> : <Link className="care-missing-phone" href={`/company/clientes/telefones?operacao=${person.operation}`}>Adicionar telefone</Link>}</div><p>{personItems.length} assunto(s) neste contato</p>{personItems.map((item) => { const overdue = Boolean(item.dueOn && item.dueOn < today); const open = expanded === item.id; const context = contexts[item.customerId]; const guidance = item.fitnessContact ? { instruction: item.fitnessContact.status === "responded" ? "Continue o atendimento ou combine a próxima data de retorno." : "Confira a resposta e registre o próximo contato na data combinada.", openLabel: "Atualizar contato Fitness", completeLabel: "Atualizar contato" } : careGuidance(item.kind); return <div className={`company-care-card ${open ? "is-open" : ""}`} key={item.id}>
        <div className="company-care-copy"><div><span className={overdue ? "overdue" : ""}>{overdue ? "Atrasado" : item.dueOn === today ? "Hoje" : !item.dueOn ? "Sem data combinada" : "Programado"}</span><small>{item.operation}</small></div><strong>{item.title}</strong><p>{item.note}</p><small>{item.dueOn ? `Data do contato: ${formatDateOnly(item.dueOn)}` : "Combine uma data para o próximo contato."}</small><div className="care-next-action"><span>O que fazer</span><p>{guidance.instruction}</p></div></div>
        <div className="company-care-actions"><button type="button" aria-expanded={open} aria-controls={`care-actions-${item.id}`} onClick={() => void openCard(item)}>{open ? "Fechar atendimento" : guidance.openLabel}</button></div>
        {open ? <div id={`care-actions-${item.id}`} className="company-care-inline company-care-console">
          {item.fitnessContact ? <div className="company-care-resolution"><FitnessOpportunityContactActions customerId={item.customerId} contact={item.fitnessContact} canWrite={canWriteFitness} today={today} onSaved={() => { setExpanded(null); setMessage(`Contato de ${item.customerName} atualizado.`); }}/><Link href={`/company/vendas/nova/fitness?cliente=${encodeURIComponent(item.customerId)}`}>Preparar venda</Link></div> : <><div className="company-care-resolution"><strong>Registre o resultado da conversa</strong><p>Preparar venda abre o atendimento com o cliente selecionado. O contato só é concluído pelas ações de resultado.</p>{responded === item.id ? <><span>Respondeu — escolha o resultado:</span><div className="company-care-inline-actions"><button disabled={busy === item.id} onClick={() => void resolve(item, "sold")}><ShoppingBag size={15}/>Preparar venda</button><button disabled={busy === item.id} onClick={() => void resolve(item, "wait")}><CalendarClock size={15}/>Esperar · retornar em 30 dias</button><button disabled={busy === item.id} onClick={() => void resolve(item, "not_interested")}><PhoneOff size={15}/>Não quer agora · retornar em 30 dias</button><button disabled={busy === item.id} onClick={() => void resolve(item, "resolved")}><CheckCircle2 size={15}/>{guidance.completeLabel}</button><button className="quiet" onClick={() => setResponded(null)}>Voltar</button></div></> : <div className="company-care-inline-actions"><button disabled={busy === item.id} onClick={() => setResponded(item.id)}><CheckCircle2 size={15}/>Respondeu · escolher resultado</button><button disabled={busy === item.id} onClick={() => void resolve(item, "no_response")}><MessageCircle size={15}/>Não respondeu · retornar em 30 dias</button><button disabled={busy === item.id} onClick={() => void resolve(item, "resolved")}><CheckCircle2 size={15}/>{guidance.completeLabel}</button><button disabled={busy === item.id} onClick={() => void resolve(item, "lost")}><PhoneOff size={15}/>Encerrar por perda de contato</button></div>}{busy === item.id ? <span><LoaderCircle className="spin" size={15}/>Salvando resultado…</span> : null}<Link href={item.operation === "Fitness" ? `/company/clientes/fitness/${item.customerId}` : `/company/clientes/${item.customerId}`}>Ver ficha completa</Link></div>
          <details className="care-history"><summary><History size={15}/>Consultar orientação e histórico</summary><div className="company-care-context"><div className="company-care-nexus"><Sparkles size={17}/><div><strong>Nexus sugere</strong><span>{context?.nexusSuggestion ?? (contextLoading === item.id ? "Analisando histórico e compras…" : "Orientação indisponível neste momento.")}</span></div></div><div className="company-care-timeline"><strong><History size={15}/>Histórico recente</strong>{context?.timeline.length ? context.timeline.slice(0, 5).map((entry, index) => <div key={`${entry.event_at}-${index}`}><span>{entry.operation === "fitness" ? "Fitness" : entry.operation === "supplements" ? "Suplementos" : "Company"}</span><div><b>{entry.title ?? "Registro"}</b><small>{entry.event_at ? formatDateOnly(entry.event_at.slice(0, 10)) : ""}{entry.subtitle ? ` · ${entry.subtitle}` : ""}</small></div>{entry.amount ? <em>{formatCurrency(entry.amount)}</em> : null}</div>) : <small>{contextLoading === item.id ? "Buscando registros…" : context ? "Nenhuma movimentação recente." : "Histórico indisponível neste momento."}</small>}</div></div>
          </details></>}
        </div> : null}
      </div>; })}</article>; })}</div>
      {visible.length === 0 ? <div className="company-empty-state"><CheckCircle2/><strong>Ninguém nesta fila.</strong><span>Escolha outro filtro para ver os demais acompanhamentos.</span></div> : null}
    </section>
  </div>;
}
