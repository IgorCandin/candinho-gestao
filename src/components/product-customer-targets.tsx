"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SalesOpportunityCard } from "@/components/sales-opportunity-card";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

export function ProductCustomerTargets({
  rows,
}: {
  rows: SalesOpportunity[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return rows;

    return rows.filter((row) =>
      [row.customer_name, row.city, row.phone, row.reason, row.source_product_name]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [query, rows]);

  return (
    <section className="product-customer-targets-v45">
      <div className="sales-radar-toolbar">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente..."
          />
        </label>
        <span>{filtered.length} cliente(s)</span>
      </div>

      <div className="sales-radar-list">
        {filtered.map((row, index) => (
          <SalesOpportunityCard
            opportunity={row}
            key={`${row.customer_id}-${row.opportunity_group}-${index}`}
          />
        ))}
      </div>
    </section>
  );
}
