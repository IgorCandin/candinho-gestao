/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, ImageIcon, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { SortableHeader } from "@/components/sortable-header";
import { formatDateOnly } from "@/lib/format";
import type { LeadRow } from "@/lib/types";

type SortKey = "customer_name" | "product_summary" | "lead_date" | "lead_status";
type SortState = { key: SortKey; direction: "asc" | "desc" };

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", "pt-BR");
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ key: "lead_date", direction: "desc" });

  const sortedLeads = useMemo(() => [...leads].sort((a, b) => {
    let result = 0;
    if (sort.key === "customer_name") result = compareText(a.customer_name, b.customer_name);
    if (sort.key === "product_summary") result = compareText(a.product_summary, b.product_summary);
    if (sort.key === "lead_date") result = compareText(a.lead_date, b.lead_date);
    if (sort.key === "lead_status") result = compareText(a.lead_status, b.lead_status);
    return sort.direction === "asc" ? result : -result;
  }), [leads, sort]);

  function changeSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "lead_date" ? "desc" : "asc" });
  }

  function openLead(id: string) {
    router.push(`/leads/${id}`);
  }

  return <div className="table-wrap"><table className="leads-table"><thead><tr>
    <th><SortableHeader label="Cliente" active={sort.key === "customer_name"} direction={sort.direction} onClick={() => changeSort("customer_name")} /></th>
    <th><SortableHeader label="Produto" active={sort.key === "product_summary"} direction={sort.direction} onClick={() => changeSort("product_summary")} /></th>
    <th><SortableHeader label="Data do orçamento" active={sort.key === "lead_date"} direction={sort.direction} onClick={() => changeSort("lead_date")} /></th>
    <th><SortableHeader label="Status do lead" active={sort.key === "lead_status"} direction={sort.direction} onClick={() => changeSort("lead_status")} /></th>
    <th>Contato</th><th>Observações</th><th />
  </tr></thead><tbody>
    {sortedLeads.map((lead) => <tr
      key={`${lead.id}:${lead.item_id ?? lead.primary_product_id ?? "lead"}`}
      className="clickable-data-row"
      role="link"
      tabIndex={0}
      onClick={() => openLead(lead.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLead(lead.id);
        }
      }}
    >
      <td><div className="lead-customer-cell"><div className="lead-product-thumb">{lead.primary_image_url ? <img src={lead.primary_image_url} alt="" /> : <ImageIcon size={19} />}</div><div>{lead.customer_id ? <Link onClick={(event) => event.stopPropagation()} className="cell-main table-link" href={`/clientes/${lead.customer_id}`}>{lead.customer_name}</Link> : <span className="cell-main">{lead.customer_name}</span>}{lead.city && <div className="cell-sub">{lead.city}</div>}</div></div></td>
      <td>{lead.primary_product_id ? <Link onClick={(event) => event.stopPropagation()} className="table-link" href={`/produtos/${lead.primary_product_id}`}>{lead.product_summary ?? "Produto"}</Link> : lead.product_summary ?? "—"}</td>
      <td>{formatDateOnly(lead.lead_date)}</td>
      <td><Badge value={lead.lead_status ?? lead.general_status} /></td>
      <td>{lead.phone ? <span className="detail-with-icon"><Phone size={14} />{lead.phone}</span> : <span className="muted-value">—</span>}</td>
      <td><span className="table-note">{lead.notes ?? lead.reference ?? "—"}</span></td>
      <td><Link onClick={(event) => event.stopPropagation()} className="icon-link" href={`/leads/${lead.id}`} aria-label={`Abrir lead de ${lead.customer_name}`}><ArrowRight size={18} /></Link></td>
    </tr>)}
  </tbody></table></div>;
}
