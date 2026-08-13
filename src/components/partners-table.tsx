"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ArrowUpDown,
  Gift,
  Handshake,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { PartnerOverview } from "@/lib/types";

function rewardLabel(p: PartnerOverview) {
  if (p.reward_type === "gift_per_sales") return `${p.target_sales ?? 0} vendas → brinde`;
  if (p.reward_type === "fixed_per_sale") return `${formatCurrency(p.reward_value)} por venda`;
  if (p.reward_type === "percentage") return `${p.reward_value}% das vendas`;
  if (p.reward_type === "none") return "Sem acerto";
  return p.reward_description ?? "Acerto manual";
}

export function PartnersTable({ partners }: { partners: PartnerOverview[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState<"name" | "sales" | "pending" | "recent">("name");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return partners
      .filter((p) => {
        const matchesQuery =
          !normalized ||
          [p.name, p.partner_type, p.city, p.contact_name, p.coupon_code]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(normalized);

        const archived = !p.active || p.status === "Encerrado";
        const paused = p.active && p.status === "Pausado";
        const active = p.active && !paused && !archived;

        const matchesStatus =
          status === "all" ||
          (status === "pending" && p.settlement_pending) ||
          (status === "active" && active) ||
          (status === "paused" && paused) ||
          (status === "archived" && archived);

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "sales") return b.current_cycle_sales_count - a.current_cycle_sales_count;
        if (sort === "pending") {
          return (
            Number(b.settlement_pending) - Number(a.settlement_pending) ||
            b.current_cycle_revenue - a.current_cycle_revenue
          );
        }
        if (sort === "recent") return (b.last_sale_on ?? "").localeCompare(a.last_sale_on ?? "");
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [partners, query, sort, status]);

  const openPartner = (id: string) => router.push(`/parceiros/${id}`);

  async function archivePartner(partner: PartnerOverview) {
    const ok = window.confirm(
      `Excluir ${partner.name} da rede ativa?\n\nO histórico de vendas, acertos e custos será preservado. O acesso do portal será desativado.`,
    );
    if (!ok) return;

    setArchivingId(partner.id);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("archive_partner_v1", {
        p_partner_id: partner.id,
      });
      if (error) throw error;
      setMessage(`${partner.name} foi removido da rede ativa. O histórico foi preservado.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a parceria.");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <article className="panel partner-list-panel">
      <div className="partner-toolbar">
        <label className="product-catalog-search partner-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar parceiro, cidade ou contato"
          />
        </label>

        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Ativos</option>
          <option value="pending">Com acerto pendente</option>
          <option value="paused">Pausados</option>
          <option value="archived">Encerrados</option>
          <option value="all">Todos</option>
        </select>

        <label className="partner-sort">
          <ArrowUpDown size={15} />
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="name">Nome A–Z</option>
            <option value="sales">Mais vendas no ciclo</option>
            <option value="pending">Acertos pendentes</option>
            <option value="recent">Venda mais recente</option>
          </select>
        </label>

        <span className="product-result-count">{rows.length} parceiro(s)</span>
      </div>

      {message && <p className="form-message standalone-message">{message}</p>}

      {rows.length === 0 ? (
        <div className="empty">
          <Handshake size={26} />
          <strong>Nenhum parceiro encontrado</strong>
          Ajuste os filtros ou cadastre uma nova parceria.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table partners-table">
            <thead>
              <tr>
                <th>Parceiro</th>
                <th>Regra</th>
                <th>Ciclo atual</th>
                <th>Progresso</th>
                <th>Acerto</th>
                <th>Última venda</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const progressPct =
                  p.reward_type === "gift_per_sales" && (p.target_sales ?? 0) > 0
                    ? Math.round((p.progress_sales / (p.target_sales ?? 1)) * 100)
                    : p.progress_pct;
                const archived = !p.active || p.status === "Encerrado";

                return (
                  <tr
                    key={p.id}
                    className="clickable-data-row"
                    role="link"
                    tabIndex={0}
                    onClick={() => openPartner(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPartner(p.id);
                      }
                    }}
                  >
                    <td>
                      <Link
                        onClick={(e) => e.stopPropagation()}
                        className="partner-name-cell"
                        href={`/parceiros/${p.id}`}
                      >
                        <span className="partner-avatar"><Handshake size={18} /></span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>{[p.partner_type, p.city].filter(Boolean).join(" · ")}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <strong>{rewardLabel(p)}</strong>
                      {p.linked_location_code && (
                        <small className="crm-cell-note">Ponto: {p.linked_location_code}</small>
                      )}
                    </td>
                    <td>
                      <strong>{p.current_cycle_sales_count} venda(s)</strong>
                      <small className="crm-cell-note">{formatCurrency(p.current_cycle_revenue)}</small>
                    </td>
                    <td>
                      {p.reward_type === "gift_per_sales" ? (
                        <div className="partner-progress-cell">
                          <div className="partner-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
                          <small>{p.progress_sales}/{p.target_sales ?? 0}</small>
                        </div>
                      ) : (
                        <span className="muted-value">
                          {p.current_cycle_sales_count > 0 ? "Com movimento" : "Sem movimento"}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.settlement_pending ? (
                        <span className="partner-pending-label">
                          <Gift size={14} />
                          {p.reward_units_due > 0
                            ? `${p.reward_units_due} meta(s)`
                            : p.estimated_reward_amount > 0
                              ? formatCurrency(p.estimated_reward_amount)
                              : "Revisar acerto"}
                        </span>
                      ) : (
                        <Badge value={archived || p.status === "Pausado" ? "inactive" : "active"} />
                      )}
                    </td>
                    <td>{p.last_sale_on ? formatDateOnly(p.last_sale_on) : <span className="muted-value">—</span>}</td>
                    <td className="v4530-partner-actions">
                      {!archived && (
                        <button
                          type="button"
                          className="icon-button v4530-archive-partner"
                          title="Excluir da rede ativa (preserva histórico)"
                          aria-label={`Excluir ${p.name} da rede ativa`}
                          disabled={archivingId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void archivePartner(p);
                          }}
                        >
                          {archivingId === p.id ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
