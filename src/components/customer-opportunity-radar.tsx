"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, History, PackageSearch, Search, ShieldAlert, UserRound } from "lucide-react";
import { RadarFollowupButton } from "@/components/radar-followup-button";
import type { CustomerOpportunityRadarRow } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

const priorities = ["Todas", "Alta", "Média", "Baixa"] as const;

function priorityClass(value: string) {
  if (value === "Alta") return "red";
  if (value === "Média") return "orange";
  return "gray";
}

export function CustomerOpportunityRadar({ rows }: { rows: CustomerOpportunityRadarRow[] }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("Todas");
  const [source, setSource] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [
          row.customer_name,
          row.phone,
          row.city,
          row.last_product_name,
          row.most_purchased_product,
          row.opportunity_label,
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(q));
      const matchesPriority = priority === "Todas" || row.opportunity_priority === priority;
      const matchesSource =
        source === "all" ||
        (source === "appsheet"
          ? row.priority_source.includes("AppSheet")
          : source === "repurchase"
            ? row.opportunity_label.startsWith("Recompra")
            : source === "lead"
              ? row.opportunity_label.includes("Lead")
              : true);
      return matchesQuery && matchesPriority && matchesSource;
    });
  }, [rows, query, priority, source]);

  return (
    <article className="panel opportunity-radar-panel">
      <div className="opportunity-radar-toolbar">
        <label className="inventory-search opportunity-radar-search">
          <Search size={16}/>
          <input
            value={query}
            onChange={(event)=>setQuery(event.target.value)}
            placeholder="Buscar cliente, produto ou oportunidade..."
          />
        </label>
        <select className="select" value={priority} onChange={(event)=>setPriority(event.target.value as (typeof priorities)[number])}>
          {priorities.map((item)=><option key={item}>{item}</option>)}
        </select>
        <select className="select" value={source} onChange={(event)=>setSource(event.target.value)}>
          <option value="all">Todas as origens</option>
          <option value="appsheet">Prioridade AppSheet/CRM</option>
          <option value="repurchase">Recompra provável</option>
          <option value="lead">Leads</option>
        </select>
        <span className="inventory-result-count">{filtered.length} possível(is) cliente(s)</span>
      </div>

      <div style={{ display: "grid", gap: 10, padding: 14 }}>
        {filtered.map((row) => (
          <article
            key={row.customer_id}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 14,
              background: "rgba(255,255,255,.016)",
              padding: 14,
              display: "grid",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className={`badge ${priorityClass(row.opportunity_priority)}`}>{row.opportunity_priority}</span>
                  <Link className="table-link" href={`/clientes/${row.customer_id}`} style={{ fontSize: 14, fontWeight: 850 }}>
                    {row.customer_name}
                  </Link>
                  {row.care_alert && <span className="radar-care-alert"><ShieldAlert size={12}/>Atendimento com cuidado</span>}
                </div>
                <small style={{ color: "var(--muted)" }}>{row.city || row.phone || "Não informado"} · {row.priority_source}</small>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong style={{ display: "block", fontSize: 13 }}>{row.opportunity_label}</strong>
                <small style={{ color: "var(--muted)" }}>Score {row.opportunity_score}</small>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 8,
              }}
            >
              <div style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 10, display: "grid", gap: 4 }}>
                <span style={{ color: "var(--muted)", fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}><PackageSearch size={13}/>ÚLTIMO PRODUTO</span>
                <strong style={{ fontSize: 11 }}>{row.last_product_name || "Não informado"}</strong>
                <small style={{ color: "var(--muted)", fontSize: 9 }}>Mais comprado: {row.most_purchased_product || "Não informado"}</small>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 10, display: "grid", gap: 4 }}>
                <span style={{ color: "var(--muted)", fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}><CalendarClock size={13}/>JANELA ESTIMADA</span>
                <strong style={{ fontSize: 11 }}>{row.expected_repurchase_on ? formatDateOnly(row.expected_repurchase_on) : "Não estimada"}</strong>
                <small style={{ color: "var(--muted)", fontSize: 9 }}>
                  {row.days_to_repurchase == null
                    ? "Sem duração cadastrada"
                    : row.days_to_repurchase < 0
                      ? `${Math.abs(row.days_to_repurchase)} dia(s) após a janela`
                      : `${row.days_to_repurchase} dia(s) para a janela`}
                </small>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 10, display: "grid", gap: 4 }}>
                <span style={{ color: "var(--muted)", fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}><History size={13}/>HISTÓRICO</span>
                <strong style={{ fontSize: 11 }}>{row.purchase_count} compra(s) · {formatCurrency(row.total_spent)}</strong>
                <small style={{ color: "var(--muted)", fontSize: 9 }}>{row.days_since_last_purchase ?? "—"} dia(s) sem comprar</small>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ minWidth: 0, display: "flex", alignItems: "flex-start", gap: 7, color: "#d7dce5", fontSize: 10, lineHeight: 1.5 }}>
                <UserRound size={14} style={{ flex: "0 0 auto", marginTop: 1 }}/>
                {row.recommended_action}
              </span>
              <RadarFollowupButton
                customerId={row.customer_id}
                customerName={row.customer_name}
                suggestedAction={row.recommended_action}
              />
            </div>
          </article>
        ))}

        {filtered.length===0 && (
          <div className="empty compact-empty">
            <strong>Nenhuma oportunidade neste filtro</strong>
            Ajuste a busca ou os filtros do Radar.
          </div>
        )}
      </div>
    </article>
  );
}
