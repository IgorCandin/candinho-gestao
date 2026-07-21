/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  ImageOff,
  LayoutGrid,
  Rows3,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FitnessProductRow } from "@/lib/types";

type ViewMode = "deck" | "gallery";

function stockBorder(product: FitnessProductRow) {
  if (product.available_quantity > 0) return "available";
  if (product.incoming_quantity > 0) return "incoming";
  return "empty";
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
        aria-label="Tamanho dos cards da galeria Fitness"
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

export function FitnessProductCatalog({
  products,
  salesMode = false,
}: {
  products: FitnessProductRow[];
  salesMode?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("deck");
  const [galleryZoom, setGalleryZoom] = useState(3);

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
          `${product.name} ${product.category} ${product.description ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(q),
      )
      .filter(
        (product) => category === "all" || product.category === category,
      )
      .filter((product) =>
        stock === "all"
          ? true
          : stock === "available"
            ? product.available_quantity > 0
            : stock === "incoming"
              ? product.incoming_quantity > 0
              : product.available_quantity === 0 &&
                product.incoming_quantity === 0,
      )
      .sort(
        (a, b) =>
          Number(b.available_quantity > 0) -
            Number(a.available_quantity > 0) ||
          Number(b.incoming_quantity > 0) -
            Number(a.incoming_quantity > 0) ||
          a.category.localeCompare(b.category, "pt-BR") ||
          a.name.localeCompare(b.name, "pt-BR"),
      );
  }, [products, query, category, stock]);

  function priceLabel(product: FitnessProductRow) {
    return product.min_sale_price === product.max_sale_price
      ? formatCurrency(product.min_sale_price)
      : `${formatCurrency(product.min_sale_price)} – ${formatCurrency(
          product.max_sale_price,
        )}`;
  }

  return (
    <article className="panel product-catalog-panel">
      <div className="product-catalog-toolbar">
        <label className="product-catalog-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar peça, modelo ou categoria..."
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
          <option value="all">Todos os estoques</option>
          <option value="available">Disponíveis</option>
          <option value="incoming">A caminho</option>
          <option value="empty">Sem disponibilidade</option>
        </select>

        <div className="product-view-toggle" aria-label="Modo de visualização">
          <button
            className={viewMode === "deck" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("deck")}
          >
            <Rows3 size={15} />
            Deck
          </button>
          <button
            className={viewMode === "gallery" ? "active" : ""}
            type="button"
            onClick={() => setViewMode("gallery")}
          >
            <LayoutGrid size={15} />
            Gallery
          </button>
        </div>

        {viewMode === "gallery" && (
          <div className="product-gallery-controls">
            <GalleryZoomControl
              value={galleryZoom}
              onChange={setGalleryZoom}
            />
          </div>
        )}

        <span className="product-result-count">
          {filtered.length} produto{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {salesMode && (
        <div className="sales-profile-note">
          <strong>Perfil Vendas</strong>
          <span>
            Consulta comercial de preço e disponibilidade. Custos e alterações
            permanecem ocultos.
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nenhum produto encontrado</strong>
          Altere os filtros ou a busca.
        </div>
      ) : viewMode === "gallery" ? (
        <div
          className={`product-gallery-grid product-gallery-grid-responsive fitness-gallery-grid zoom-${galleryZoom}`}
        >
          {filtered.map((product) => (
            <Link
              key={product.id}
              href={
                salesMode
                  ? "/fitness/produtos"
                  : `/fitness/produtos/${product.id}`
              }
              className={`product-gallery-card stock-${stockBorder(product)}`}
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
              </div>

              <div className="product-gallery-copy">
                <div className="product-gallery-heading">
                  <strong>{product.name}</strong>
                  <span>
                    {product.category} · {product.variant_count} variação(ões)
                  </span>
                </div>

                <div className="product-gallery-stock">
                  <span>
                    Disponível <b>{product.available_quantity}</b>
                  </span>
                  <span>
                    A caminho <b>{product.incoming_quantity}</b>
                  </span>
                </div>

                <div className="product-gallery-price">
                  <strong>{priceLabel(product)}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="product-catalog-table fitness-product-deck">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Variações</th>
                <th>Disponível</th>
                <th>Reservado</th>
                <th>A caminho</th>
                <th>Faixa de preço</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
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
                        <div className="cell-main">{product.name}</div>
                        <div className="cell-sub">
                          {product.variant_count} variação(ões)
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variant_count}</td>
                  <td>{product.available_quantity}</td>
                  <td>{product.reserved_quantity}</td>
                  <td>{product.incoming_quantity}</td>
                  <td>{priceLabel(product)}</td>
                  <td>
                    {!salesMode && (
                      <Link
                        className="icon-link"
                        href={`/fitness/produtos/${product.id}`}
                      >
                        <ArrowRight size={17} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
