"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { SortableHeader } from "@/components/sortable-header";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import type { Customer } from "@/lib/types";

type SortKey = "name" | "city" | "purchase_count" | "lead_count" | "total_spent" | "last_purchase_at" | "next_followup_at" | "radar_rank";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const RADAR_OPTIONS = [
  ["all", "Todos"],
  ["overdue_followup", "Retorno atrasado"],
  ["due_today", "Retornar hoje"],
  ["pending_order", "Pedido pendente"],
  ["lead_only", "Somente lead"],
  ["inactive", "Inativos"],
  ["care", "Cuidados"],
  ["lost", "Contato perdido"],
  ["active", "Ativos"],
] as const;

const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").startsWith("55") ? phone.replace(/\D/g, "") : `55${phone.replace(/\D/g, "")}`}`;

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [sort, setSort] = useState<SortState>({ key: "radar_rank", direction: "asc" });
  const [query, setQuery] = useState("");
  const [radar, setRadar] = useState("all");
  const [city, setCity] = useState("all");

  const cities = useMemo(
    () => [...new Set(customers.map((customer) => customer.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [customers],
  );

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return [...customers]
      .filter((customer) => {
        const matchesQuery = !normalized || [customer.name, customer.phone, customer.city, customer.tags, customer.last_contact_outcome]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalized));
        const matchesRadar = radar === "all" || customer.radar_status === radar;
        const matchesCity = city === "all" || customer.city === city;
        return matchesQuery && matchesRadar && matchesCity;
      })
      .sort((a, b) => {
        let result = 0;
        if (["name", "city", "last_purchase_at", "next_followup_at"].includes(sort.key)) {
          result = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), "pt-BR", { sensitivity: "base", numeric: true });
        } else {
          result = Number(a[sort.key]) - Number(b[sort.key]);
        }
        return sort.direction === "asc" ? result : -result;
      });
  }, [customers, query, radar, city, sort]);

  const changeSort = (key: SortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  return (
    <>
      <div className="crm-toolbar">
        <label className="search-field crm-search">
          <Search size={17} />
          <input className="input" placeholder="Buscar cliente, telefone, cidade ou etiqueta" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="crm-filter-field">
          <SlidersHorizontal size={16} />
          <select className="select" value={radar} onChange={(event) => setRadar(event.target.value)}>
            {RADAR_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <select className="select" value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="all">Todas as cidades</option>
          {cities.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <span className="crm-result-count">{rows.length} cliente(s)</span>
      </div>

      <div className="table-wrap">
        <table className="customers-table crm-customers-table">
          <thead>
            <tr>
              <th><SortableHeader label="Cliente" active={sort.key === "name"} direction={sort.direction} onClick={() => changeSort("name")} /></th>
              <th><SortableHeader label="Radar" active={sort.key === "radar_rank"} direction={sort.direction} onClick={() => changeSort("radar_rank")} /></th>
              <th><SortableHeader label="Próxima ação" active={sort.key === "next_followup_at"} direction={sort.direction} onClick={() => changeSort("next_followup_at")} /></th>
              <th><SortableHeader label="Compras" active={sort.key === "purchase_count"} direction={sort.direction} onClick={() => changeSort("purchase_count")} /></th>
              <th><SortableHeader label="Total gasto" active={sort.key === "total_spent"} direction={sort.direction} onClick={() => changeSort("total_spent")} /></th>
              <th><SortableHeader label="Última compra" active={sort.key === "last_purchase_at"} direction={sort.direction} onClick={() => changeSort("last_purchase_at")} /></th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link className="product-cell product-link" href={`/clientes/${customer.id}`}>
                    <span className="product-avatar">{customer.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <div className="cell-main">{customer.name}</div>
                      <div className="cell-sub">{customer.city ?? "Cidade não informada"}{customer.phone ? ` · ${customer.phone}` : ""}</div>
                      {customer.tags && <div className="crm-tags-inline">{customer.tags}</div>}
                    </div>
                  </Link>
                </td>
                <td>
                  <div className="crm-radar-cell">
                    <Badge value={customer.radar_status} />
                    {customer.care_alert && <Badge value="care" />}
                  </div>
                </td>
                <td>
                  <div className="crm-next-action">
                    <strong>{customer.next_action_label}</strong>
                    <span>{customer.next_followup_at ? formatDateOnly(customer.next_followup_at) : customer.last_contact_outcome ?? "Sem retorno agendado"}</span>
                  </div>
                </td>
                <td>
                  <strong>{customer.purchase_count}</strong>
                  <span className="crm-cell-note">{customer.lead_count} lead(s)</span>
                </td>
                <td className="amount">{formatCurrency(customer.total_spent)}</td>
                <td>
                  <span>{formatDate(customer.last_purchase_at)}</span>
                  {customer.days_since_last_purchase != null && <span className="crm-cell-note">há {customer.days_since_last_purchase} dia(s)</span>}
                </td>
                <td>
                  <div className="table-actions">
                    {customer.phone && <a className="icon-link" href={wa(customer.phone)} target="_blank" rel="noreferrer" aria-label={`Chamar ${customer.name} no WhatsApp`}><MessageCircle size={17} /></a>}
                    <Link className="icon-link" href={`/clientes/${customer.id}`} aria-label={`Abrir ficha de ${customer.name}`}><ArrowRight size={18} /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="empty compact"><strong>Nenhum cliente encontrado</strong>Ajuste os filtros ou a busca.</div>}
    </>
  );
}
