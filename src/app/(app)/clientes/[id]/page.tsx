import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, Mail, MessageCircle, Phone, ShoppingBag, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { CustomerCRMPanel } from "@/components/customer-crm-panel";
import { CustomerProfileEditor } from "@/components/customer-profile-editor";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCustomerDetails, getCustomerInteractions, getCustomerLeads, getCustomerPendingOrders, getCustomerSales } from "@/lib/data";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return <div className="sale-detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").startsWith("55") ? phone.replace(/\D/g, "") : `55${phone.replace(/\D/g, "")}`}`;

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, sales, leads, pending, interactions] = await Promise.all([
    getCustomerDetails(id),
    getCustomerSales(id),
    getCustomerLeads(id),
    getCustomerPendingOrders(id),
    getCustomerInteractions(id),
  ]);
  if (!customer) notFound();

  const care = customer.sensitive_to_caffeine || customer.anxiety_or_insomnia || customer.prohibited_products || customer.approach_preferences;
  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Cliente"
        title={customer.name}
        description="Ficha comercial, cuidados de atendimento, contatos, pós-venda e histórico completo."
        action={(
          <div className="page-header-actions">
            <Link className="button ghost" href="/clientes"><ArrowLeft size={16} />Voltar</Link>
            {customer.phone && <a className="button gold" href={wa(customer.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</a>}
          </div>
        )}
      />

      <div className="customer-radar-strip">
        <div><Badge value={customer.radar_status} /><strong>{customer.next_action_label}</strong></div>
        <div>
          {customer.next_followup_at && <span>Próximo retorno: <strong>{formatDateOnly(customer.next_followup_at)}</strong></span>}
          {customer.last_contact_at && <span>Último contato: <strong>{formatDate(customer.last_contact_at)}</strong></span>}
        </div>
      </div>

      <section className="grid stats-grid customer-stats-grid">
        <StatCard label="Compras" value={String(customer.purchase_count)} note="Vendas registradas" icon={ShoppingBag} />
        <StatCard label="Total comprado" value={formatCurrency(customer.total_spent)} note="Histórico de vendas" icon={ShoppingBag} />
        <StatCard label="Leads" value={String(customer.lead_count)} note={`${customer.interaction_count} contato(s) no CRM`} icon={UserRound} />
        <StatCard label="Próxima ação" value={customer.next_followup_at ? formatDateOnly(customer.next_followup_at) : "Livre"} note={customer.next_action_label} icon={CalendarClock} />
      </section>

      <section className="customer-profile-grid">
        <article className="panel">
          <div className="panel-head"><div><h2>Dados do cliente</h2><p>Informações disponíveis</p></div><UserRound size={19} /></div>
          <div className="panel-body sale-detail-list">
            <Line label="Telefone" value={customer.phone ? <span className="detail-with-icon"><Phone size={14} />{customer.phone}</span> : null} />
            <Line label="E-mail" value={customer.email ? <span className="detail-with-icon"><Mail size={14} />{customer.email}</span> : null} />
            <Line label="Cidade" value={customer.city} />
            <Line label="Referência" value={customer.reference} />
            <Line label="Etiquetas" value={customer.tags} />
            <Line label="Última compra" value={customer.last_purchase_at ? formatDate(customer.last_purchase_at) : null} />
            <Line label="Último resultado" value={customer.last_contact_outcome} />
            <Line label="Observações" value={customer.notes} />
          </div>
          <div className="customer-profile-editor-wrap"><CustomerProfileEditor customer={customer} /></div>
        </article>

        {care ? (
          <article className="panel customer-care-panel">
            <div className="panel-head"><div><h2>Cuidados no atendimento</h2><p>Confira antes de sugerir produtos</p></div><AlertTriangle size={19} /></div>
            <div className="panel-body sale-detail-list">
              {customer.sensitive_to_caffeine && <Line label="Cafeína" value="Sensível à cafeína" />}
              {customer.anxiety_or_insomnia && <Line label="Ansiedade/sono" value="Possui ansiedade ou insônia" />}
              <Line label="Produtos que não devem ser indicados" value={customer.prohibited_products} />
              <Line label="Preferência de abordagem" value={customer.approach_preferences} />
            </div>
          </article>
        ) : (
          <article className="panel customer-care-empty">
            <div className="panel-head"><div><h2>Cuidados no atendimento</h2><p>Nenhuma restrição registrada</p></div><AlertTriangle size={19} /></div>
            <div className="empty compact"><strong>Ficha livre</strong>Use “Editar dados” para registrar sensibilidades, restrições e preferências.</div>
          </article>
        )}
      </section>

      <CustomerCRMPanel customerId={customer.id} sales={sales} interactions={interactions} />

      {pending.length > 0 && (
        <article className="panel customer-history-panel">
          <div className="panel-head"><div><h2>Pedidos pendentes</h2><p>Ainda exigem recebimento ou entrega</p></div><strong>{pending.length}</strong></div>
          <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Total</th><th /></tr></thead><tbody>{pending.map((order) => <tr key={order.id}><td>{order.product_summary ?? "—"}</td><td>{formatDateOnly(order.business_date)}</td><td><Badge value={order.payment_status} /></td><td><Badge value={order.delivery_status} /></td><td className="amount">{formatCurrency(order.total_amount)}</td><td><Link className="button ghost compact-button" href={`/pedidos-pendentes/${order.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>
        </article>
      )}

      <article className="panel customer-history-panel">
        <div className="panel-head"><div><h2>Histórico de vendas</h2><p>Mais recentes primeiro</p></div><strong>{sales.length}</strong></div>
        {sales.length === 0 ? <div className="empty compact"><strong>Nenhuma venda</strong>As compras aparecerão aqui.</div> : <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Total</th><th /></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td>{sale.product_summary ?? "—"}</td><td>{formatDateOnly(sale.business_date)}</td><td><Badge value={sale.payment_status} /></td><td><Badge value={sale.delivery_status} /></td><td className="amount">{formatCurrency(sale.total_amount)}</td><td><Link className="button ghost compact-button" href={`/vendas/${sale.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}
      </article>

      <article className="panel customer-history-panel">
        <div className="panel-head"><div><h2>Histórico de leads</h2><p>Interesses registrados</p></div><strong>{leads.length}</strong></div>
        {leads.length === 0 ? <div className="empty compact"><strong>Nenhum lead</strong>Os interesses aparecerão aqui.</div> : <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Data do orçamento</th><th>Status</th><th>Observações</th><th /></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>{lead.primary_product_id ? <Link className="table-link" href={`/produtos/${lead.primary_product_id}`}>{lead.product_summary ?? "Produto"}</Link> : lead.product_summary ?? "—"}</td><td>{formatDateOnly(lead.lead_date)}</td><td><Badge value={lead.lead_status ?? lead.general_status} /></td><td><span className="table-note">{lead.notes ?? "—"}</span></td><td><Link className="button ghost compact-button" href={`/leads/${lead.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}
      </article>
    </>
  );
}
