/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  BadgePercent,
  Eye,
  EyeOff,
  ImageOff,
  LayoutGrid,
  Rows3,
  Search,
  Truck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ProductCatalogRow } from "@/lib/types";

type CatalogProduct = ProductCatalogRow & {
  regular_sale_price?: number;
  regular_installment_price?: number;
  promotion_price?: number | null;
  promotion_name?: string | null;
  promotion_ends_on?: string | null;
  promotion_discount_pct?: number;
};

type SortKey =
  | "commercial"
  | "name"
  | "category"
  | "available"
  | "incoming"
  | "cash"
  | "installment"
  | "status";
type SortDirection = "asc" | "desc";
type ViewMode = "deck" | "gallery";

function stockLabel(product: CatalogProduct) {
  if (!product.active) return { label: "Inativo", tone: "gray" };
  if (product.available_quantity > 0 && product.incoming_quantity > 0) {
    return { label: "Disponível + reposição", tone: "green" };
  }
  if (product.available_quantity > 0) {
    return { label: "Disponível", tone: "green" };
  }
  if (product.incoming_quantity > 0) {
    return { label: "A caminho", tone: "orange" };
  }
  if (product.reserved_quantity > 0) {
    return { label: "Reservado", tone: "orange" };
  }
  return { label: "Sem estoque", tone: "red" };
}

function stockBorder(product: CatalogProduct) {
  if (product.available_quantity > 0) return "available";
  if (product.incoming_quantity > 0) return "incoming";
  return "empty";
}

function isLegacyCombo(product: CatalogProduct) {
  const brand = (product.brand ?? "").trim().toLocaleLowerCase("pt-BR");
  const name = product.name.trim().toLocaleLowerCase("pt-BR");
  return brand === "combo" || name.startsWith("combo ");
}

function hasPromotion(product: CatalogProduct) {
  return (
    product.promotion_price != null &&
    product.available_quantity > 0 &&
    Number(product.promotion_price) < Number(product.regular_sale_price ?? Infinity)
  );
}

function regularCash(product: CatalogProduct) {
  return Number(product.regular_sale_price ?? product.sale_price);
}

function compare(a: CatalogProduct, b: CatalogProduct, key: SortKey) {
  if (key === "commercial") {
    return (
      a.flagship_rank - b.flagship_rank ||
      a.availability_rank - b.availability_rank ||
      a.category_rank - b.category_rank ||
      b.total_sold - a.total_sold ||
      a.name.localeCompare(b.name, "pt-BR")
    );
  }
  if (key === "name") return a.name.localeCompare(b.name, "pt-BR");
  if (key === "category") return a.category.localeCompare(b.category, "pt-BR");
  if (key === "available") return a.available_quantity - b.available_quantity;
  if (key === "incoming") return a.incoming_quantity - b.incoming_quantity;
  if (key === "cash") return a.sale_price - b.sale_price;
  if (key === "installment") {
    return a.installment_price - b.installment_price;
  }
  return stockLabel(a).label.localeCompare(stockLabel(b).label, "pt-BR");
}

function HeaderButton({
  label,
  sortKey,
  currentKey,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      className={currentKey === sortKey ? "active" : ""}
      type="button"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <ArrowUpDown size={13} />
    </button>
  );
}

function IncomingTruck({ product }: { product: CatalogProduct }) {
  if (!(product.available_quantity > 0 && product.incoming_quantity > 0)) {
    return null;
  }

  return (
    <span
      className="product-incoming-truck"
      title={`${product.incoming_quantity} unidade(s) a caminho`}
      aria-label={`${product.incoming_quantity} unidade(s) a caminho`}
    >
      <Truck size={15} />
    </span>
  );
}

function PromotionBadge({ product }: { product: CatalogProduct }) {
  if (!hasPromotion(product)) return null;

  return (
    <span
      className="operation-promotion-badge"
      title={`${product.promotion_name ?? "Promoção ativa"} · enquanto durar o estoque`}
    >
      <BadgePercent size={12} />
      Promoção
      {Number(product.promotion_discount_pct ?? 0) > 0
        ? ` -${Math.round(Number(product.promotion_discount_pct))}%`
        : ""}
    </span>
  );
}

function PriceDisplay({ product, compact = false }: { product: CatalogProduct; compact?: boolean }) {
  const promotion = hasPromotion(product);

  return (
    <div className={compact ? "operation-promo-price compact" : "operation-promo-price"}>
      {promotion && <s>{formatCurrency(regularCash(product))}</s>}
      <strong>{formatCurrency(product.sale_price)}</strong>
      {promotion && !compact && (
        <small>{product.promotion_name ?? "Promoção ativa"} · enquanto durar o estoque</small>
      )}
    </div>
  );
}

function GalleryZoomControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.max(1, Math.min(5, next)));

  return (
    <div className="product-gallery-zoom product-gallery-zoom-v2">
      <button
        type="button"
        aria-label="Diminuir os cards"
        disabled={value <= 1}
        onClick={() => set(value - 1)}
      >
        <ZoomOut size={14} />
      </button>
      <input
        aria-label="Tamanho dos cards da galeria"
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => set(Number(event.target.value))}
      />
      <button
        type="button"
        aria-label="Aumentar os cards"
        disabled={value >= 5}
        onClick={() => set(value + 1)}
      >
        <ZoomIn size={14} />
      </button>
      <span>{value}/5</span>
    </div>
  );
}

export function ProductCatalogTable({
  products,
  categories,
  salesMode = false,
}: {
  products: CatalogProduct[];
  categories: string[];
  salesMode?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [stock, setStock] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("commercial");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("deck");
  const [galleryZoom, setGalleryZoom] = useState(3);
  const [galleryDetails, setGalleryDetails] = useState(true);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");

    return products
      .filter((product) => !isLegacyCombo(product))
      .filter(
        (product) =>
          !normalized ||
          `${product.name} ${product.category} ${product.brand ?? ""} ${product.promotion_name ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized),
      )
      .filter(
        (product) => category === "all" || product.category === category,
      )
      .filter(
        (product) =>
          status === "all" ||
          (status === "active" ? product.active : !product.active),
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
      .sort((a, b) => {
        const value = compare(a, b, sortKey);
        return sortDirection === "asc" ? value : -value;
      });
  }, [
    products,
    query,
    category,
    status,
    stock,
    sortKey,
    sortDirection,
  ]);

  function sort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(
      ["available", "incoming", "cash", "installment"].includes(key)
        ? "desc"
        : "asc",
    );
  }

  return (
    <article className="panel product-catalog-panel">
      <div className="product-catalog-toolbar">
        <label className="product-catalog-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto, marca, categoria ou promoção"
          />
        </label>

        <select
          className="select product-filter-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select
          className="select product-filter-select"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
        >
          <option value="all">Todos os estoques</option>
          <option value="promotion">Em promoção</option>
          <option value="available">Disponíveis</option>
          <option value="incoming">A caminho</option>
          <option value="empty">Sem disponibilidade</option>
        </select>

        <select
          className="select product-filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>

        <div className="product-view-toggle" aria-label="Modo de visualização">
          <button
            className={viewMode === "deck" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("deck")}
          >
            <Rows3 size={15} /> Deck
          </button>
          <button
            className={viewMode === "gallery" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("gallery")}
          >
            <LayoutGrid size={15} /> Gallery
          </button>
        </div>

        {viewMode === "gallery" && (
          <div className="product-gallery-controls">
            <GalleryZoomControl value={galleryZoom} onChange={setGalleryZoom} />
            <button
              className={galleryDetails ? "active" : ""}
              type="button"
              onClick={() => setGalleryDetails((current) => !current)}
            >
              {galleryDetails ? <Eye size={14} /> : <EyeOff size={14} />}
              {galleryDetails ? "Completo" : "Essencial"}
            </button>
          </div>
        )}

        <span className="product-result-count">
          {filtered.length} produto{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {salesMode && (
        <div className="sales-profile-note">
          <strong>Perfil Vendas</strong>
          <span>Consulta comercial com preço promocional e disponibilidade real.</span>
        </div>
      )}

      <div className="product-commercial-order-note">
        <span>Ordem padrão:</span>
        <strong>
          Creatina Candinho → disponível → a caminho → zerado → categoria estratégica → mais vendidos
        </strong>
        {sortKey !== "commercial" && (
          <button
            type="button"
            onClick={() => {
              setSortKey("commercial");
              setSortDirection("asc");
            }}
          >
            Restaurar ordem comercial
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nenhum produto encontrado</strong>
          Altere os filtros ou a busca.
        </div>
      ) : viewMode === "gallery" ? (
        <div
          className={`product-gallery-grid product-gallery-grid-responsive zoom-${galleryZoom} ${
            galleryDetails ? "show-details" : "essential"
          }`}
        >
          {filtered.map((product) => {
            const state = stockLabel(product);
            const border = stockBorder(product);

            return (
              <Link
                className={`product-gallery-card stock-${border} ${
                  hasPromotion(product) ? "has-operation-promotion" : ""
                }`}
                href={salesMode ? "/produtos" : `/produtos/${product.id}`}
                key={product.id}
              >
                <div className="product-gallery-image">
                  {product.thumbnail_url || product.image_url ? (
                    <img
                      src={product.thumbnail_url ?? product.image_url ?? ""}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={28} />
                  )}
                  <PromotionBadge product={product} />
                </div>

                <div className="product-gallery-copy">
                  <div className="product-gallery-heading">
                    <strong>{product.name}</strong>
                    {galleryDetails && (
                      <span>
                        {product.category}
                        {product.brand ? ` · ${product.brand}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="product-gallery-stock">
                    <span>Disponível <b>{product.available_quantity}</b></span>
                    {galleryDetails && (
                      <span>A caminho <b>{product.incoming_quantity}</b></span>
                    )}
                  </div>

                  {galleryDetails && (
                    <div className="product-gallery-price">
                      <PriceDisplay product={product} />
                      <span>{formatCurrency(product.installment_price)} a prazo</span>
                    </div>
                  )}

                  <span className={`badge ${state.tone}`}>
                    <span className="dot" /> {state.label}
                  </span>
                </div>

                <IncomingTruck product={product} />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="products-table product-catalog-table">
            <thead>
              <tr>
                <th><HeaderButton label="Produto" sortKey="name" currentKey={sortKey} onSort={sort} /></th>
                <th><HeaderButton label="Disponível" sortKey="available" currentKey={sortKey} onSort={sort} /></th>
                <th><HeaderButton label="A caminho" sortKey="incoming" currentKey={sortKey} onSort={sort} /></th>
                <th><HeaderButton label="À vista" sortKey="cash" currentKey={sortKey} onSort={sort} /></th>
                <th><HeaderButton label="A prazo" sortKey="installment" currentKey={sortKey} onSort={sort} /></th>
                <th><HeaderButton label="Situação" sortKey="status" currentKey={sortKey} onSort={sort} /></th>
                <th aria-label="Abrir produto" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const state = stockLabel(product);
                const border = stockBorder(product);

                return (
                  <tr
                    className={`product-deck-row stock-${border} ${
                      hasPromotion(product) ? "has-operation-promotion" : ""
                    }`}
                    key={product.id}
                  >
                    <td>
                      <Link
                        className="product-cell product-link"
                        href={salesMode ? "/produtos" : `/produtos/${product.id}`}
                      >
                        {product.thumbnail_url ? (
                          <img className="product-thumb" src={product.thumbnail_url} alt="" loading="lazy" />
                        ) : (
                          <span className="product-avatar">
                            {product.image_url ? <ImageOff size={17} /> : product.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="cell-main product-name-with-promo">
                            {product.name}
                            <PromotionBadge product={product} />
                          </div>
                          <div className="cell-sub">
                            {product.category}{product.brand ? ` · ${product.brand}` : ""}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <strong className={product.available_quantity > 0 ? "positive" : "muted-number"}>
                        {product.available_quantity}
                      </strong>
                      {product.reserved_quantity > 0 && (
                        <div className="cell-sub">
                          {product.reserved_quantity} reservada{product.reserved_quantity === 1 ? "" : "s"}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong className={product.incoming_quantity > 0 ? "incoming-text" : "muted-number"}>
                        {product.incoming_quantity}
                      </strong>
                      {product.awaiting_sales_quantity > 0 && (
                        <div className="cell-sub">{product.awaiting_sales_quantity} aguardando</div>
                      )}
                    </td>
                    <td className="amount"><PriceDisplay product={product} compact /></td>
                    <td className="amount">{formatCurrency(product.installment_price)}</td>
                    <td>
                      <span className={`badge ${state.tone}`}><span className="dot" /> {state.label}</span>
                    </td>
                    <td>
                      <div className="product-row-actions">
                        <IncomingTruck product={product} />
                        {!salesMode && (
                          <Link className="icon-link" href={`/produtos/${product.id}`} aria-label={`Abrir ${product.name}`}>
                            <ArrowRight size={18} />
                          </Link>
                        )}
                      </div>
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
