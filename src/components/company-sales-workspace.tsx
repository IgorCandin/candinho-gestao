/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, ContactRound, FileText, Flame, MessageCircle, PackageSearch, Repeat2, Search, ShoppingBag, Sparkles, UserRoundPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CompanySalesQueueActions } from "@/components/company-sales-queue-actions";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import type { LeadRow } from "@/lib/types";
import type { FitnessCustomerRow } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Queue = "today" | "repurchase" | "leads" | "complementary" | "fitness";
type ProductMedia = Record<string, { photo1: string | null; photo2: string | null }>;

const QUEUES: Array<{ key: Queue; label: string; icon: typeof Flame }> = [
  { key: "today", label: "Falar agora", icon: Flame },
  { key: "repurchase", label: "Recompras", icon: Repeat2 },
  { key: "leads", label: "Leads quentes", icon: ContactRound },
  { key: "complementary", label: "Complementares", icon: Sparkles },
  { key: "fitness", label: "Fitness", icon: ShoppingBag },
];

const LEAD_RANK: Record<string, number> = {
  "Ta quase comprando": 1,
  "Decidindo": 2,
  "Cotação": 3,
  "Esperando receber": 4,
  "Esperando pedido de fornecedor": 5,
  "Perguntou sobre": 6,
  "Aguardando": 7,
};

function whatsappHref(phone: string | null, message: string) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function daysSince(date: string, today: string) {
  return Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
}

function ProductVisual({ name, media }: { name: string; media?: { photo1: string | null; photo2: string | null } }) {
  const photo = media?.photo1 ?? null;
  if (!photo) return null;
  return (
    <div className="company-product-visual" tabIndex={0} aria-label={`Ampliar foto de ${name}`}>
      <img className="company-product-thumbnail" src={photo} alt={`Foto de ${name}`} />
      <div className="company-product-popup" aria-hidden="true"><img src={photo} alt="" /></div>
    </div>
  );
}

function OpportunityCard({ row, relatedRows = [row], featured = false, media }: { row: SalesOpportunity; relatedRows?: SalesOpportunity[]; featured?: boolean; media?: { photo1: string | null; photo2: string | null } }) {
  return (
    <article className={`company-sale-card ${featured ? "featured" : ""}`}>
      <header>
        <span className={`company-priority priority-${featured ? "alta" : "media"}`}>{featured ? row.last_feedback_status === "contacted" ? "Conferir resposta" : "Produto acabando" : row.last_feedback_status === "product_ended" ? "Confirmado pelo cliente" : "Prazo estimado"}</span>
        {!featured ? <span className="company-sale-score">Estimativa antiga: {row.priority.toLocaleLowerCase("pt-BR")}</span> : null}
      </header>
      <div className="company-sale-person">
        <div><strong>{row.customer_name}</strong><small>{[row.city, row.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div>
        <Link href={`/company/clientes/${row.customer_id}`} aria-label={`Abrir ficha Company de ${row.customer_name}`}><ArrowRight size={17} /></Link>
      </div>
      <div className="company-sale-offer">
        <PackageSearch size={18} />
        <div><span>O que oferecer</span><strong>{row.recommended_product_name || "Definir pela ficha"}</strong>{row.recommended_product_price != null ? <small>{formatCurrency(Number(row.recommended_product_price))}</small> : null}</div>
        <ProductVisual name={row.recommended_product_name || "produto indicado"} media={media} />
      </div>
      {relatedRows.length > 1 ? <div className="company-sale-more-offers"><span>{relatedRows.length} oportunidades reunidas</span>{relatedRows.slice(1).map((item) => <small key={`${item.opportunity_group}-${item.recommended_product_id ?? item.opportunity_subtype}`}>+ {item.recommended_product_name || item.opportunity_subtype.replaceAll("_", " ")}</small>)}</div> : null}
      <p>{row.reason}</p>
      <CompanySalesQueueActions opportunity={row} />
    </article>
  );
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const whatsapp = whatsappHref(lead.phone, `Olá, ${lead.customer_name}! Tudo bem? Estou retornando sobre ${lead.product_summary || "seu interesse"}.`);
  return (
    <article className="company-sale-card lead-card">
      <header><span className="company-priority priority-media">{lead.lead_status || "Lead"}</span><span className="company-sale-score">{formatDateOnly(lead.lead_date)}</span></header>
      <div className="company-sale-person"><div><strong>{lead.customer_name}</strong><small>{[lead.city, lead.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/company/leads/${lead.id}`}><ArrowRight size={17} /></Link></div>
      <div className="company-sale-offer"><PackageSearch size={18} /><div><span>Interesse registrado</span><strong>{lead.product_summary || "Produto não informado"}</strong></div></div>
      {lead.notes ? <p>{lead.notes}</p> : <p>Abra o lead, confirme a necessidade e deixe a próxima ação marcada.</p>}
      <div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp}><MessageCircle size={15} /> WhatsApp</a> : null}<Link href={`/company/leads/${lead.id}`}><ContactRound size={15} /> Abrir lead</Link><Link href={`/company/vendas/nova/suplementos?${new URLSearchParams({ ...(lead.customer_id ? { cliente: lead.customer_id } : {}), ...(lead.primary_product_id ? { produto: lead.primary_product_id } : {}), lead: lead.id }).toString()}`}><ShoppingBag size={15}/> Converter em venda</Link></div>
    </article>
  );
}

function FitnessOpportunityCard({ customer }: { customer: FitnessCustomerRow }) {
  const whatsapp = whatsappHref(customer.phone, `Olá, ${customer.name}! Tudo bem? Chegaram novidades da Candinho Fitness e lembrei de você.`);
  return <article className="company-sale-card lead-card"><header><span className="company-priority priority-media">Fitness</span><span className="company-sale-score">{customer.classification}</span></header><div className="company-sale-person"><div><strong>{customer.name}</strong><small>{[customer.city, customer.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/company/clientes/fitness/${customer.id}`}><ArrowRight size={17}/></Link></div><div className="company-sale-offer"><ShoppingBag size={18}/><div><span>Oportunidade Fitness</span><strong>{customer.total_purchases ? `Reativar após ${customer.days_without_purchase ?? 0} dias` : "Primeira compra"}</strong><small>{customer.total_purchases} compra(s) · {formatCurrency(customer.total_spent)}</small></div></div><p>{customer.total_purchases ? "Revise os tamanhos e produtos anteriores antes de sugerir uma nova peça." : "Cliente cadastrado ainda sem compra Fitness."}</p><div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp}><MessageCircle size={15}/> WhatsApp</a> : null}<Link href={`/company/clientes/fitness/${customer.id}`}><ContactRound size={15}/> Abrir ficha</Link></div></article>;
}

export function CompanySalesWorkspace({ opportunities, leads, fitnessCustomers, productMedia, blockedCustomerIds }: { opportunities: SalesOpportunity[]; leads: LeadRow[]; fitnessCustomers: FitnessCustomerRow[]; productMedia: ProductMedia; blockedCustomerIds: string[] }) {
  const [queue, setQueue] = useState<Queue>("today");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(24);
  const queueSectionRef = useRef<HTMLElement | null>(null);
  function openQueue(nextQueue: Queue) { setQueue(nextQueue); setShown(24); window.setTimeout(() => queueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }
  const hotLeads = useMemo(() => leads.filter((lead) => lead.general_status === "pending").sort((a, b) => (LEAD_RANK[a.lead_status ?? ""] ?? 99) - (LEAD_RANK[b.lead_status ?? ""] ?? 99) || b.lead_date.localeCompare(a.lead_date)), [leads]);
  const blockedPeople = useMemo(() => new Set(blockedCustomerIds), [blockedCustomerIds]);
  const today = brazilToday();
  const todayCandidates = useMemo(() => {
    const people = new Set<string>();
    const candidates: Array<{ kind: "lead"; lead: LeadRow } | { kind: "opportunity"; row: SalesOpportunity }> = [];
    const personKey = (id: string | null, name: string, phone: string | null) => id ?? `${name.toLocaleLowerCase("pt-BR")}:${phone ?? ""}`;
    // A fresh, active lead is stronger evidence than a theoretical consumption date.
    for (const lead of hotLeads) {
      if ((LEAD_RANK[lead.lead_status ?? ""] ?? 99) > 3 || daysSince(lead.lead_date, today) > 30) continue;
      if (lead.customer_id && blockedPeople.has(lead.customer_id)) continue;
      const key = personKey(lead.customer_id, lead.customer_name, lead.phone);
      if (people.has(key)) continue;
      people.add(key);
      candidates.push({ kind: "lead", lead });
    }
    for (const row of [...opportunities].sort((a, b) => Number(b.last_feedback_status === "product_ended") - Number(a.last_feedback_status === "product_ended") || b.opportunity_score - a.opportunity_score)) {
      if (blockedPeople.has(row.customer_id)) continue;
      const confirmedEnd = row.last_feedback_status === "product_ended";
      const responseDue = row.last_feedback_status === "contacted" && Boolean(row.feedback_next_action_on && row.feedback_next_action_on <= today);
      if (!confirmedEnd && !responseDue) continue;
      const key = personKey(row.customer_id, row.customer_name, row.phone);
      if (people.has(key)) continue;
      people.add(key);
      candidates.push({ kind: "opportunity", row });
    }
    return candidates.slice(0, 10);
  }, [blockedPeople, hotLeads, opportunities, today]);
  const rows = useMemo(() => {
    const source = queue === "repurchase" ? opportunities.filter((row) => row.opportunity_group === "recompra") : queue === "complementary" ? opportunities.filter((row) => row.opportunity_group === "produto_complementar") : [];
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return source;
    return source.filter((row) => [row.customer_name, row.city, row.phone, row.recommended_product_name, row.reason].some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle)));
  }, [opportunities, query, queue]);
  const groupedRows = useMemo(() => {
    const groups = new Map<string, SalesOpportunity[]>();
    for (const row of rows) (groups.get(row.customer_id) ?? (groups.set(row.customer_id, []), groups.get(row.customer_id)!)).push(row);
    return [...groups.values()];
  }, [rows]);
  const visibleLeads = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return needle ? hotLeads.filter((lead) => [lead.customer_name, lead.city, lead.phone, lead.product_summary, lead.lead_status].some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle))) : hotLeads;
  }, [hotLeads, query]);
  const visibleFitness = useMemo(() => fitnessCustomers.filter((customer) => customer.active && customer.total_purchases > 0 && (customer.days_without_purchase ?? 0) >= 45).filter((customer) => { const needle = query.trim().toLocaleLowerCase("pt-BR"); return !needle || [customer.name, customer.city, customer.phone].some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle)); }).sort((a, b) => (b.days_without_purchase ?? 0) - (a.days_without_purchase ?? 0)), [fitnessCustomers, query]);
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const visibleToday = todayCandidates.filter((item) => {
    if (!needle) return true;
    const values = item.kind === "lead" ? [item.lead.customer_name, item.lead.product_summary, item.lead.city] : [item.row.customer_name, item.row.recommended_product_name, item.row.city];
    return values.some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle));
  });
  const featured = todayCandidates[0] ?? null;
  const repurchases = opportunities.filter((row) => row.opportunity_group === "recompra").length;
  const complementary = opportunities.filter((row) => row.opportunity_group === "produto_complementar").length;
  const totalRows = queue === "today" ? visibleToday.length : queue === "leads" ? visibleLeads.length : queue === "fitness" ? visibleFitness.length : groupedRows.length;

  return (
    <div className="company-sales-v2">
      <header className="company-sales-head">
        <div><span>Company · Comercial</span><h1>Vender agora</h1><p>Falar agora mostra até 10 pessoas com sinal concreto. Recompras por prazo ficam na aba de consulta, sem virar urgência automaticamente.</p></div>
        <div><Link href="/company/leads/novo" className="button ghost"><UserRoundPlus size={16} /> Novo lead</Link><Link href="/company/orcamentos" className="button ghost"><FileText size={16} /> Orçamentos</Link><Link href="/company/vendas/nova" className="button company-blue"><Sparkles size={16} /> Nova venda</Link></div>
      </header>

      <section className="company-sales-metrics">
        <button type="button" onClick={() => openQueue("today")}><Flame size={18} /><span>Falar agora</span><strong>{todayCandidates.length}</strong></button>
        <button type="button" onClick={() => openQueue("repurchase")}><Repeat2 size={18} /><span>Recompras</span><strong>{repurchases}</strong></button>
        <button type="button" onClick={() => openQueue("leads")}><ContactRound size={18} /><span>Leads abertos</span><strong>{hotLeads.length}</strong></button>
        <button type="button" onClick={() => openQueue("complementary")}><Sparkles size={18} /><span>Complementares</span><strong>{complementary}</strong></button>
        <button type="button" onClick={() => openQueue("fitness")}><ShoppingBag size={18}/><span>Fitness</span><strong>{visibleFitness.length}</strong></button>
      </section>

      {featured ? <section className="company-sales-feature"><div><span><Flame size={14} /> Comece por aqui</span><h2>{featured.kind === "lead" ? featured.lead.customer_name : featured.row.customer_name}</h2><p>{featured.kind === "lead" ? "Interesse recente registrado. Confira o lead antes de chamar." : featured.row.last_feedback_status === "contacted" ? "Verifique se respondeu ao contato anterior antes de enviar outra mensagem." : "Cliente informou que o produto acabou. Confirme se ainda precisa comprar."}</p></div></section> : null}

      <section className="company-sales-queue" ref={queueSectionRef}>
        <div className="company-sales-toolbar">
          <div className="company-sales-tabs">{QUEUES.map(({ key, label, icon: Icon }) => <button type="button" className={queue === key ? "active" : ""} onClick={() => openQueue(key)} key={key}><Icon size={15} />{label}</button>)}</div>
          <label><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setShown(24); }} placeholder="Buscar cliente ou produto" /></label>
        </div>
        <div className="company-sales-count"><CalendarClock size={15} /><span>{totalRows} pessoa(s) nesta fila</span><small>Conclua uma ação por vez</small></div>
        <div className="company-sales-grid">
          {queue === "today" ? visibleToday.map((item) => item.kind === "lead" ? <LeadCard lead={item.lead} key={`lead-${item.lead.id}`} /> : <OpportunityCard row={item.row} relatedRows={opportunities.filter((row) => row.customer_id === item.row.customer_id)} featured media={item.row.recommended_product_id ? productMedia[item.row.recommended_product_id] : undefined} key={`opportunity-${item.row.customer_id}`} />) : queue === "leads" ? visibleLeads.slice(0, shown).map((lead) => <LeadCard lead={lead} key={`${lead.id}-${lead.item_id ?? "lead"}`} />) : queue === "fitness" ? visibleFitness.slice(0, shown).map((customer) => <FitnessOpportunityCard customer={customer} key={customer.id}/>) : groupedRows.slice(0, shown).map((group) => <OpportunityCard row={group[0]} relatedRows={group} media={group[0].recommended_product_id ? productMedia[group[0].recommended_product_id] : undefined} key={group[0].customer_id} />)}
        </div>
        {queue !== "today" && totalRows > shown ? <button className="button ghost company-sales-more" type="button" onClick={() => setShown((current) => current + 24)}>Mostrar mais 24 pessoas</button> : null}
        {totalRows === 0 ? <div className="company-empty-state"><PackageSearch size={25} /><strong>Nenhuma oportunidade encontrada</strong><span>Troque a fila ou ajuste a busca.</span></div> : null}
      </section>
    </div>
  );
}
