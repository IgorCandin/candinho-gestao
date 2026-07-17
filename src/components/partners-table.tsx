"use client";

import Link from "next/link";
import { ArrowUpDown, Gift, Handshake, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { PartnerOverview } from "@/lib/types";

function rewardLabel(partner: PartnerOverview) {
  if (partner.reward_type === "gift_per_sales") return `${partner.target_sales ?? 0} vendas → brinde`;
  if (partner.reward_type === "fixed_per_sale") return `${formatCurrency(partner.reward_value)} por venda`;
  if (partner.reward_type === "percentage") return `${partner.reward_value}% das vendas`;
  if (partner.reward_type === "none") return "Sem acerto";
  return partner.reward_description ?? "Acerto manual";
}

export function PartnersTable({ partners }: { partners: PartnerOverview[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"name" | "sales" | "pending" | "recent">("name");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return partners
      .filter((partner) => {
        const matchesQuery = !normalized || [partner.name, partner.partner_type, partner.city, partner.contact_name, partner.coupon_code]
          .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(normalized);
        const matchesStatus = status === "all" || (status === "pending" ? partner.settlement_pending : status === "active" ? partner.active && partner.status !== "Pausado" : partner.status === "Pausado" || !partner.active);
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "sales") return b.current_cycle_sales_count - a.current_cycle_sales_count;
        if (sort === "pending") return Number(b.settlement_pending) - Number(a.settlement_pending) || b.current_cycle_revenue - a.current_cycle_revenue;
        if (sort === "recent") return (b.last_sale_on ?? "").localeCompare(a.last_sale_on ?? "");
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [partners, query, sort, status]);

  return (
    <article className="panel partner-list-panel">
      <div className="partner-toolbar">
        <label className="product-catalog-search partner-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar parceiro, cidade ou contato" /></label>
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos</option><option value="active">Ativos</option><option value="pending">Com acerto pendente</option><option value="paused">Pausados</option>
        </select>
        <label className="partner-sort"><ArrowUpDown size={15} /><select className="select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="name">Nome A–Z</option><option value="sales">Mais vendas no ciclo</option><option value="pending">Acertos pendentes</option><option value="recent">Venda mais recente</option></select></label>
        <span className="product-result-count">{rows.length} parceiro(s)</span>
      </div>
      {rows.length === 0 ? <div className="empty"><Handshake size={26} /><strong>Nenhum parceiro encontrado</strong>Ajuste os filtros ou cadastre uma nova parceria.</div> : (
        <div className="table-wrap"><table className="table partners-table"><thead><tr><th>Parceiro</th><th>Regra</th><th>Ciclo atual</th><th>Progresso</th><th>Acerto</th><th>Última venda</th></tr></thead><tbody>{rows.map((partner) => {
          const progressPct = partner.reward_type === "gift_per_sales" && (partner.target_sales ?? 0) > 0 ? Math.round((partner.progress_sales / (partner.target_sales ?? 1)) * 100) : partner.progress_pct;
          return <tr key={partner.id}>
            <td><Link className="partner-name-cell" href={`/parceiros/${partner.id}`}><span className="partner-avatar"><Handshake size={18} /></span><span><strong>{partner.name}</strong><small>{[partner.partner_type, partner.city].filter(Boolean).join(" · ")}</small></span></Link></td>
            <td><Link className="table-link" href={`/parceiros/${partner.id}`}><strong>{rewardLabel(partner)}</strong>{partner.linked_location_code && <small className="crm-cell-note">Ponto: {partner.linked_location_code}</small>}</Link></td>
            <td><strong>{partner.current_cycle_sales_count} venda(s)</strong><small className="crm-cell-note">{formatCurrency(partner.current_cycle_revenue)}</small></td>
            <td>{partner.reward_type === "gift_per_sales" ? <div className="partner-progress-cell"><div className="partner-progress-track"><span style={{ width: `${progressPct}%` }} /></div><small>{partner.progress_sales}/{partner.target_sales ?? 0}</small></div> : <span className="muted-value">{partner.current_cycle_sales_count > 0 ? "Com movimento" : "Sem movimento"}</span>}</td>
            <td>{partner.settlement_pending ? <span className="partner-pending-label"><Gift size={14} />{partner.reward_units_due > 0 ? `${partner.reward_units_due} meta(s)` : partner.estimated_reward_amount > 0 ? formatCurrency(partner.estimated_reward_amount) : "Revisar acerto"}</span> : <Badge value={partner.status === "Pausado" || !partner.active ? "inactive" : "active"} />}</td>
            <td>{partner.last_sale_on ? formatDateOnly(partner.last_sale_on) : <span className="muted-value">—</span>}</td>
          </tr>;
        })}</tbody></table></div>
      )}
    </article>
  );
}
