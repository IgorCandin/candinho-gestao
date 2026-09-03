import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CircleDollarSign, ExternalLink, Mail, MapPin, MessageCircle, Phone, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { RadarFollowupButton } from "@/components/radar-followup-button";
import { getCustomerDetails, getCustomerInteractions, getCustomerLeads, getCustomerPendingOrders, getCustomerSales } from "@/lib/data";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";

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

      <section className="company-customer-metrics">
        <article><span><ShoppingBag size={16} /> Compras</span><strong>{customer.purchase_count}</strong><small>{customer.last_purchase_at ? `Última em ${formatDateOnly(customer.last_purchase_at)}` : "Sem compras"}</small></article>
        <article><span><CircleDollarSign size={16} /> Total comprado</span><strong>{formatCurrency(customer.total_spent)}</strong><small>Histórico consolidado</small></article>
        <article><span><Sparkles size={16} /> Leads</span><strong>{customer.lead_count}</strong><small>{leads.length ? "Interesses no histórico" : "Nenhum interesse aberto"}</small></article>
        <article><span><CalendarClock size={16} /> Pendências</span><strong>{pending.length + customer.pending_followup_count}</strong><small>{pending.length} pedido(s) · {customer.pending_followup_count} retorno(s)</small></article>
      </section>

      <section className="company-customer-layout">
        <div className="company-customer-main">
          <article className="company-customer-panel">
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

          <article className="company-customer-panel">
            <header><div><span>COMPRAS</span><h2>Histórico comercial</h2></div><strong>{sales.length}</strong></header>
            <div className="company-customer-purchases">
              {sales.slice(0, 8).map((sale) => <div key={sale.id}><div><strong>{sale.product_summary || "Venda sem resumo"}</strong><small>{formatDateOnly(sale.business_date)} · {sale.location_name}</small></div><span>{formatCurrency(sale.total_amount)}</span></div>)}
              {sales.length === 0 ? <div className="company-customer-empty">Nenhuma compra registrada.</div> : null}
            </div>
          </article>
        </div>

        <aside className="company-customer-side">
          <article className="company-customer-panel company-customer-profile">
            <header><div><span>PERFIL</span><h2>Dados do cliente</h2></div><UserRound size={18} /></header>
            <dl>
              {customer.phone ? <div><dt><Phone size={14} /> Telefone</dt><dd>{customer.phone}</dd></div> : null}
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

          <Link className="company-customer-legacy" href={`/clientes/${customer.id}`}><ExternalLink size={14} /> Abrir ficha antiga no ERP 1.0</Link>
        </aside>
      </section>
    </div>
  );
}
