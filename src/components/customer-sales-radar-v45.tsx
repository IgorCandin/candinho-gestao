"use client";

import { PackageSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SalesOpportunityCard } from "@/components/sales-opportunity-card";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

type TabKey = "today" | "recompra" | "creatina_candinho" | "produto_complementar" | "all";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "today", label: "🔥 Falar hoje" },
  { key: "recompra", label: "🔁 Recompras" },
  { key: "creatina_candinho", label: "Creatina Candinho" },
  { key: "produto_complementar", label: "🧩 Complementares" },
  { key: "all", label: "Todas" },
];

export function CustomerSalesRadarV45({
  opportunities,
  priorityCustomers,
}: {
  opportunities: SalesOpportunity[];
  priorityCustomers: SalesOpportunity[];
}) {
  const [tab, setTab] = useState<TabKey>("today");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const source =
      tab === "today"
        ? priorityCustomers
        : tab === "all"
          ? opportunities
          : opportunities.filter((row) => row.opportunity_group === tab);

    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return source;

    return source.filter((row) =>
      [
        row.customer_name,
        row.city,
        row.phone,
        row.recommended_product_name,
        row.source_product_name,
        row.reason,
        row.opportunity_subtype,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [opportunities, priorityCustomers, query, tab]);

  return (
    <section className="sales-radar-v45">
      <div className="sales-radar-tabs">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="sales-radar-toolbar">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente ou produto..."
          />
        </label>
        <span>{rows.length} oportunidade(s)</span>
      </div>

      <div className="sales-radar-list">
        {rows.map((row, index) => (
          <SalesOpportunityCard
            key={`${row.customer_id}-${row.recommended_product_id}-${row.opportunity_group}-${index}`}
            opportunity={row}
          />
        ))}

        {rows.length === 0 && (
          <div className="empty compact">
            <PackageSearch size={24} />
            <strong>Nenhuma oportunidade neste filtro</strong>
            O Radar respeita os feedbacks e pausas que você já registrou.
          </div>
        )}
      </div>
    </section>
  );
}
