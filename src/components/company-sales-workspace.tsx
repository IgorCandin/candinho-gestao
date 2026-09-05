/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, ContactRound, FileText, Flame, MessageCircle, PackageSearch, Repeat2, Search, ShoppingBag, Sparkles, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
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
        <span className={`company-priority priority-${row.priority.toLocaleLowerCase("pt-BR").replace("é", "e")}`}>{row.priority}</span>
        <span className="company-sale-score">{row.opportunity_score} pontos</span>
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
      <CompanySalesQueueActions opportunity={row} relatedOpportunities={relatedRows} />
    </article>
  );
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const whatsapp = whatsappHref(lead.phone, `Olá, ${lead.customer_name}! Tudo bem? Estou retornando sobre ${lead.product_summary || "seu interesse"}.`);
  return (
    <article className="company-sale-card lead-card">
      <header><span className="company-priority priority-media">{lead.lead_status || "Lead"}</span><span className="company-sale-score">{formatDateOnly(lead.lead_date)}</span></header>
      <div className="company-sale-person"><div><strong>{lead.customer_name}</strong><small>{[lead.city, lead.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/leads/${lead.id}`}><ArrowRight size={17} /></Link></div>
      <div className="company-sale-offer"><PackageSearch size={18} /><div><span>Interesse registrado</span><strong>{lead.product_summary || "Produto não informado"}</strong></div></div>
      {lead.notes ? <p>{lead.notes}</p> : <p>Abra o lead, confirme a necessidade e deixe a próxima ação marcada.</p>}
      <div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a> : null}<Link href={`/leads/${lead.id}`}><ContactRound size={15} /> Abrir lead</Link></div>
    </article>
  );
}

function FitnessOpportunityCard({ customer }: { customer: FitnessCustomerRow }) {
  const whatsapp = whatsappHref(customer.phone, `Olá, ${customer.name}! Tudo bem? Chegaram novidades da Candinho Fitness e lembrei de você.`);
  return <article className="company-sale-card lead-card"><header><span className="company-priority priority-media">Fitness</span><span className="company-sale-score">{customer.classification}</span></header><div className="company-sale-person"><div><strong>{customer.name}</strong><small>{[customer.city, customer.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/company/clientes/fitness/${customer.id}`}><ArrowRight size={17}/></Link></div><div className="company-sale-offer"><ShoppingBag size={18}/><div><span>Oportunidade Fitness</span><strong>{customer.total_purchases ? `Reativar após ${customer.days_without_purchase ?? 0} dias` : "Primeira compra"}</strong><small>{customer.total_purchases} compra(s) · {formatCurrency(customer.total_spent)}</small></div></div><p>{customer.total_purchases ? "Revise os tamanhos e produtos anteriores antes de sugerir uma nova peça." : "Cliente cadastrado ainda sem compra Fitness."}</p><div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp}><MessageCircle size={15}/> WhatsApp</a> : null}<Link href={`/company/clientes/fitness/${customer.id}`}><ContactRound size={15}/> Abrir ficha</Link></div></article>;
}

export function CompanySalesWorkspace({ opportunities, priorityCustomers, leads, fitnessCustomers, productMedia }: { opportunities: SalesOpportunity[]; priorityCustomers: SalesOpportunity[]; leads: LeadRow[]; fitnessCustomers: FitnessCustomerRow[]; productMedia: ProductMedia }) {
  const [queue, setQueue] = useState<Queue>("today");
  const [query, setQuery] = useState("");
  const hotLeads = useMemo(() => leads.filter((lead) => lead.general_status === "pending").sort((a, b) => (LEAD_RANK[a.lead_status ?? ""] ?? 99) - (LEAD_RANK[b.lead_status ?? ""] ?? 99) || b.lead_date.localeCompare(a.lead_date)), [leads]);
  const rows = useMemo(() => {
    const source = queue === "today" ? priorityCustomers : queue === "repurchase" ? opportunities.filter((row) => row.opportunity_group === "recompra") : queue === "complementary" ? opportunities.filter((row) => row.opportunity_group === "produto_complementar") : [];
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return source;
    return source.filter((row) => [row.customer_name, row.city, row.phone, row.recommended_product_name, row.reason].some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle)));
  }, [opportunities, priorityCustomers, query, queue]);
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
  const featured = priorityCustomers[0] ?? null;
  const repurchases = opportunities.filter((row) => row.opportunity_group === "recompra").length;
  const complementary = opportunities.filter((row) => row.opportunity_group === "produto_complementar").length;

  return (
    <div className="company-sales-v2">
      <header className="company-sales-head">
        <div><span>Company · Comercial</span><h1>Vender agora</h1><p>Uma fila de execução: escolha uma pessoa, faça o contato e registre o resultado antes de seguir.</p></div>
        <div><Link href="/leads/novo" className="button ghost"><UserRoundPlus size={16} /> Novo lead</Link><Link href="/company/orcamentos" className="button ghost"><FileText size={16} /> Orçamentos</Link><Link href="/company/vendas/nova" className="button company-blue"><Sparkles size={16} /> Nova venda</Link></div>
      </header>

      <section className="company-sales-metrics">
        <button type="button" onClick={() => setQueue("today")}><Flame size={18} /><span>Falar agora</span><strong>{priorityCustomers.length}</strong></button>
        <button type="button" onClick={() => setQueue("repurchase")}><Repeat2 size={18} /><span>Recompras</span><strong>{repurchases}</strong></button>
        <button type="button" onClick={() => setQueue("leads")}><ContactRound size={18} /><span>Leads abertos</span><strong>{hotLeads.length}</strong></button>
        <button type="button" onClick={() => setQueue("complementary")}><Sparkles size={18} /><span>Complementares</span><strong>{complementary}</strong></button>
        <button type="button" onClick={() => setQueue("fitness")}><ShoppingBag size={18}/><span>Fitness</span><strong>{visibleFitness.length}</strong></button>
      </section>

      {featured ? <section className="company-sales-feature"><div><span><Flame size={14} /> Comece por aqui</span><h2>{featured.customer_name} é a oportunidade mais forte agora</h2><p>{featured.recommended_action}</p></div><OpportunityCard row={featured} featured media={featured.recommended_product_id ? productMedia[featured.recommended_product_id] : undefined} /></section> : null}

      <section className="company-sales-queue">
        <div className="company-sales-toolbar">
          <div className="company-sales-tabs">{QUEUES.map(({ key, label, icon: Icon }) => <button type="button" className={queue === key ? "active" : ""} onClick={() => setQueue(key)} key={key}><Icon size={15} />{label}</button>)}</div>
          <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou produto" /></label>
        </div>
        <div className="company-sales-count"><CalendarClock size={15} /><span>{queue === "leads" ? visibleLeads.length : queue === "fitness" ? visibleFitness.length : groupedRows.length} pessoa(s) nesta fila</span><small>Conclua uma ação por vez</small></div>
        <div className="company-sales-grid">
          {queue === "leads" ? visibleLeads.map((lead) => <LeadCard lead={lead} key={`${lead.id}-${lead.item_id ?? "lead"}`} />) : queue === "fitness" ? visibleFitness.map((customer) => <FitnessOpportunityCard customer={customer} key={customer.id}/>) : groupedRows.map((group) => <OpportunityCard row={group[0]} relatedRows={group} media={group[0].recommended_product_id ? productMedia[group[0].recommended_product_id] : undefined} key={group[0].customer_id} />)}
        </div>
        {(queue === "leads" ? visibleLeads.length : queue === "fitness" ? visibleFitness.length : groupedRows.length) === 0 ? <div className="company-empty-state"><PackageSearch size={25} /><strong>Nenhuma oportunidade encontrada</strong><span>Troque a fila ou ajuste a busca.</span></div> : null}
      </section>
    </div>
  );
}
