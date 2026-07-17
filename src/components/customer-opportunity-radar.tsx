"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
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
      const matchesQuery = !q || [row.customer_name,row.phone,row.city,row.last_product_name,row.most_purchased_product,row.opportunity_label].some((value) => value?.toLocaleLowerCase("pt-BR").includes(q));
      const matchesPriority = priority === "Todas" || row.opportunity_priority === priority;
      const matchesSource = source === "all" || (source === "appsheet" ? row.priority_source.includes("AppSheet") : source === "repurchase" ? row.opportunity_label.startsWith("Recompra") : source === "lead" ? row.opportunity_label.includes("Lead") : true);
      return matchesQuery && matchesPriority && matchesSource;
    });
  }, [rows, query, priority, source]);

  return (
    <article className="panel opportunity-radar-panel">
      <div className="opportunity-radar-toolbar">
        <label className="inventory-search opportunity-radar-search"><Search size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar cliente, produto ou oportunidade..."/></label>
        <select className="select" value={priority} onChange={(event)=>setPriority(event.target.value as (typeof priorities)[number])}>{priorities.map((item)=><option key={item}>{item}</option>)}</select>
        <select className="select" value={source} onChange={(event)=>setSource(event.target.value)}>
          <option value="all">Todas as origens</option>
          <option value="appsheet">Prioridade AppSheet/CRM</option>
          <option value="repurchase">Recompra provável</option>
          <option value="lead">Leads</option>
        </select>
        <span className="inventory-result-count">{filtered.length} possível(is) cliente(s)</span>
      </div>
      <div className="table-wrap">
        <table className="opportunity-radar-table">
          <thead><tr><th>Prioridade</th><th>Cliente</th><th>Oportunidade</th><th>Último produto</th><th>Janela estimada</th><th>Histórico</th><th>Próxima ação</th></tr></thead>
          <tbody>
            {filtered.map((row)=><tr key={row.customer_id}>
              <td><span className={`badge ${priorityClass(row.opportunity_priority)}`}>{row.opportunity_priority}</span><small className="radar-source-label">{row.priority_source}</small></td>
              <td><Link className="table-link" href={`/clientes/${row.customer_id}`}>{row.customer_name}</Link><small>{row.city || row.phone || "Não informado"}</small>{row.care_alert&&<span className="radar-care-alert"><ShieldAlert size={12}/>Atendimento com cuidado</span>}</td>
              <td><strong>{row.opportunity_label}</strong><small>Score {row.opportunity_score}</small></td>
              <td><strong>{row.last_product_name || "Não informado"}</strong><small>Mais comprado: {row.most_purchased_product || "Não informado"}</small></td>
              <td><strong>{row.expected_repurchase_on ? formatDateOnly(row.expected_repurchase_on) : "Não estimada"}</strong><small>{row.days_to_repurchase == null ? "Sem duração cadastrada" : row.days_to_repurchase < 0 ? `${Math.abs(row.days_to_repurchase)} dia(s) após a janela` : `${row.days_to_repurchase} dia(s) para a janela`}</small></td>
              <td><strong>{row.purchase_count} compra(s)</strong><small>{formatCurrency(row.total_spent)} gastos · {row.days_since_last_purchase ?? "—"} dia(s) sem comprar</small></td>
              <td><span className="radar-action-text">{row.recommended_action}</span></td>
            </tr>)}
            {filtered.length===0&&<tr><td colSpan={7}><div className="empty compact-empty"><strong>Nenhuma oportunidade neste filtro</strong>Ajuste a busca ou os filtros do Radar.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </article>
  );
}
