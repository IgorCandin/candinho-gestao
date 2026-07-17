"use client";

import Link from "next/link";
import { CheckCircle2, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProductDataQualityRow } from "@/lib/types";

export function ProductDataQualityTable({ rows }: { rows: ProductDataQualityRow[] }) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<"all"|"incomplete"|"critical">("incomplete");
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row)=>!q||`${row.name} ${row.category} ${row.brand??""}`.toLocaleLowerCase("pt-BR").includes(q))
      .filter((row)=>filter==="all"||filter==="incomplete"?filter==="all"||row.missing_fields.length>0:row.completion_pct<55)
      .sort((a,b)=>a.completion_pct-b.completion_pct||a.name.localeCompare(b.name,"pt-BR"));
  },[rows,query,filter]);
  return <article className="panel data-quality-panel">
    <div className="product-catalog-toolbar">
      <label className="product-catalog-search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar produto"/></label>
      <select className="select product-filter-select" value={filter} onChange={(e)=>setFilter(e.target.value as typeof filter)}>
        <option value="incomplete">Com dados faltando</option><option value="critical">Mais incompletos</option><option value="all">Todos</option>
      </select>
      <span className="product-result-count">{filtered.length} produto(s)</span>
    </div>
    <div className="table-wrap"><table className="table data-quality-table"><thead><tr><th>Produto</th><th>Preenchimento</th><th>Falta preencher</th><th></th></tr></thead><tbody>{filtered.map((row)=><tr key={row.id}>
      <td><strong>{row.name}</strong><small className="crm-cell-note">{row.category}{row.brand?` · ${row.brand}`:""}</small></td>
      <td><div className="quality-score"><div><span style={{width:`${row.completion_pct}%`}}/></div><strong>{row.completion_pct}%</strong></div></td>
      <td>{row.missing_fields.length===0?<span className="quality-complete"><CheckCircle2 size={14}/>Completo</span>:<div className="quality-missing"><TriangleAlert size={14}/><span>{row.missing_fields.join(" · ")}</span></div>}</td>
      <td><Link className="button ghost compact-button" href={`/produtos/${row.id}/editar`}>Preencher</Link></td>
    </tr>)}</tbody></table></div>
  </article>;
}
