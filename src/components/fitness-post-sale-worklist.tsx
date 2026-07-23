"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronRight, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Row = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  instagram: string | null;
  city: string | null;
  cycle_started_on: string;
  last_sale_on: string;
  sale_count: number;
  product_summary: string;
  total_amount: number;
  due_on: string;
  status: "overdue" | "today" | "upcoming";
  ai_last_message: string | null;
};

type Filter = "action" | "upcoming" | "all";

export function FitnessPostSaleWorklist({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Filter>("action");

  const counts = useMemo(() => ({
    action: rows.filter((row) => row.status === "overdue" || row.status === "today").length,
    upcoming: rows.filter((row) => row.status === "upcoming").length,
    all: rows.length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "action") return row.status === "overdue" || row.status === "today";
    return row.status === "upcoming";
  }), [filter, rows]);

  return (
    <div className="post-sale-worklist">
      <div className="post-sale-filter-row">
        <button className={filter === "action" ? "active" : ""} type="button" onClick={() => setFilter("action")}>
          Agir agora · {counts.action}
        </button>
        <button className={filter === "upcoming" ? "active" : ""} type="button" onClick={() => setFilter("upcoming")}>
          Próximos · {counts.upcoming}
        </button>
        <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>
          Todos · {counts.all}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty compact">
          <CheckCircle2 size={26}/>
          <strong>Nenhum pós-venda neste filtro</strong>
          Os próximos ciclos aparecem automaticamente 30 dias após a compra mais recente.
        </div>
      ) : (
        <div className="post-sale-card-list">
          {filtered.map((row) => (
            <Link className="post-sale-card-v2" href={`/fitness/pos-venda/${row.customer_id}`} key={row.customer_id}>
              <div>
                <strong>{row.customer_name}</strong>
                <span>{row.product_summary}</span>
                <small>{row.customer_phone ?? row.instagram ?? row.city ?? "Sem contato cadastrado"}</small>
              </div>

              <div>
                <strong>
                  {row.status === "overdue"
                    ? `Atrasado · previsto para ${formatDateOnly(row.due_on)}`
                    : row.status === "today"
                      ? "Contato previsto para hoje"
                      : `Próximo contato em ${formatDateOnly(row.due_on)}`}
                </strong>
                <span>
                  {row.sale_count} compra(s) neste ciclo · última em {formatDateOnly(row.last_sale_on)} · {formatCurrency(Number(row.total_amount))}
                </span>
              </div>

              <div className="post-sale-card-actions">
                <span className={`badge ${row.status === "overdue" ? "red" : row.status === "today" ? "orange" : "gray"}`}>
                  {row.status === "overdue" ? <CalendarClock size={12}/> : <MessageSquareText size={12}/>}
                  {row.status === "overdue" ? "Atrasado" : row.status === "today" ? "Hoje" : "Agendado"}
                </span>
                {row.ai_last_message && <span className="badge green">Nexus pronto</span>}
                <ChevronRight size={16}/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
