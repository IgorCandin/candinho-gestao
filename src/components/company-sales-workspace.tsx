/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FitnessOpportunityContactActions } from "@/components/fitness-opportunity-contact-actions";
import { fitnessContactDue, fitnessContactLabel, mergeFitnessContacts, type FitnessContactState } from "@/lib/fitness-opportunity-contact";
import { ArrowRight, ContactRound, FileText, Flame, MessageCircle, PackageSearch, Repeat2, Search, X, ShoppingBag, Sparkles, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanySalesQueueActions } from "@/components/company-sales-queue-actions";
import { CompanyWorkflowSync } from "@/components/company-workflow-sync";
import { LeadConvertButton } from "@/components/lead-convert-button";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import type { LeadRow } from "@/lib/types";
import type { FitnessCustomerRow } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { SizeOpportunity } from "@/lib/fitness-size-opportunities";
import "./company-completion-filters.css";
import "./company-sales-workspace.css";

type Queue = "today" | "repurchase" | "leads" | "complementary" | "fitness" | "sizes" | "contacts";
type Operation = "all" | "Suplementos" | "Fitness";
type ProductMedia = Record<string, { photo1: string | null; photo2: string | null }>;

const QUEUES: Array<{ key: Queue; label: string; icon: typeof Flame }> = [
  { key: "today", label: "Falar agora", icon: Flame },
  { key: "repurchase", label: "Recompras", icon: Repeat2 },
  { key: "leads", label: "Leads quentes", icon: ContactRound },
  { key: "complementary", label: "Complementares", icon: Sparkles },
  { key: "sizes", label: "Tamanho + estoque", icon: ShoppingBag },
  { key: "fitness", label: "Reativar clientes", icon: Repeat2 },
  { key: "contacts", label: "Contatos registrados", icon: ContactRound },
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

function OpportunityCard({ row, relatedRows = [row], featured = false, media, canWrite = false }: { row: SalesOpportunity; relatedRows?: SalesOpportunity[]; featured?: boolean; media?: { photo1: string | null; photo2: string | null }; canWrite?: boolean }) {
  return (
    <article className={`company-sale-card ${featured ? "featured" : ""}`}>
      <header>
        <span className={`company-priority priority-${featured ? "alta" : "media"}`}>{featured ? row.scheduled_return ? "Retorno combinado" : row.last_feedback_status === "contacted" ? "Conferir resposta" : "Produto acabando" : row.last_feedback_status === "product_ended" ? "Confirmado pelo cliente" : "Prazo estimado"}</span>
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
      <div className="sales-next-step"><strong>O que fazer</strong><p>{row.scheduled_return ? "Retome a conversa combinada e confirme se o cliente quer preparar o pedido." : row.last_feedback_status === "contacted" ? "Confira se houve resposta antes de chamar novamente." : "Confirme a necessidade e a disponibilidade do produto antes de oferecer."}</p>{canWrite && <Link href={`/company/vendas/nova/suplementos?cliente=${encodeURIComponent(row.customer_id)}${row.recommended_product_id ? `&produto=${encodeURIComponent(row.recommended_product_id)}` : ""}`}>Preparar venda com este cliente</Link>}</div>
      {canWrite && <details className="sales-contact-outcome"><summary>Registrar resultado do contato</summary><CompanySalesQueueActions opportunity={row}/></details>}
    </article>
  );
}

function LeadCard({ lead, canWrite = false }: { lead: LeadRow; canWrite?: boolean }) {
  const whatsapp = whatsappHref(lead.phone, `Olá, ${lead.customer_name}! Tudo bem? Estou retornando sobre ${lead.product_summary || "seu interesse"}.`);
  return (
    <article className="company-sale-card lead-card">
      <header><span className="company-priority priority-media">{lead.lead_status || "Lead"}</span><span className="company-sale-score">{formatDateOnly(lead.lead_date)}</span></header>
      <div className="company-sale-person"><div><strong>{lead.customer_name}</strong><small>{[lead.city, lead.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/company/leads/${lead.id}`}><ArrowRight size={17} /></Link></div>
      <div className="company-sale-offer"><PackageSearch size={18} /><div><span>Interesse registrado</span><strong>{lead.product_summary || "Produto não informado"}</strong></div></div>
      {lead.notes ? <p>{lead.notes}</p> : <p>Abra o lead, confirme a necessidade e deixe a próxima ação marcada.</p>}
      <div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp}><MessageCircle size={15} /> WhatsApp</a> : null}<Link href={`/company/leads/${lead.id}`}><ContactRound size={15} /> Abrir lead</Link>{canWrite && <LeadConvertButton leadId={lead.id} companyMode />}</div>
    </article>
  );
}

function FitnessOpportunityCard({ customer, canWrite = false, contact, onSaved, today, registered=false }: { customer: FitnessCustomerRow; canWrite?: boolean; contact?:FitnessContactState;onSaved:(contact:FitnessContactState)=>void;today:string;registered?:boolean }) {
  const whatsapp = whatsappHref(customer.phone, `Olá, ${customer.name}! Tudo bem? Chegaram novidades da Candinho Fitness e lembrei de você.`);
  return <article className="company-sale-card lead-card"><header><span className="company-priority priority-media">Fitness</span><span className="company-sale-score">{customer.classification}</span></header><div className="company-sale-person"><div><strong>{customer.name}</strong><small>{[customer.city, customer.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</small></div><Link href={`/company/clientes/fitness/${customer.id}`}><ArrowRight size={17}/></Link></div><div className="company-sale-offer"><ShoppingBag size={18}/><div><span>{registered?"Atendimento Fitness":"Reativação Fitness"}</span><strong>{registered&&contact?fitnessContactLabel(contact,today):customer.total_purchases ? `Reativar após ${customer.days_without_purchase ?? 0} dias` : "Primeira compra"}</strong><small>{customer.total_purchases} compra(s) · {formatCurrency(customer.total_spent)}</small></div></div><p>{customer.total_purchases ? "Revise os tamanhos e produtos anteriores antes de sugerir uma nova peça." : "Cliente cadastrado ainda sem compra Fitness."}</p><div className="company-sale-actions">{whatsapp ? <a className="company-whatsapp" href={whatsapp}><MessageCircle size={15}/> WhatsApp</a> : null}<Link href={`/company/clientes/fitness/${customer.id}`}><ContactRound size={15}/> Abrir ficha</Link>{canWrite && <Link href={`/company/vendas/nova/fitness?cliente=${encodeURIComponent(customer.id)}`}>Preparar venda com esta cliente</Link>}</div><FitnessOpportunityContactActions customerId={customer.id} contact={contact} onSaved={onSaved} today={today} canWrite={canWrite}/></article>;
}

function FitnessSizeCard({ item, canWrite, customer, contact, onSaved, today }: { item: SizeOpportunity; canWrite: boolean; customer?: FitnessCustomerRow;contact?:FitnessContactState;onSaved:(contact:FitnessContactState)=>void;today:string }) {
  const { evidence, products } = item;
  const whatsapp = whatsappHref(customer?.phone ?? null, `Olá, ${evidence.customerName}! Tudo bem? Separei algumas opções de ${evidence.category} da Candinho Fitness. Posso confirmar seu tamanho e o que procura?`);
  return <article className="company-sale-card fitness-size-card"><header><span className="company-priority priority-media">Fitness · tamanho + estoque</span><small>{products.length} peça(s) para conferir</small></header><div className="company-sale-person"><div><strong>{evidence.customerName}</strong><small>{evidence.category} · tamanho observado {evidence.size}</small></div><Link href={`/company/clientes/fitness/${evidence.customerId}`} aria-label={`Abrir ficha de ${evidence.customerName}`}><ArrowRight size={17}/></Link></div><p>Compra anterior: {evidence.productName} · {evidence.size} · {formatDateOnly(evidence.date)}.</p><div className="sales-next-step"><strong>O que fazer</strong><p>Confirme o tamanho e o interesse com a cliente. A compra anterior pode ter sido presente; o tamanho também varia por modelo.</p><div className="company-sale-actions">{whatsapp ? <a href={whatsapp} className="company-whatsapp"><MessageCircle size={15}/>Conversar com a cliente</a> : <Link href="/company/clientes/telefones?operacao=Fitness">Conferir telefone da cliente</Link>}</div></div><div className="fitness-size-offers">{products.map(product=><div key={product.variant_id}><Link href={`/company/produtos/fitness/${product.product_id}`}><strong>{product.product_name}</strong></Link><span>{product.size} · {product.color} · {product.available_quantity} disponível</span><b>{formatCurrency(product.sale_price)}</b>{canWrite && <Link className="fitness-prepare-sale" href={`/company/vendas/nova/fitness?cliente=${encodeURIComponent(evidence.customerId)}&variante=${encodeURIComponent(product.variant_id)}`}>Preparar venda com esta peça</Link>}</div>)}</div><FitnessOpportunityContactActions customerId={evidence.customerId} contact={contact} onSaved={onSaved} today={today} canWrite={canWrite}/></article>;
}

export function CompanySalesWorkspace({ opportunities, leads, fitnessCustomers, productMedia, blockedCustomerIds, fitnessSizeOpportunities = [], sampledFitnessSales = 0, fitnessContacts = [], allowedOperations = ["Suplementos", "Fitness"], canWriteSupplements = false, canWriteFitness = false, initialOperation = "all" }: { opportunities: SalesOpportunity[]; leads: LeadRow[]; fitnessCustomers: FitnessCustomerRow[]; productMedia: ProductMedia; blockedCustomerIds: string[]; fitnessSizeOpportunities?: SizeOpportunity[]; sampledFitnessSales?: number; fitnessContacts?:FitnessContactState[]; allowedOperations?: Array<Exclude<Operation,"all">>; canWriteSupplements?: boolean; canWriteFitness?: boolean; initialOperation?: Operation }) {
  const initialScope = initialOperation !== "all" && !allowedOperations.includes(initialOperation) ? "all" : initialOperation;
  const [operation, setOperation] = useState<Operation>(initialScope);
  const [queue, setQueue] = useState<Queue>(initialScope === "Fitness" || !allowedOperations.includes("Suplementos") ? "sizes" : "today");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(24);
  const [contactUpdates,setContactUpdates]=useState<Record<string,FitnessContactState>>({});
  const contacts=useMemo(()=>mergeFitnessContacts(fitnessContacts,contactUpdates),[fitnessContacts,contactUpdates]);
  const saveContact=(contact:FitnessContactState)=>setContactUpdates(current=>({...current,[contact.customer_id]:contact}));
  function openQueue(nextQueue: Queue) { setQueue(nextQueue); setShown(24); }
  function selectOperation(value: Operation) { setOperation(value); setShown(24); if(value === "Fitness" && !["sizes","fitness","contacts"].includes(queue)) setQueue("sizes"); if(value === "Suplementos" && ["sizes","fitness","contacts"].includes(queue)) setQueue("today"); }
  const hotLeads = useMemo(() => leads.filter((lead) => lead.general_status === "pending").sort((a, b) => (LEAD_RANK[a.lead_status ?? ""] ?? 99) - (LEAD_RANK[b.lead_status ?? ""] ?? 99) || b.lead_date.localeCompare(a.lead_date)), [leads]);
  const blockedPeople = useMemo(() => new Set(blockedCustomerIds), [blockedCustomerIds]);
  const today = brazilToday();
  const todayCandidates = useMemo(() => {
    const people = new Set<string>();
    const candidates: Array<{ kind: "lead"; lead: LeadRow } | { kind: "opportunity"; row: SalesOpportunity }> = [];
    const personKey = (id: string | null, name: string, phone: string | null) => id ?? `${name.toLocaleLowerCase("pt-BR")}:${phone ?? ""}`;
    for (const row of opportunities.filter((item) => item.scheduled_return).sort((a, b) => (a.feedback_next_action_on ?? "").localeCompare(b.feedback_next_action_on ?? ""))) {
      if (blockedPeople.has(row.customer_id)) continue;
      const key = personKey(row.customer_id, row.customer_name, row.phone);
      if (people.has(key)) continue;
      people.add(key);
      candidates.push({ kind: "opportunity", row });
    }
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
      if (row.scheduled_return) continue;
      if (blockedPeople.has(row.customer_id)) continue;
      const confirmedEnd = row.last_feedback_status === "product_ended";
      const responseDue = row.last_feedback_status === "contacted" && Boolean(row.feedback_next_action_on && row.feedback_next_action_on <= today);
      if (!row.scheduled_return && !confirmedEnd && !responseDue) continue;
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
  const fitnessCandidates = useMemo(() => fitnessCustomers.filter(customer => customer.active && customer.total_purchases > 0 && (customer.days_without_purchase ?? 0) >= 45 && fitnessContactDue(contacts[customer.id],today)).sort((a,b)=>(b.days_without_purchase ?? 0)-(a.days_without_purchase ?? 0)), [fitnessCustomers, contacts, today]);
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const visibleToday = todayCandidates.filter((item) => {
    if (!needle) return true;
    const values = item.kind === "lead" ? [item.lead.customer_name, item.lead.product_summary, item.lead.city] : [item.row.customer_name, item.row.recommended_product_name, item.row.city];
    return values.some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle));
  });
  const visibleFitness = fitnessCandidates.filter(customer => !needle || [customer.name,customer.city,customer.phone].some(value=>value?.toLocaleLowerCase("pt-BR").includes(needle)));
  const pendingSizes=fitnessSizeOpportunities.filter(item=>fitnessContactDue(contacts[item.evidence.customerId],today));
  const registered=Object.values(contacts).filter(contact=>fitnessCustomers.some(customer=>customer.id===contact.customer_id&&customer.active));
  const visibleContacts=registered.filter(contact=>{const customer=fitnessCustomers.find(row=>row.id===contact.customer_id);return !needle||`${customer?.name} ${contact.notes??""} ${contact.status}`.toLocaleLowerCase("pt-BR").includes(needle)}).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
  const visibleSizes = pendingSizes.filter(item=>!needle || `${item.evidence.customerName} ${item.evidence.category} ${item.evidence.size} ${item.products.map(product=>`${product.product_name} ${product.color}`).join(" ")}`.toLocaleLowerCase("pt-BR").includes(needle));
  const featured = queue === "today" && operation !== "Fitness" ? visibleToday[0] ?? null : null;
  const totalRows = queue === "today" ? visibleToday.length : queue === "leads" ? visibleLeads.length : queue === "fitness" ? visibleFitness.length : queue === "sizes" ? visibleSizes.length : queue === "contacts" ? visibleContacts.length : groupedRows.length;

  const availableQueues = QUEUES.filter(item => ["sizes","fitness","contacts"].includes(item.key) ? operation !== "Suplementos" && allowedOperations.includes("Fitness") : operation !== "Fitness" && allowedOperations.includes("Suplementos"));
  const counts: Record<Queue,number> = { today: todayCandidates.length, repurchase: new Set(opportunities.filter(row=>row.opportunity_group === "recompra").map(row=>row.customer_id)).size, complementary: new Set(opportunities.filter(row=>row.opportunity_group === "produto_complementar").map(row=>row.customer_id)).size, leads: hotLeads.length, sizes: pendingSizes.length, fitness: fitnessCandidates.length, contacts:registered.length };
  const queueHelp: Record<Queue,string> = { contacts:"Fitness: histórico por cliente, com respostas, espera e retornos combinados. Na data prevista, a cliente volta às oportunidades novas, quando ainda há combinações ou critério de reativação.", today:"Suplementos: até 10 pessoas com retorno combinado, interesse recente ou confirmação do cliente. Confira o histórico antes de chamar.", repurchase:"Suplementos: estimativa de recompra. Confirme com o cliente; prazo estimado não significa urgência confirmada.", leads:"Suplementos: interesses registrados, ordenados pelo estágio. Confira o pedido e prepare a venda a partir do lead.", complementary:"Suplementos: sugestões complementares. Confirme se fazem sentido para a necessidade do cliente.", sizes:`Fitness: combinações de tamanho observado e estoque disponível, na amostra das últimas ${sampledFitnessSales} vendas válidas (máximo 500). Não é certeza de tamanho nem reserva de estoque.`, fitness:"Fitness: clientes ativos com compra anterior e pelo menos 45 dias sem comprar. Revise o histórico e confirme se há interesse; tempo sem compra não indica urgência." };
  return (
    <div className="company-sales-v2 company-queue-workspace company-selling-workspace"><CompanyWorkflowSync />
      <header className="company-sales-head"><div><span>Company · Comercial</span><h1>Vender agora</h1><p>Escolha a operação, confira o motivo da oportunidade e prepare a venda com o cliente selecionado.</p></div><div>{canWriteSupplements && operation !== "Fitness" && <Link href="/company/leads/novo" className="button ghost"><UserRoundPlus size={16}/>Novo lead de Suplementos</Link>}<Link href="/company/orcamentos" className="button ghost"><FileText size={16}/>Orçamentos</Link>{(operation === "Fitness" ? canWriteFitness : operation === "Suplementos" ? canWriteSupplements : canWriteSupplements || canWriteFitness) && <Link href={operation === "all" ? "/company/vendas/nova" : `/company/vendas/nova/${operation === "Fitness" ? "fitness" : "suplementos"}`} className="button company-blue"><ShoppingBag size={16}/>Nova venda{operation !== "all" ? ` · ${operation}` : ""}</Link>}</div></header>
      <section className="company-sales-queue">
        <div className="completion-filters">
          <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all",...allowedOperations] as const).map(value=><button type="button" key={value} aria-pressed={operation===value} onClick={()=>selectOperation(value)}>{value==="all"?"Todas":value}</button>)}</div></fieldset>
          <label className="completion-search"><span>Buscar cliente ou oportunidade</span><div><Search size={17}/><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setShown(24)}} placeholder="Cliente, produto, tamanho ou cor"/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>setQuery("")}><X size={17}/></button>}</div></label>
          <fieldset className="completion-status"><legend>Qual oportunidade você quer atender?</legend><div className="completion-segments">{availableQueues.map(({key,label})=><button type="button" key={key} aria-pressed={queue===key} onClick={()=>openQueue(key)}><span>{label}</span><span className="completion-filter-count">{counts[key]}</span></button>)}</div></fieldset>
        </div>
        <div className="completion-filter-result"><p role="status" aria-live="polite">{totalRows} {queue === "sizes" ? "combinação(ões) de cliente e categoria" : queue === "leads" ? "lead(s)" : "pessoa(s)"} · {["sizes","fitness","contacts"].includes(queue) ? "Fitness" : "Suplementos"}</p>{(operation!=="all"||query||queue!=="today")&&<button type="button" onClick={()=>{setOperation("all");setQuery("");setQueue(allowedOperations.includes("Suplementos")?"today":"sizes");setShown(24)}}>Limpar filtros</button>}</div>
        <p className="selling-queue-help">{queueHelp[queue]}</p>
      {featured ? <section className="company-sales-feature"><div><span><Flame size={14} /> Comece por aqui</span><h2>{featured.kind === "lead" ? featured.lead.customer_name : featured.row.customer_name}</h2><p>{featured.kind === "lead" ? "Interesse recente registrado. Confira o lead antes de chamar." : featured.row.scheduled_return ? "Chegou a data combinada com o cliente. Confira o histórico antes do contato." : featured.row.last_feedback_status === "contacted" ? "Verifique se respondeu ao contato anterior antes de enviar outra mensagem." : "Cliente informou que o produto acabou. Confirme se ainda precisa comprar."}</p></div></section> : null}

        <div className="company-sales-grid">
          {queue === "today" ? visibleToday.map((item) => item.kind === "lead" ? <LeadCard lead={item.lead} canWrite={canWriteSupplements} key={`lead-${item.lead.id}`} /> : <OpportunityCard row={item.row} canWrite={canWriteSupplements} relatedRows={opportunities.filter((row) => row.customer_id === item.row.customer_id)} featured media={item.row.recommended_product_id ? productMedia[item.row.recommended_product_id] : undefined} key={`opportunity-${item.row.customer_id}`} />) : queue === "leads" ? visibleLeads.slice(0, shown).map((lead) => <LeadCard lead={lead} canWrite={canWriteSupplements} key={`${lead.id}-${lead.item_id ?? "lead"}`} />) : queue === "fitness" ? visibleFitness.slice(0, shown).map((customer) => <FitnessOpportunityCard customer={customer} canWrite={canWriteFitness} contact={contacts[customer.id]} onSaved={saveContact} today={today} key={customer.id}/>) : queue === "sizes" ? visibleSizes.slice(0,shown).map(item=><FitnessSizeCard item={item} contact={contacts[item.evidence.customerId]} onSaved={saveContact} today={today} customer={fitnessCustomers.find(customer=>customer.id===item.evidence.customerId)} canWrite={canWriteFitness} key={`${item.evidence.customerId}:${item.evidence.category}`}/>) : queue === "contacts" ? visibleContacts.slice(0,shown).map(contact=>{const customer=fitnessCustomers.find(row=>row.id===contact.customer_id)!;return <FitnessOpportunityCard registered customer={customer} canWrite={canWriteFitness} contact={contact} onSaved={saveContact} today={today} key={contact.customer_id}/>}) : groupedRows.slice(0, shown).map((group) => <OpportunityCard row={group[0]} canWrite={canWriteSupplements} relatedRows={group} media={group[0].recommended_product_id ? productMedia[group[0].recommended_product_id] : undefined} key={group[0].customer_id} />)}
        </div>
        {queue !== "today" && totalRows > shown ? <button className="button ghost company-sales-more" type="button" onClick={() => setShown((current) => current + 24)}>Mostrar mais 24 registros</button> : null}
        {totalRows === 0 ? <div className="company-empty-state"><PackageSearch size={25} /><strong>Nenhuma oportunidade encontrada</strong><span>Troque a fila ou ajuste a busca. A ausência de combinações Fitness neste recorte não significa ausência de oportunidades fora da amostra.</span></div> : null}
      </section>
    </div>
  );
}
