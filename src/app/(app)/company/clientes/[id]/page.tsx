import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CircleDollarSign, Mail, MapPin, MessageCircle, Phone, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { RadarFollowupButton } from "@/components/radar-followup-button";
import { CustomerProfileEditor } from "@/components/customer-profile-editor";
import { getCustomerDetails, getCustomerInteractions, getCustomerLeads, getCustomerPendingOrders, getCustomerSales } from "@/lib/data";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CompanyContextTabs } from "@/components/company-context-tabs";

type TimelineItem = {
  id: string;
  at: string;
  kind: "Compra" | "Lead" | "Contato";
  title: string;
  detail: string;
  status: string;
};

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function displayDate(value: string | null) {
  return value ? formatDate(value) : "Sem registro";
}

export default async function CompanyCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, sales, leads, pending, interactions] = await Promise.all([
    getCustomerDetails(id),
    getCustomerSales(id),
    getCustomerLeads(id),
    getCustomerPendingOrders(id),
    getCustomerInteractions(id),
  ]);

  if (!customer) notFound();
  const recentIds = sales.slice(0, 8).map((sale) => sale.id);
  const supabase = await createClient();
  const [quotesResult, itemsResult] = recentIds.length ? await Promise.all([
    supabase.from("sales_quotes").select("id,sale_id").in("sale_id", recentIds).order("created_at", { ascending: false }),
    supabase.from("sale_items").select("sale_id,product_id,product:products(name)").in("sale_id", recentIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (quotesResult.error) throw new Error(quotesResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const quoteBySale = new Map<string, string>();
  for (const quote of quotesResult.data ?? []) if (quote.sale_id && !quoteBySale.has(quote.sale_id)) quoteBySale.set(quote.sale_id, quote.id);
  const productsBySale = new Map<string, Array<{ id: string; name: string }>>();
  for (const item of itemsResult.data ?? []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const list = productsBySale.get(item.sale_id) ?? [];
    list.push({ id: item.product_id, name: product?.name ?? "Produto" });
    productsBySale.set(item.sale_id, list);
  }

  const timeline: TimelineItem[] = [
    ...sales.map((sale) => ({ id: `sale-${sale.id}`, at: sale.business_at, kind: "Compra" as const, title: sale.product_summary || "Venda registrada", detail: formatCurrency(sale.total_amount), status: sale.payment_status })),
    ...leads.map((lead) => ({ id: `lead-${lead.id}-${lead.item_id || "main"}`, at: lead.lead_at, kind: "Lead" as const, title: lead.product_summary || "Interesse registrado", detail: lead.notes || "Sem observação", status: lead.lead_status || lead.general_status })),
    ...interactions.map((interaction) => ({ id: `interaction-${interaction.id}`, at: interaction.occurred_at || interaction.due_at || interaction.created_at, kind: "Contato" as const, title: interaction.outcome || interaction.interaction_type, detail: interaction.notes || interaction.channel || "Interação no CRM", status: interaction.status })),
  ].filter((item) => item.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12);

  const hasCare = customer.sensitive_to_caffeine || customer.anxiety_or_insomnia || Boolean(customer.prohibited_products);

  return (
    <div className="company-customer-page">
      <section className="company-customer-hero">
        <div className="company-customer-breadcrumb"><Link href="/company/vender"><ArrowLeft size={14} /> Vender agora</Link><span>/</span><span>Cliente Company</span></div>
        <div className="company-customer-title-row">
          <div>
            <span className="company-customer-kicker">VISÃO UNIFICADA · SUPLEMENTOS</span>
            <h1>{customer.name}</h1>
            <p>{[customer.city, customer.phone, customer.email].filter(Boolean).join(" · ") || "Cliente sem dados de contato"}</p>
          </div>
          <div className="company-customer-actions">
            <CustomerProfileEditor customer={customer} />
            <RadarFollowupButton customerId={customer.id} customerName={customer.name} suggestedAction={customer.next_action_label} compact />
            {customer.phone ? <a className="company-customer-primary" href={whatsappHref(customer.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Chamar no WhatsApp</a> : null}
          </div>
        </div>
        <div className="company-customer-radar">
          <span className={`company-customer-radar-dot ${customer.radar_status.toLowerCase().includes("atras") ? "danger" : ""}`} />
          <div><small>Próxima ação recomendada</small><strong>{customer.next_action_label}</strong></div>
          <div><small>Próximo retorno</small><strong>{customer.next_followup_at ? formatDateOnly(customer.next_followup_at) : "Não agendado"}</strong></div>
          <div><small>Último contato</small><strong>{displayDate(customer.last_contact_at)}</strong></div>
        </div>
      </section>

      <CompanyContextTabs label="Navegação da ficha do cliente" items={[{label:"Resumo",href:"#resumo",note:"indicadores"},{label:"Linha do tempo",href:"#linha-do-tempo",note:"compras e contatos"},{label:"Compras",href:"#compras",note:"histórico comercial"},{label:"Perfil",href:"#perfil",note:"dados e cuidados"}]}/>

      <section className="company-customer-metrics" id="resumo">
        <article><span><ShoppingBag size={16} /> Compras</span><strong>{customer.purchase_count}</strong><small>{customer.last_purchase_at ? `Última em ${formatDateOnly(customer.last_purchase_at)}` : "Sem compras"}</small></article>
        <article><span><CircleDollarSign size={16} /> Total comprado</span><strong>{formatCurrency(customer.total_spent)}</strong><small>Histórico consolidado</small></article>
        <article><span><Sparkles size={16} /> Leads</span><strong>{customer.lead_count}</strong><small>{leads.length ? "Interesses no histórico" : "Nenhum interesse aberto"}</small></article>
        <article><span><CalendarClock size={16} /> Pendências</span><strong>{pending.length + customer.pending_followup_count + (customer.phone ? 0 : 1)}</strong><small>{[`${pending.length} pedido(s)`, `${customer.pending_followup_count} retorno(s)`, ...(!customer.phone ? ["Telefone a completar"] : [])].join(" · ")}</small></article>
      </section>

      <section className="company-customer-layout">
        <div className="company-customer-main">
          <article className="company-customer-panel" id="linha-do-tempo">
            <header><div><span>HISTÓRICO INTEGRADO</span><h2>Linha do tempo</h2></div><strong>{timeline.length}</strong></header>
            <div className="company-customer-timeline">
              {timeline.map((item) => <div key={item.id} className="company-customer-event">
                <i className={`kind-${item.kind.toLowerCase()}`} />
                <div><span>{item.kind} · {formatDate(item.at)}</span><strong>{item.title}</strong><small>{item.detail}</small></div>
                <em>{item.status}</em>
              </div>)}
              {timeline.length === 0 ? <div className="company-customer-empty">Ainda não há compras, leads ou contatos registrados.</div> : null}
            </div>
          </article>

          <article className="company-customer-panel" id="compras">
            <header><div><span>COMPRAS</span><h2>Histórico comercial</h2></div><strong>{sales.length}</strong></header>
            <div className="company-customer-purchases">
              {sales.slice(0, 8).map((sale) => <div className="company-customer-purchase-row" key={sale.id}><Link className="company-customer-purchase-overlay" href={quoteBySale.has(sale.id) ? `/company/orcamentos/${quoteBySale.get(sale.id)}` : `/company/concluir/${sale.id}`} aria-label={`Abrir orçamento de ${formatDateOnly(sale.business_date)}`}/><div><strong>{(productsBySale.get(sale.id) ?? []).length ? (productsBySale.get(sale.id) ?? []).map((product, index) => <span key={`${product.id}-${index}`}>{index ? ", " : ""}<Link className="company-customer-product-link" href={`/company/produtos/${product.id}`}>{product.name}</Link></span>) : sale.product_summary || "Venda sem resumo"}</strong><small>{formatDateOnly(sale.business_date)} · {sale.location_name} · Abrir orçamento</small></div><span>{formatCurrency(sale.total_amount)}</span></div>)}
              {sales.length === 0 ? <div className="company-customer-empty">Nenhuma compra registrada.</div> : null}
            </div>
          </article>
        </div>

        <aside className="company-customer-side">
          <article className="company-customer-panel company-customer-profile" id="perfil">
            <header><div><span>PERFIL</span><h2>Dados do cliente</h2></div><UserRound size={18} /></header>
            <dl>
              <div><dt><Phone size={14} /> Telefone</dt><dd>{customer.phone || "Pendente — complete em Editar ficha"}</dd></div>
              {customer.email ? <div><dt><Mail size={14} /> E-mail</dt><dd>{customer.email}</dd></div> : null}
              {customer.city ? <div><dt><MapPin size={14} /> Cidade</dt><dd>{customer.city}</dd></div> : null}
              <div><dt>Origem operacional</dt><dd>Suplementos</dd></div>
              {customer.tags ? <div><dt>Etiquetas</dt><dd>{customer.tags}</dd></div> : null}
              {customer.notes ? <div><dt>Observações</dt><dd>{customer.notes}</dd></div> : null}
            </dl>
          </article>

          <article className={`company-customer-panel company-customer-care ${hasCare ? "has-alert" : ""}`}>
            <header><div><span>ANTES DE OFERECER</span><h2>Cuidados</h2></div><AlertTriangle size={18} /></header>
            {hasCare ? <ul>
              {customer.sensitive_to_caffeine ? <li>Sensível à cafeína</li> : null}
              {customer.anxiety_or_insomnia ? <li>Possui ansiedade ou insônia</li> : null}
              {customer.prohibited_products ? <li>Evitar: {customer.prohibited_products}</li> : null}
            </ul> : <p>Nenhuma restrição registrada.</p>}
            {customer.approach_preferences ? <small>Abordagem: {customer.approach_preferences}</small> : null}
          </article>

        </aside>
      </section>
    </div>
  );
}
