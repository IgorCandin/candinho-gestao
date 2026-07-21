"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  CheckSquare,
  Download,
  PackageCheck,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import type {
  PublicStorefrontProduct,
  PublicStorefrontPromotion,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";

type Operation = "all" | "supplements" | "fitness";
type ViewMode = "products" | "promotions";
type SortMode = "name" | "price_asc" | "price_desc";

type SelectableItem =
  | ({ kind: "product" } & PublicStorefrontProduct)
  | ({ kind: "promotion" } & PublicStorefrontPromotion);

function text(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase("pt-BR");
}

function selectionId(item: SelectableItem) {
  return `${item.kind}:${item.operation}:${item.id}`;
}

function currencyRange(from: number, to: number) {
  if (Math.abs(from - to) < 0.01) return formatCurrency(from);
  return `${formatCurrency(from)} — ${formatCurrency(to)}`;
}

function ProductPrice({ item }: { item: PublicStorefrontProduct }) {
  return <strong>{currencyRange(item.price_from, item.price_to)}</strong>;
}

function Selector({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`public-storefront-select-toggle ${active ? "active" : ""}`}
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Remover da seleção" : "Selecionar para PDF"}
    >
      {active ? <CheckSquare size={17} /> : <Square size={17} />}
    </button>
  );
}

function ProductCard({
  item,
  selectable = false,
  selected = false,
  onToggle,
}: {
  item: PublicStorefrontProduct;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <article className={`public-storefront-card ${selected ? "selected" : ""}`}>
      <div className="public-storefront-card-image">
        {selectable && onToggle && (
          <Selector active={selected} onToggle={onToggle} />
        )}

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

function PromotionCard({
  item,
  selectable = false,
  selected = false,
  onToggle,
}: {
  item: PublicStorefrontPromotion;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const hasDiscount = item.promotional_price < item.current_price;

  return (
    <article className={`public-storefront-card public-storefront-promotion-card ${selected ? "selected" : ""}`}>
      <div className="public-storefront-card-image">
        {selectable && onToggle && (
          <Selector active={selected} onToggle={onToggle} />
        )}

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
  enableExport = false,
}: {
  snapshot: PublicStorefrontSnapshot;
  enableExport?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("products");
  const [operation, setOperation] = useState<Operation>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const allFilteredProducts: SelectableItem[] = [
    ...supplementProducts.map((item) => ({ ...item, kind: "product" as const })),
    ...fitnessProducts.map((item) => ({ ...item, kind: "product" as const })),
  ];

  const allFilteredPromotions: SelectableItem[] = [
    ...supplementPromotions.map((item) => ({ ...item, kind: "promotion" as const })),
    ...fitnessPromotions.map((item) => ({ ...item, kind: "promotion" as const })),
  ];

  const filteredSelectableItems = view === "products"
    ? allFilteredProducts
    : allFilteredPromotions;

  const selectedItems = filteredSelectableItems.filter((item) =>
    selectedIds.includes(selectionId(item)),
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

  function toggleItem(item: SelectableItem) {
    const id = selectionId(item);
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function selectFiltered() {
    setSelectedIds((current) => {
      const merged = new Set(current);
      for (const item of filteredSelectableItems) {
        merged.add(selectionId(item));
      }
      return Array.from(merged);
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function exportSelectedToPdf() {
    if (selectedItems.length === 0) return;

    const operations = [...new Set(selectedItems.map((item) => item.operation))];
    const logo = operations.length === 2
      ? BRAND_ASSETS.company.complete
      : operations[0] === "fitness"
        ? BRAND_ASSETS.fitness.complete
        : BRAND_ASSETS.supplements.complete;

    const title = view === "products" ? "Produtos Selecionados" : "Promoções Selecionadas";

    const rows = selectedItems.map((item) => {
      const price = item.kind === "product"
        ? currencyRange(item.price_from, item.price_to)
        : formatCurrency(item.promotional_price);

      const extra = item.kind === "product"
        ? `Disponível · ${item.operation === "supplements" ? "Suplementos" : "Fitness"}`
        : `${item.promotion_name} · ${item.operation === "supplements" ? "Suplementos" : "Fitness"}`;

      const oldPrice = item.kind === "promotion" && item.promotional_price < item.current_price
        ? `<small>de ${formatCurrency(item.current_price)}</small>`
        : "";

      return `
        <article class="export-card">
          <div class="export-image">
            ${item.image_url
              ? `<img src="${item.image_url}" alt="${item.name}" />`
              : `<div class="export-placeholder">${item.kind === "product" ? "Produto" : "Promoção"}</div>`}
          </div>
          <div class="export-copy">
            <span>${item.category ?? (item.kind === "product" ? "Produto" : "Promoção")}</span>
            <h3>${item.name}</h3>
            <p>${extra}</p>
            ${oldPrice}
            <strong>${price}</strong>
          </div>
        </article>
      `;
    }).join("");

    const html = `
      <html lang="pt-BR">
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            body {
              margin: 0;
              padding: 28px;
              background: #0b0f15;
              color: #f4f7fb;
              font-family: Arial, Helvetica, sans-serif;
            }
            .wrap {
              max-width: 1120px;
              margin: 0 auto;
            }
            .brand {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
            .brand img {
              width: min(280px, 100%);
              max-height: 86px;
              object-fit: contain;
            }
            .hero {
              margin-bottom: 22px;
              padding: 18px 20px;
              border: 1px solid rgba(216,171,65,.24);
              border-radius: 16px;
              background: linear-gradient(180deg, rgba(216,171,65,.08), rgba(255,255,255,.02));
            }
            .hero span {
              color: #e6c775;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            .hero h1 {
              margin: 8px 0 10px;
              font-size: 40px;
              line-height: 1;
            }
            .hero p {
              margin: 0;
              color: #b7c0cc;
              font-size: 14px;
              line-height: 1.55;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }
            .export-card {
              overflow: hidden;
              border: 1px solid #252d3a;
              border-radius: 18px;
              background: #121821;
            }
            .export-image {
              aspect-ratio: 1 / 1;
              background: #fff;
              display: grid;
              place-items: center;
            }
            .export-image img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .export-placeholder {
              color: #556172;
              font-weight: 700;
            }
            .export-copy {
              padding: 14px;
            }
            .export-copy span {
              color: #9aa6b8;
              display: block;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            .export-copy h3 {
              margin: 6px 0 10px;
              font-size: 18px;
            }
            .export-copy p,
            .export-copy small {
              display: block;
              margin: 0 0 8px;
              color: #b8c2cf;
              font-size: 12px;
              line-height: 1.5;
            }
            .export-copy strong {
              color: #f1cf7d;
              font-size: 22px;
            }
            @media print {
              body { background: #fff; color: #111; padding: 0; }
              .hero { background: #fff7e6; }
              .export-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="brand">
              <img src="${logo.src}" alt="${logo.alt}" />
            </div>
            <div class="hero">
              <span>Candinho Company</span>
              <h1>${title}</h1>
              <p>Gerado a partir da área interna do ERP. Quando a seleção mistura Suplementos e Fitness, a saída usa a marca Candinho Company; quando isola uma operação, usa a marca correspondente.</p>
            </div>
            <section class="grid">${rows}</section>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

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

        {enableExport && (
          <div className="public-storefront-export-toolbar">
            <div>
              <span>Seleção para PDF</span>
              <strong>{selectedIds.length} item(ns) selecionado(s)</strong>
            </div>

            <div className="public-storefront-export-actions">
              <button type="button" onClick={selectFiltered}>
                Marcar filtrados
              </button>
              <button type="button" onClick={clearSelection}>
                Limpar
              </button>
              <button
                type="button"
                className="active"
                onClick={exportSelectedToPdf}
                disabled={selectedIds.length === 0}
              >
                <Download size={16} />
                Gerar PDF
              </button>
            </div>
          </div>
        )}
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
                        <ProductCard
                          item={item}
                          key={`${item.operation}-${item.id}`}
                          selectable={enableExport}
                          selected={selectedIds.includes(selectionId({ ...item, kind: "product" }))}
                          onToggle={() => toggleItem({ ...item, kind: "product" })}
                        />
                      ))
                    : (block.items as PublicStorefrontPromotion[]).map((item) => (
                        <PromotionCard
                          item={item}
                          key={`${item.operation}-${item.id}`}
                          selectable={enableExport}
                          selected={selectedIds.includes(selectionId({ ...item, kind: "promotion" }))}
                          onToggle={() => toggleItem({ ...item, kind: "promotion" })}
                        />
                      ))}
                </div>
              )}
            </section>
          ))}
      </div>
    </>
  );
}
