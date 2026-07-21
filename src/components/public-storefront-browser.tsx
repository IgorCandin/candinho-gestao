"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  PackageCheck,
  PackageOpen,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type {
  PublicStorefrontProduct,
  PublicStorefrontPromotion,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";

type Operation = "all" | "supplements" | "fitness";
type ViewMode = "products" | "promotions";
type SortMode = "name" | "price_asc" | "price_desc";

function text(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase("pt-BR");
}

function ProductPrice({ item }: { item: PublicStorefrontProduct }) {
  if (Math.abs(item.price_from - item.price_to) < 0.01) {
    return <strong>{formatCurrency(item.price_from)}</strong>;
  }

  return (
    <strong>
      {formatCurrency(item.price_from)} — {formatCurrency(item.price_to)}
    </strong>
  );
}

function ProductCard({ item }: { item: PublicStorefrontProduct }) {
  return (
    <article className="public-storefront-card">
      <div className="public-storefront-card-image">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <PackageOpen size={38} />
        )}
        <span className="public-storefront-available">
          <PackageCheck size={13} />
          Disponível
        </span>
      </div>

      <div className="public-storefront-card-copy">
        <small>{item.category ?? "Produto"}</small>
        <h3>{item.name}</h3>
        <ProductPrice item={item} />
      </div>
    </article>
  );
}

function PromotionCard({ item }: { item: PublicStorefrontPromotion }) {
  const hasDiscount = item.promotional_price < item.current_price;

  return (
    <article className="public-storefront-card public-storefront-promotion-card">
      <div className="public-storefront-card-image">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <BadgePercent size={38} />
        )}

        <span className="public-storefront-promo-badge">
          {item.promotion_status === "scheduled" ? "Em breve" : "Promoção"}
        </span>

        {hasDiscount && item.discount_pct > 0 && (
          <b className="public-storefront-discount">
            -{Math.round(item.discount_pct)}%
          </b>
        )}
      </div>

      <div className="public-storefront-card-copy">
        <small>{item.promotion_name}</small>
        <h3>{item.name}</h3>
        <div className="public-storefront-promotion-price">
          {hasDiscount && <span>{formatCurrency(item.current_price)}</span>}
          <strong>{formatCurrency(item.promotional_price)}</strong>
        </div>
      </div>
    </article>
  );
}

export function PublicStorefrontBrowser({
  snapshot,
}: {
  snapshot: PublicStorefrontSnapshot;
}) {
  const [view, setView] = useState<ViewMode>("products");
  const [operation, setOperation] = useState<Operation>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("name");

  const categories = useMemo(() => {
    if (operation === "supplements") return snapshot.categories.supplements;
    if (operation === "fitness") return snapshot.categories.fitness;
    return [...new Set([
      ...snapshot.categories.supplements,
      ...snapshot.categories.fitness,
    ])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [operation, snapshot.categories]);

  const productFilter = (item: PublicStorefrontProduct) =>
    (operation === "all" || item.operation === operation) &&
    (category === "all" || item.category === category) &&
    (!query.trim() ||
      text(item.name).includes(text(query)) ||
      text(item.category).includes(text(query)));

  const promotionFilter = (item: PublicStorefrontPromotion) =>
    (operation === "all" || item.operation === operation) &&
    (category === "all" || item.category === category) &&
    (!query.trim() ||
      text(item.name).includes(text(query)) ||
      text(item.category).includes(text(query)) ||
      text(item.promotion_name).includes(text(query)));

  const sortProducts = (items: PublicStorefrontProduct[]) =>
    [...items].sort((a, b) => {
      if (sort === "price_asc") return a.price_from - b.price_from;
      if (sort === "price_desc") return b.price_from - a.price_from;
      return a.name.localeCompare(b.name, "pt-BR");
    });

  const sortPromotions = (items: PublicStorefrontPromotion[]) =>
    [...items].sort((a, b) => {
      if (sort === "price_asc") return a.promotional_price - b.promotional_price;
      if (sort === "price_desc") return b.promotional_price - a.promotional_price;
      return a.name.localeCompare(b.name, "pt-BR");
    });

  const supplementProducts = sortProducts(
    snapshot.products.supplements.filter(productFilter),
  );
  const fitnessProducts = sortProducts(
    snapshot.products.fitness.filter(productFilter),
  );
  const supplementPromotions = sortPromotions(
    snapshot.promotions.supplements.filter(promotionFilter),
  );
  const fitnessPromotions = sortPromotions(
    snapshot.promotions.fitness.filter(promotionFilter),
  );

  const blocks = view === "products"
    ? [
        { key: "supplements", title: "Suplementos", items: supplementProducts },
        { key: "fitness", title: "Fitness", items: fitnessProducts },
      ]
    : [
        { key: "supplements", title: "Suplementos", items: supplementPromotions },
        { key: "fitness", title: "Fitness", items: fitnessPromotions },
      ];

  return (
    <>
      <section className="public-storefront-toolbar">
        <div className="public-storefront-view-tabs">
          <button
            className={view === "products" ? "active" : ""}
            type="button"
            onClick={() => setView("products")}
          >
            <PackageCheck size={16} />
            Produtos
          </button>
          <button
            className={view === "promotions" ? "active" : ""}
            type="button"
            onClick={() => setView("promotions")}
          >
            <BadgePercent size={16} />
            Promoções
          </button>
        </div>

        <label className="public-storefront-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou categoria..."
          />
        </label>

        <div className="public-storefront-filters">
          <div className="public-storefront-operation-filter">
            {([
              ["all", "Todos"],
              ["supplements", "Suplementos"],
              ["fitness", "Fitness"],
            ] as const).map(([value, label]) => (
              <button
                className={operation === value ? "active" : ""}
                type="button"
                key={value}
                onClick={() => {
                  setOperation(value);
                  setCategory("all");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label>
            <SlidersHorizontal size={15} />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
            >
              <option value="name">Ordenar por nome</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </label>
        </div>
      </section>

      <div className="public-storefront-blocks">
        {blocks
          .filter((block) => operation === "all" || block.key === operation)
          .map((block) => (
            <section className="public-storefront-block" key={`${view}-${block.key}`}>
              <header>
                <div>
                  <span>{view === "products" ? "Disponíveis agora" : "Campanhas"}</span>
                  <h2>{block.title}</h2>
                </div>
                <b>{block.items.length}</b>
              </header>

              {block.items.length === 0 ? (
                <div className="public-storefront-empty">
                  {view === "products" ? <PackageOpen size={25} /> : <BadgePercent size={25} />}
                  <strong>
                    {view === "products"
                      ? "Nenhum produto encontrado com estes filtros."
                      : "Nenhuma promoção disponível com estes filtros."}
                  </strong>
                </div>
              ) : (
                <div className="public-storefront-grid">
                  {view === "products"
                    ? (block.items as PublicStorefrontProduct[]).map((item) => (
                        <ProductCard item={item} key={`${item.operation}-${item.id}`} />
                      ))
                    : (block.items as PublicStorefrontPromotion[]).map((item) => (
                        <PromotionCard item={item} key={`${item.operation}-${item.id}`} />
                      ))}
                </div>
              )}
            </section>
          ))}
      </div>
    </>
  );
}
