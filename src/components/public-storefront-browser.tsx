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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(value: string | null) {
  if (!value) return "";
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return "";
  }
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

function SelectButton({
  selected,
  onToggle,
}: {
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`public-storefront-select-toggle ${selected ? "active" : ""}`}
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      aria-label={selected ? "Remover da seleção" : "Selecionar para PDF"}
    >
      {selected ? <CheckSquare size={17} /> : <Square size={17} />}
    </button>
  );
}

function ProductCard({
  item,
  selectable,
  selected,
  onToggle,
}: {
  item: PublicStorefrontProduct;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`public-storefront-card ${selected ? "selected" : ""}`}>
      <div className="public-storefront-card-image">
        {selectable && (
          <SelectButton selected={selected} onToggle={onToggle} />
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
  selectable,
  selected,
  onToggle,
}: {
  item: PublicStorefrontPromotion;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const hasDiscount = item.promotional_price < item.current_price;

  return (
    <article className={`public-storefront-card public-storefront-promotion-card ${selected ? "selected" : ""}`}>
      <div className="public-storefront-card-image">
        {selectable && (
          <SelectButton selected={selected} onToggle={onToggle} />
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

  const supplementProducts = sortProducts(snapshot.products.supplements.filter(productFilter));
  const fitnessProducts = sortProducts(snapshot.products.fitness.filter(productFilter));
  const supplementPromotions = sortPromotions(snapshot.promotions.supplements.filter(promotionFilter));
  const fitnessPromotions = sortPromotions(snapshot.promotions.fitness.filter(promotionFilter));

  const visibleItems: SelectableItem[] =
    view === "products"
      ? [
          ...supplementProducts.map((item) => ({ ...item, kind: "product" as const })),
          ...fitnessProducts.map((item) => ({ ...item, kind: "product" as const })),
        ]
      : [
          ...supplementPromotions.map((item) => ({ ...item, kind: "promotion" as const })),
          ...fitnessPromotions.map((item) => ({ ...item, kind: "promotion" as const })),
        ];

  const selectedItems = visibleItems.filter((item) =>
    selectedIds.includes(selectionId(item)),
  );

  const blocks =
    view === "products"
      ? [
          { key: "supplements", title: "Suplementos", items: supplementProducts },
          { key: "fitness", title: "Fitness", items: fitnessProducts },
        ]
      : [
          { key: "supplements", title: "Suplementos", items: supplementPromotions },
          { key: "fitness", title: "Fitness", items: fitnessPromotions },
        ];

  function toggleItem(item: SelectableItem) {
    const key = selectionId(item);
    setSelectedIds((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    );
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleItems.forEach((item) => next.add(selectionId(item)));
      return [...next];
    });
  }

  function exportPdf() {
    if (selectedItems.length === 0) return;

    const selectedOperations = [...new Set(selectedItems.map((item) => item.operation))];
    const logo =
      selectedOperations.length > 1
        ? BRAND_ASSETS.company.complete
        : selectedOperations[0] === "fitness"
          ? BRAND_ASSETS.fitness.complete
          : BRAND_ASSETS.supplements.complete;

    const logoUrl = absoluteUrl(logo.src);
    const documentTitle =
      view === "promotions"
        ? "Promoções Selecionadas"
        : "Produtos Selecionados";

    const rows = selectedItems
      .map((item) => {
        const image = absoluteUrl(item.image_url);
        const operationLabel =
          item.operation === "fitness" ? "Candinho Fitness" : "Candinho Suplementos";

        const price =
          item.kind === "product"
            ? Math.abs(item.price_from - item.price_to) < 0.01
              ? formatCurrency(item.price_from)
              : `${formatCurrency(item.price_from)} — ${formatCurrency(item.price_to)}`
            : formatCurrency(item.promotional_price);

        const oldPrice =
          item.kind === "promotion" &&
          item.promotional_price < item.current_price
            ? `<span class="old-price">${escapeHtml(formatCurrency(item.current_price))}</span>`
            : "";

        const campaign =
          item.kind === "promotion"
            ? `<p>${escapeHtml(item.promotion_name)}</p>`
            : `<p>Disponível para venda</p>`;

        return `
          <article class="card">
            <div class="photo">
              ${image
                ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}">`
                : `<div class="placeholder">CANDINHO</div>`}
            </div>
            <div class="copy">
              <span class="operation">${escapeHtml(operationLabel)}</span>
              <h2>${escapeHtml(item.name)}</h2>
              <span class="category">${escapeHtml(item.category ?? "Produto")}</span>
              ${campaign}
              <div class="price">${oldPrice}<strong>${escapeHtml(price)}</strong></div>
            </div>
          </article>
        `;
      })
      .join("");

    const popup = window.open("", "_blank", "width=1100,height=900");
    if (!popup) return;

    popup.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              background: #f4f2ed;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .sheet {
              max-width: 190mm;
              margin: 0 auto;
            }

            .header {
              padding: 5mm 0 6mm;
              border-bottom: 1.5px solid #c49b3d;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8mm;
            }

            .header img {
              width: 62mm;
              max-height: 20mm;
              object-fit: contain;
              object-position: left center;
            }

            .header-copy {
              text-align: right;
            }

            .header-copy span {
              color: #9b7528;
              display: block;
              font-size: 8pt;
              font-weight: 800;
              letter-spacing: .12em;
              text-transform: uppercase;
            }

            .header-copy h1 {
              margin: 2mm 0 0;
              font-size: 20pt;
              line-height: 1;
            }

            .intro {
              padding: 5mm 0 4mm;
              color: #555;
              font-size: 9pt;
              line-height: 1.5;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 4mm;
            }

            .card {
              min-height: 57mm;
              padding: 3.2mm;
              border: 1px solid #ded9cf;
              border-radius: 4mm;
              background: #fff;
              display: grid;
              grid-template-columns: 45mm minmax(0, 1fr);
              gap: 4mm;
              break-inside: avoid;
              page-break-inside: avoid;
              box-shadow: 0 1mm 4mm rgba(0,0,0,.04);
            }

            .photo {
              width: 45mm;
              height: 45mm;
              border-radius: 3mm;
              background: #f7f7f7;
              display: grid;
              place-items: center;
              overflow: hidden;
            }

            .photo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .placeholder {
              color: #aaa;
              font-size: 8pt;
              font-weight: 900;
              letter-spacing: .08em;
            }

            .copy {
              min-width: 0;
              align-self: center;
            }

            .operation {
              color: #a47c2d;
              display: block;
              font-size: 6.8pt;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .copy h2 {
              margin: 1.5mm 0 1mm;
              font-size: 12pt;
              line-height: 1.15;
            }

            .category,
            .copy p {
              color: #777;
              display: block;
              margin: 0 0 1.5mm;
              font-size: 7.3pt;
              line-height: 1.35;
            }

            .price {
              margin-top: 2mm;
              display: flex;
              align-items: baseline;
              gap: 2mm;
              flex-wrap: wrap;
            }

            .old-price {
              color: #888;
              font-size: 7.5pt;
              text-decoration: line-through;
            }

            .price strong {
              color: #8a641d;
              font-size: 13.5pt;
            }

            .footer {
              margin-top: 5mm;
              padding-top: 3mm;
              border-top: 1px solid #ddd6c8;
              color: #777;
              display: flex;
              justify-content: space-between;
              gap: 8mm;
              font-size: 7pt;
            }

            @media print {
              body { background: #fff; }
              .card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="header">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(logo.alt)}">
              <div class="header-copy">
                <span>Qualidade que entrega resultado.</span>
                <h1>${escapeHtml(documentTitle)}</h1>
              </div>
            </header>

            <p class="intro">
              Seleção preparada pela Candinho. Consulte disponibilidade no momento do pedido.
            </p>

            <section class="grid">${rows}</section>

            <footer class="footer">
              <span>Candinho Company</span>
              <span>Gerado pelo ERP Candinho</span>
            </footer>
          </main>

          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `);

    popup.document.close();
  }

  return (
    <>
      <section className="public-storefront-toolbar">
        <div className="public-storefront-view-tabs">
          <button
            className={view === "products" ? "active" : ""}
            type="button"
            onClick={() => {
              setView("products");
              setSelectedIds([]);
            }}
          >
            <PackageCheck size={16} />
            Produtos
          </button>

          <button
            className={view === "promotions" ? "active" : ""}
            type="button"
            onClick={() => {
              setView("promotions");
              setSelectedIds([]);
            }}
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
                <option value={item} key={item}>
                  {item}
                </option>
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
              <span>Seleção em massa</span>
              <strong>{selectedIds.length} item(ns) selecionado(s)</strong>
            </div>

            <div className="public-storefront-export-actions">
              <button type="button" onClick={selectVisible}>
                Marcar filtrados
              </button>
              <button type="button" onClick={() => setSelectedIds([])}>
                Limpar
              </button>
              <button
                className="primary"
                type="button"
                disabled={selectedItems.length === 0}
                onClick={exportPdf}
              >
                <Download size={15} />
                Gerar PDF A4
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
                    ? (block.items as PublicStorefrontProduct[]).map((item) => {
                        const selectable = { ...item, kind: "product" as const };
                        return (
                          <ProductCard
                            item={item}
                            key={`${item.operation}-${item.id}`}
                            selectable={enableExport}
                            selected={selectedIds.includes(selectionId(selectable))}
                            onToggle={() => toggleItem(selectable)}
                          />
                        );
                      })
                    : (block.items as PublicStorefrontPromotion[]).map((item) => {
                        const selectable = { ...item, kind: "promotion" as const };
                        return (
                          <PromotionCard
                            item={item}
                            key={`${item.operation}-${item.id}`}
                            selectable={enableExport}
                            selected={selectedIds.includes(selectionId(selectable))}
                            onToggle={() => toggleItem(selectable)}
                          />
                        );
                      })}
                </div>
              )}
            </section>
          ))}
      </div>
    </>
  );
}
