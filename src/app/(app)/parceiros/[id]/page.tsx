import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, CircleDollarSign, Edit3, Gift, Handshake, MapPin, Phone, Store, TrendingUp, UsersRound } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerSettlementPanel } from "@/components/partner-settlement-panel";
import { PartnerUnassignedSales } from "@/components/partner-unassigned-sales";
import { StatCard } from "@/components/stat-card";
import { getPartnerDetails } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function rewardLabel(type: string) {
  if (type === "gift_per_sales") return "Brinde por meta";
  if (type === "fixed_per_sale") return "Valor fixo por venda";
  if (type === "percentage") return "Percentual das vendas";
  if (type === "none") return "Sem acerto";
  return "Acerto manual";
}

export default async function PartnerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getPartnerDetails(id);
  if (!details) notFound();
  const { overview: partner, sales, settlements, unassignedSales } = details;
  return <>
    <DemoBanner />
    <PageHeader eyebrow="Parceria" title={partner.name} description={`${partner.partner_type}${partner.city ? ` · ${partner.city}` : ""}`} action={<Link className="button gold" href={`/parceiros/${partner.id}/editar`}><Edit3 size={16} />Editar parceiro</Link>} />

    <section className="stats-grid partner-detail-stats">
      <StatCard label="Vendas no ciclo" value={String(partner.current_cycle_sales_count)} note={`Desde ${formatDateOnly(partner.cycle_start)}`} icon={UsersRound} />
      <StatCard label="Faturamento no ciclo" value={formatCurrency(partner.current_cycle_revenue)} note={`${formatCurrency(partner.current_cycle_profit)} de lucro`} icon={CircleDollarSign} />
      <StatCard label="Recompensa estimada" value={partner.reward_units_due > 0 ? `${partner.reward_units_due} brinde(s)` : formatCurrency(partner.estimated_reward_amount)} note={partner.settlement_pending ? "Acerto pendente" : "Ciclo em andamento"} icon={Gift} />
      <StatCard label="Estoque no ponto" value={String(partner.linked_location_units)} note={partner.linked_location_code ?? "Sem ponto relacionado"} icon={Boxes} />
    </section>

    <section className="partner-detail-layout">
      <div className="partner-detail-main">
        <article className="panel partner-progress-panel"><div className="panel-head"><div><h2>Progresso da parceria</h2><p>{partner.reward_description ?? rewardLabel(partner.reward_type)}</p></div><Badge value={partner.settlement_pending ? "pending" : partner.status === "Pausado" || !partner.active ? "inactive" : "active"} /></div><div className="panel-body">
          {partner.reward_type === "gift_per_sales" ? <><div className="partner-progress-large"><div><strong>{partner.progress_sales}</strong><span>de {partner.target_sales ?? 0} vendas</span></div><div><strong>{Math.round(partner.progress_pct)}%</strong><span>da meta</span></div></div><div className="partner-progress-track large"><span style={{ width: `${partner.progress_pct}%` }} /></div>{partner.reward_units_due > 0 && <p className="partner-reward-alert"><Gift size={17} />Meta alcançada: {partner.reward_units_due} recompensa(s) disponível(is).</p>}</> : <div className="partner-progress-large"><div><strong>{partner.current_cycle_sales_count}</strong><span>vendas contabilizadas</span></div><div><strong>{partner.reward_type === "fixed_per_sale" || partner.reward_type === "percentage" ? formatCurrency(partner.estimated_reward_amount) : "Manual"}</strong><span>recompensa estimada</span></div></div>}
        </div></article>

        <article className="panel"><div className="panel-head"><div><h2>Vendas vinculadas</h2><p>Histórico comercial atribuído a este parceiro.</p></div><strong>{sales.length}</strong></div>{sales.length === 0 ? <div className="empty"><TrendingUp size={25} /><strong>Nenhuma venda vinculada</strong>Selecione o parceiro ao registrar uma nova venda.</div> : <div className="table-wrap"><table className="table partner-sales-table"><thead><tr><th>Cliente</th><th>Produto</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Valor</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><Link className="table-link" href={`/vendas/${sale.id}`}><strong>{sale.customer_name}</strong></Link></td><td>{sale.product_summary ?? "—"}</td><td>{formatDateOnly(sale.sale_date)}</td><td><Badge value={sale.payment_status} /></td><td><Badge value={sale.delivery_status} /></td><td><strong>{formatCurrency(sale.total_amount)}</strong></td></tr>)}</tbody></table></div>}</article>
        <PartnerSettlementPanel partner={partner} settlements={settlements} />
        <PartnerUnassignedSales partnerId={partner.id} sales={unassignedSales} />
      </div>

      <aside className="partner-detail-side">
        <article className="panel"><div className="panel-head"><div><h2>Dados da parceria</h2><p>Contato e configuração atual.</p></div><Handshake size={19} /></div><div className="panel-body sale-detail-list">
          {partner.contact_name && <div className="sale-detail-line"><span>Responsável</span><strong>{partner.contact_name}</strong></div>}
          {partner.phone && <div className="sale-detail-line"><span>Telefone</span><strong className="detail-with-icon"><Phone size={14} />{partner.phone}</strong></div>}
          {partner.city && <div className="sale-detail-line"><span>Cidade</span><strong className="detail-with-icon"><MapPin size={14} />{partner.city}</strong></div>}
          <div className="sale-detail-line"><span>Modelo</span><strong>{rewardLabel(partner.reward_type)}</strong></div>
          {partner.target_sales && <div className="sale-detail-line"><span>Meta</span><strong>{partner.target_sales} vendas</strong></div>}
          {partner.reward_value > 0 && <div className="sale-detail-line"><span>Valor</span><strong>{partner.reward_type === "percentage" ? `${partner.reward_value}%` : formatCurrency(partner.reward_value)}</strong></div>}
          {partner.settlement_day && <div className="sale-detail-line"><span>Dia do acerto</span><strong>Dia {partner.settlement_day}</strong></div>}
          {partner.coupon_code && <div className="sale-detail-line"><span>Cupom</span><strong>{partner.coupon_code}</strong></div>}
          {partner.linked_location_name && <div className="sale-detail-line"><span>Ponto físico</span><strong className="detail-with-icon"><Store size={14} />{partner.linked_location_code}</strong></div>}
          <div className="sale-detail-line"><span>Contabilização</span><strong>{partner.counts_only_delivered ? "Somente entregues" : "Todas as vendas"}</strong></div>
          {partner.last_settlement_on && <div className="sale-detail-line"><span>Último acerto</span><strong>{formatDateOnly(partner.last_settlement_on)}</strong></div>}
        </div></article>
        {(partner.partnership_model || partner.settlement_rule || partner.notes) && <article className="panel"><div className="panel-head"><div><h2>Regras e observações</h2></div></div><div className="panel-body partner-notes-block">{partner.partnership_model && <div><span>Modelo</span><p>{partner.partnership_model}</p></div>}{partner.settlement_rule && <div><span>Regra</span><p>{partner.settlement_rule}</p></div>}{partner.notes && <div><span>Observações</span><p>{partner.notes}</p></div>}</div></article>}
      </aside>
    </section>
  </>;
}
