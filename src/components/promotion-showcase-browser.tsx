"use client";

import Link from "next/link";
import { BadgePercent, CalendarDays, ImageIcon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PromotionShowcaseItem } from "@/lib/promotion-showcase-data";

type StatusFilter = "active" | "scheduled" | "all";
type OperationFilter = "all" | "supplements" | "fitness";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function PromotionShowcaseBrowser({
  items,
}: {
  items: PromotionShowcaseItem[];
}) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [operation, setOperation] = useState<OperationFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return items.filter((item) => {
      if (status !== "all" && item.promotion_status !== status) return false;
      if (operation !== "all" && item.operation_scope !== operation) return false;

      if (!query) return true;

      return `${item.item_label} ${item.promotion_name} ${item.category ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [items, operation, search, status]);

  const campaigns = useMemo(() => {
    const map = new Map<string, PromotionShowcaseItem[]>();

    for (const item of filtered) {
      const current = map.get(item.promotion_id) ?? [];
      current.push(item);
      map.set(item.promotion_id, current);
    }

    return [...map.values()];
  }, [filtered]);

  return (
    <div className="promotion-ux-showcase-browser">
      <div className="promotion-ux-showcase-toolbar">
        <div className="promotion-ux-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar produto ou campanha..."
          />
        </div>

        <div className="promotion-ux-segmented">
          {[
            ["active", "Ativas"],
            ["scheduled", "Em breve"],
            ["all", "Todas"],
          ].map(([value, label]) => (
            <button
              className={status === value ? "active" : ""}
              key={value}
              onClick={() => setStatus(value as StatusFilter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="promotion-ux-segmented">
          {[
            ["all", "Tudo"],
            ["supplements", "Suplementos"],
            ["fitness", "Fitness"],
          ].map(([value, label]) => (
            <button
              className={operation === value ? "active" : ""}
              key={value}
              onClick={() => setOperation(value as OperationFilter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="promotion-ux-empty large">
          <BadgePercent size={30} />
          <strong>Nenhuma promoção encontrada</strong>
          <span>Ajuste os filtros ou selecione “Todas”.</span>
        </div>
      ) : (
        <div className="promotion-ux-campaigns">
          {campaigns.map((campaignItems) => {
            const first = campaignItems[0];
            const isScheduled = first.promotion_status === "scheduled";

            return (
              <section className="promotion-ux-campaign" key={first.promotion_id}>
                <header>
                  <div>
                    <span className={isScheduled ? "scheduled" : "active"}>
                      {isScheduled ? "Em breve" : "Ativa agora"}
                    </span>
                    <h2>{first.promotion_name}</h2>
                    <p>
                      {campaignItems.length} produto(s)
                      {first.ends_on ? ` · até ${date(first.ends_on)}` : ""}
                    </p>
                  </div>

                  {first.starts_on && (
                    <div className="promotion-ux-campaign-date">
                      <CalendarDays size={15} />
                      <span>{date(first.starts_on)}{first.ends_on ? ` → ${date(first.ends_on)}` : ""}</span>
                    </div>
                  )}
                </header>

                <div className="promotion-ux-showcase-grid">
                  {campaignItems.map((item) => {
                    const hasDiscount = item.promotional_price < item.current_price;
                    const economy = Math.max(item.current_price - item.promotional_price, 0);

                    return (
                      <Link className="promotion-ux-showcase-card" href={`/promocoes/${item.id}`} key={item.id}>
                        <div className="promotion-ux-showcase-image">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt={item.item_label} />
                          ) : (
                            <ImageIcon size={30} />
                          )}

                          <span>{item.operation_scope === "supplements" ? "Suplementos" : "Fitness"}</span>
                          {hasDiscount && item.discount_pct > 0 && <b>-{item.discount_pct}%</b>}
                        </div>

                        <div className="promotion-ux-showcase-copy">
                          <small>{item.category ?? "Produto"}</small>
                          <strong>{item.item_label}</strong>

                          <div className="promotion-ux-showcase-price">
                            {hasDiscount && <span>{money(item.current_price)}</span>}
                            <b>{money(item.promotional_price)}</b>
                          </div>

                          {economy > 0 && <em>Economize {money(economy)}</em>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
