/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  ImageOff,
  LayoutGrid,
  Rows3,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FitnessProductRow } from "@/lib/types";

export type FitnessAvailabilityOption = {
  size: string;
  color: string;
  available_quantity: number;
};

type FitnessCatalogProduct = FitnessProductRow & {
  regular_min_sale_price?: number;
  regular_max_sale_price?: number;
  promotion_price_from?: number | null;
  promotion_price_to?: number | null;
  promotion_name?: string | null;
  promotion_ends_on?: string | null;
  promotion_variant_count?: number;
  available_options?: FitnessAvailabilityOption[];
};

type ViewMode = "deck" | "gallery";

function stockBorder(product: FitnessCatalogProduct) {
  if (product.available_quantity > 0) return "available";
  if (product.incoming_quantity > 0) return "incoming";
  return "empty";
}

function hasPromotion(product: FitnessCatalogProduct) {
  return (
    product.available_quantity > 0 &&
    product.promotion_price_from != null &&
    Number(product.promotion_variant_count ?? 0) > 0
  );
}

function regularPriceLabel(product: FitnessCatalogProduct) {
  const min = Number(product.regular_min_sale_price ?? product.min_sale_price);
  const max = Number(product.regular_max_sale_price ?? product.max_sale_price);

  return Math.abs(min - max) < 0.01
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function priceLabel(product: FitnessCatalogProduct) {
  if (hasPromotion(product)) {
    const from = Number(product.promotion_price_from ?? product.min_sale_price);
    const to = Number(product.promotion_price_to ?? from);

    return Math.abs(from - to) < 0.01
      ? formatCurrency(from)
      : `${formatCurrency(from)} – ${formatCurrency(to)}`;
  }

  return product.min_sale_price === product.max_sale_price
    ? formatCurrency(product.min_sale_price)
    : `${formatCurrency(product.min_sale_price)} – ${formatCurrency(
        product.max_sale_price,
      )}`;
}

function statusLabel(product: FitnessCatalogProduct) {
  if (!product.active) {
    return { label: "Inativo", tone: "gray" };
  }

  if (product.available_quantity > 0 && product.incoming_quantity > 0) {
    return { label: "Disponível + reposição", tone: "green" };
  }

  if (product.available_quantity > 0) {
    return { label: "Disponível", tone: "green" };
  }

  if (product.incoming_quantity > 0) {
    return { label: "A caminho", tone: "orange" };
  }

  return { label: "Sem estoque", tone: "red" };
}

function PromotionBadge({ product }: { product: FitnessCatalogProduct }) {
  if (!hasPromotion(product)) return null;

  return (
    <span className="operation-promotion-badge fitness-promotion-badge">
      <BadgePercent size={12} />
      Promoção
    </span>
  );
}

function AvailabilityCard({
  options,
  compact = false,
}: {
  options: FitnessAvailabilityOption[] | undefined;
  compact?: boolean;
}) {
  const available = (options ?? []).filter(
    (option) => option.available_quantity > 0,
  );

  if (available.length === 0) return null;

  const visible = available.slice(0, compact ? 3 : 4);
  const remaining = available.length - visible.length;

  return (
    <div
      className={`fitness-availability-strip ${
        compact ? "compact" : ""
      }`}
      aria-label="Tamanhos e cores disponíveis"
    >
      <span className="fitness-availability-label">
        Disponível em
      </span>

      <div className="fitness-availability-chips">
        {visible.map((option) => (
          <span
            className="fitness-availability-chip"
            key={`${option.size}:${option.color}`}
          >
            {option.size} · {option.color}
          </span>
        ))}

        {remaining > 0 && (
          <span className="fitness-availability-chip more">
            +{remaining}
          </span>
        )}
      </div>
    </div>
  );
}

export function FitnessProductCatalog({
  products,
  salesMode = false,
}: {
  products: FitnessCatalogProduct[];
  salesMode?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category))).sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");

    return products
      .filter(
        (product) =>
          !q ||
          `${product.name} ${product.category} ${product.description ?? ""} ${product.promotion_name ?? ""} ${(product.available_options ?? [])
            .map((option) => `${option.size} ${option.color}`)
            .join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(q),
      )
      .filter(
        (product) => category === "all" || product.category === category,
      )
      .filter((product) => {
        if (stock === "all") return true;
        if (stock === "available") return product.available_quantity > 0;
        if (stock === "incoming") return product.incoming_quantity > 0;
        if (stock === "promotion") return hasPromotion(product);

        return (
          product.available_quantity === 0 && product.incoming_quantity === 0
        );
      })
      .sort(
        (a, b) =>
          Number(hasPromotion(b)) - Number(hasPromotion(a)) ||
          Number(b.available_quantity > 0) -
            Number(a.available_quantity > 0) ||
          Number(b.incoming_quantity > 0) -
            Number(a.incoming_quantity > 0) ||
          a.category.localeCompare(b.category, "pt-BR") ||
          a.name.localeCompare(b.name, "pt-BR"),
      );
  }, [products, query, category, stock]);

  return (
    <article className="panel product-catalog-panel">
      <div className="product-catalog-toolbar">
        <label className="product-catalog-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar peça, modelo, tamanho, cor ou categoria"
          />
        </label>

        <select
          className="select product-filter-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="select product-filter-select"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="promotion">Em promoção</option>
          <option value="available">Disponíveis</option>
          <option value="incoming">A caminho</option>
          <option value="empty">Sem estoque</option>
        </select>

        <div className="product-view-toggle" aria-label="Modo de visualização">
          <button
            className={viewMode === "gallery" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("gallery")}
          >
            <LayoutGrid size={15} /> Fotos
          </button>
          <button
            className={viewMode === "deck" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("deck")}
          >
            <Rows3 size={15} /> Lista
          </button>
        </div>

        <span className="product-result-count">
          {filtered.length} produto{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {salesMode && (
        <div className="sales-profile-note">
          <strong>Perfil Vendas</strong>
          <span>
            Consulta rápida de foto, preço, tamanho, cor e disponibilidade.
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nenhum produto encontrado</strong>
          Altere os filtros ou a busca.
        </div>
      ) : viewMode === "gallery" ? (
        <div className="product-gallery-grid product-gallery-grid-responsive fitness-gallery-grid zoom-4 show-details">
          {filtered.map((product) => {
            const status = statusLabel(product);

            return (
              <Link
                key={product.id}
                href={
                  salesMode
                    ? "/fitness/produtos"
                    : `/fitness/produtos/${product.id}`
                }
                className={`product-gallery-card stock-${stockBorder(product)} ${
                  hasPromotion(product) ? "has-operation-promotion" : ""
                }`}
              >
                <div className="product-gallery-image">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={30} />
                  )}
                  <PromotionBadge product={product} />
                </div>

                <div className="product-gallery-copy">
                  <div className="product-gallery-heading">
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>

                  <div className="product-gallery-price">
                    {hasPromotion(product) && (
                      <s>{regularPriceLabel(product)}</s>
                    )}
                    <strong>{priceLabel(product)}</strong>
                  </div>

                  <AvailabilityCard options={product.available_options} />

                  <div className="product-gallery-stock">
                    <span>
                      Disponível <b>{product.available_quantity}</b>
                    </span>
                    {product.incoming_quantity > 0 && (
                      <span>
                        A caminho <b>{product.incoming_quantity}</b>
                      </span>
                    )}
                  </div>

                  <span className={`badge ${status.tone}`}>
                    <span className="dot" /> {status.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="products-table product-catalog-table fitness-product-deck">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Disponível</th>
                <th>A caminho</th>
                <th>Preço</th>
                <th>Situação</th>
                <th aria-label="Abrir produto" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const status = statusLabel(product);

                return (
                  <tr
                    className={
                      hasPromotion(product)
                        ? "has-operation-promotion"
                        : ""
                    }
                    key={product.id}
                  >
                    <td>
                      <Link
                        className="product-cell product-link"
                        href={
                          salesMode
                            ? "/fitness/produtos"
                            : `/fitness/produtos/${product.id}`
                        }
                      >
                        {product.image_url ? (
                          <img
                            className="product-thumb"
                            src={product.image_url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="product-avatar">
                            <ImageOff size={17} />
                          </span>
                        )}
                        <div>
                          <div className="cell-main product-name-with-promo">
                            {product.name}
                            <PromotionBadge product={product} />
                          </div>
                          <div className="cell-sub">
                            {product.category}
                          </div>
                          <AvailabilityCard
                            options={product.available_options}
                            compact
                          />
                        </div>
                      </Link>
                    </td>
                    <td>
                      <strong
                        className={
                          product.available_quantity > 0
                            ? "positive"
                            : "muted-number"
                        }
                      >
                        {product.available_quantity}
                      </strong>
                    </td>
                    <td>
                      <strong
                        className={
                          product.incoming_quantity > 0
                            ? "incoming-text"
                            : "muted-number"
                        }
                      >
                        {product.incoming_quantity}
                      </strong>
                    </td>
                    <td className="amount">
                      <div className="operation-promo-price compact">
                        {hasPromotion(product) && (
                          <s>{regularPriceLabel(product)}</s>
                        )}
                        <strong>{priceLabel(product)}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${status.tone}`}>
                        <span className="dot" /> {status.label}
                      </span>
                    </td>
                    <td>
                      {!salesMode && (
                        <Link
                          className="icon-link"
                          href={`/fitness/produtos/${product.id}`}
                          aria-label={`Abrir ${product.name}`}
                        >
                          <ArrowRight size={17} />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
