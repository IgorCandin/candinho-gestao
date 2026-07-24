"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  CheckSquare,
  Download,
  PackageCheck,
  PackageOpen,
  Search,
  Square,
  XCircle,
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

function productPromotionKey(
  operation: PublicStorefrontProduct["operation"],
  productId: string,
) {
  return `${operation}:${productId}`;
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

function RegularProductPrice({ item }: { item: PublicStorefrontProduct }) {
  if (Math.abs(item.price_from - item.price_to) < 0.01) {
    return <strong>{formatCurrency(item.price_from)}</strong>;
  }

  return (
    <strong>
      {formatCurrency(item.price_from)} — {formatCurrency(item.price_to)}
    </strong>
  );
}

function ProductPrice({
  item,
  promotion,
}: {
  item: PublicStorefrontProduct;
  promotion: PublicStorefrontPromotion | null;
}) {
  if (!promotion) {
    return <RegularProductPrice item={item} />;
  }

  const hasDiscount = promotion.promotional_price < promotion.current_price;

  return (
    <>
      <div className="public-storefront-product-effective-price">
        {hasDiscount && <span>{formatCurrency(promotion.current_price)}</span>}
        <strong>{formatCurrency(promotion.promotional_price)}</strong>
      </div>
      <em className="public-storefront-product-promo-note">
        <b>Promoção</b> · {promotion.promotion_name} · enquanto durar o estoque
      </em>
    </>
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
  promotion,
  selectable,
  selected,
  onToggle,
}: {
  item: PublicStorefrontProduct;
  promotion: PublicStorefrontPromotion | null;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      className={`public-storefront-card ${
        promotion ? "has-active-promotion" : ""
      } ${selected ? "selected" : ""}`}
    >
      <div className="public-storefront-card-image">
        {selectable && <SelectButton selected={selected} onToggle={onToggle} />}
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <PackageOpen size={38} />
        )}

        {promotion ? (
          <span className="public-storefront-promo-badge">
            <BadgePercent size={13} />
            Promoção
          </span>
        ) : (
          <span className="public-storefront-available">
            <PackageCheck size={13} />
            Disponível
          </span>
        )}
      </div>

      <div className="public-storefront-card-copy">
        <small>{item.category ?? "Produto"}</small>
        <h3>{item.name}</h3>
        <ProductPrice item={item} promotion={promotion} />
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
  const soldOut = item.stock_status === "sold_out";

  return (
    <article
      className={`public-storefront-card public-storefront-promotion-card ${
        selected ? "selected" : ""
      } ${soldOut ? "sold-out" : ""}`}
    >
      <div className="public-storefront-card-image">
        {selectable && <SelectButton selected={selected} onToggle={onToggle} />}
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
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

        {hasDiscount && item.discount_pct > 0 && !soldOut && (
          <b className="public-storefront-discount">
            -{Math.round(item.discount_pct)}%
          </b>
        )}

        {soldOut && (
          <div className="promotion-ux-sold-out-overlay">
            <XCircle size={40} />
            <strong>Estoque zerado</strong>
          </div>
        )}
      </div>

      <div className="public-storefront-card-copy">
        <small>{item.promotion_name}</small>
        <h3>{item.name}</h3>
        <div className="public-storefront-promotion-price">
          {hasDiscount && <span>{formatCurrency(item.current_price)}</span>}
          <strong>{formatCurrency(item.promotional_price)}</strong>
        </div>
        <em className={soldOut ? "sold-out-copy" : "promotion-stock-copy"}>
          {soldOut
            ? "Produto esgotado"
            : `${item.available_quantity} unidade(s) · enquanto durar o estoque`}
        </em>
      </div>
    </article>
  );
}

export function PublicStorefrontBrowser({
  snapshot,
  enableExport = false,
  initialView = "products",
  initialPromotionId = null,
}: {
  snapshot: PublicStorefrontSnapshot;
  enableExport?: boolean;
  initialView?: ViewMode;
  initialPromotionId?: string | null;
}) {
  const initialPromotionItems = [
    ...snapshot.promotions.supplements,
    ...snapshot.promotions.fitness,
  ].filter(
    (item) => !initialPromotionId || item.promotion_id === initialPromotionId,
  );

  const [view, setView] = useState<ViewMode>(initialView);
  const [operation, setOperation] = useState<Operation>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialPromotionId
      ? initialPromotionItems.map((item) =>
          selectionId({ ...item, kind: "promotion" as const }),
        )
      : [],
  );

  const promotionByProduct = useMemo(() => {
    const result = new Map<string, PublicStorefrontPromotion>();

    [
      ...snapshot.promotions.supplements,
      ...snapshot.promotions.fitness,
    ].forEach((promotion) => {
      if (
        promotion.promotion_status !== "active" ||
        promotion.stock_status === "sold_out" ||
        !promotion.product_id
      ) {
        return;
      }

      const key = productPromotionKey(
        promotion.operation,
        promotion.product_id,
      );
      const current = result.get(key);

      if (
        !current ||
        promotion.promotional_price < current.promotional_price
      ) {
        result.set(key, promotion);
      }
    });

    return result;
  }, [snapshot.promotions]);

  function promotionForProduct(item: PublicStorefrontProduct) {
    return promotionByProduct.get(
      productPromotionKey(item.operation, item.id),
    ) ?? null;
  }

  function effectiveProductPrice(item: PublicStorefrontProduct) {
    return promotionForProduct(item)?.promotional_price ?? item.price_from;
  }

  const categories = useMemo(() => {
    if (operation === "supplements") return snapshot.categories.supplements;
    if (operation === "fitness") return snapshot.categories.fitness;

    return [
      ...new Set([
        ...snapshot.categories.supplements,
        ...snapshot.categories.fitness,
      ]),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [operation, snapshot.categories]);

  const productFilter = (item: PublicStorefrontProduct) =>
    (operation === "all" || item.operation === operation) &&
    (category === "all" || item.category === category) &&
    (!query.trim() ||
      text(item.name).includes(text(query)) ||
      text(item.category).includes(text(query)));

  const promotionFilter = (item: PublicStorefrontPromotion) =>
    (!initialPromotionId || item.promotion_id === initialPromotionId) &&
    (operation === "all" || item.operation === operation) &&
    (category === "all" || item.category === category) &&
    (!query.trim() ||
      text(item.name).includes(text(query)) ||
      text(item.category).includes(text(query)) ||
      text(item.promotion_name).includes(text(query)));

  const sortProducts = (items: PublicStorefrontProduct[]) =>
    [...items].sort((a, b) => {
      if (sort === "price_asc") {
        return effectiveProductPrice(a) - effectiveProductPrice(b);
      }

      if (sort === "price_desc") {
        return effectiveProductPrice(b) - effectiveProductPrice(a);
      }

      return a.name.localeCompare(b.name, "pt-BR");
    });

  const sortPromotions = (items: PublicStorefrontPromotion[]) =>
    [...items].sort((a, b) => {
      if (sort === "price_asc") {
        return a.promotional_price - b.promotional_price;
      }

      if (sort === "price_desc") {
        return b.promotional_price - a.promotional_price;
      }

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

  const visibleItems: SelectableItem[] =
    view === "products"
      ? [
          ...supplementProducts.map((item) => ({
            ...item,
            kind: "product" as const,
          })),
          ...fitnessProducts.map((item) => ({
            ...item,
            kind: "product" as const,
          })),
        ]
      : [
          ...supplementPromotions.map((item) => ({
            ...item,
            kind: "promotion" as const,
          })),
          ...fitnessPromotions.map((item) => ({
            ...item,
            kind: "promotion" as const,
          })),
        ];

  const allItems: SelectableItem[] = [
    ...snapshot.products.supplements.map((item) => ({
      ...item,
      kind: "product" as const,
    })),
    ...snapshot.products.fitness.map((item) => ({
      ...item,
      kind: "product" as const,
    })),
    ...snapshot.promotions.supplements.map((item) => ({
      ...item,
      kind: "promotion" as const,
    })),
    ...snapshot.promotions.fitness.map((item) => ({
      ...item,
      kind: "promotion" as const,
    })),
  ];

  const selectedItems = allItems.filter((item) =>
    selectedIds.includes(selectionId(item)),
  );

  const blocks =
    view === "products"
      ? [
          {
            key: "supplements",
            title: "Suplementos",
            items: supplementProducts,
          },
          { key: "fitness", title: "Fitness", items: fitnessProducts },
        ]
      : [
          {
            key: "supplements",
            title: "Suplementos",
            items: supplementPromotions,
          },
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

  function changeOperation(nextOperation: Operation) {
    setOperation(nextOperation);
    setCategory("all");
  }

  function exportPdf() {
    if (selectedItems.length === 0) return;

    const selectedOperations = [
      ...new Set(selectedItems.map((item) => item.operation)),
    ];
    const logo =
      selectedOperations.length > 1
        ? BRAND_ASSETS.company.complete
        : selectedOperations[0] === "fitness"
          ? BRAND_ASSETS.fitness.complete
          : BRAND_ASSETS.supplements.complete;

    const logoUrl = absoluteUrl(logo.src);
    const effectivePromotions = selectedItems
      .map((item) =>
        item.kind === "promotion" ? item : promotionForProduct(item),
      )
      .filter(
        (item): item is PublicStorefrontPromotion => Boolean(item),
      );
    const campaignNames = [
      ...new Set(effectivePromotions.map((item) => item.promotion_name)),
    ];
    const documentTitle =
      view === "promotions"
        ? campaignNames.length === 1
          ? campaignNames[0]
          : "Promoções Selecionadas"
        : "Produtos Selecionados";

    const rows = selectedItems
      .map((item) => {
        const image = absoluteUrl(item.image_url);
        const operationLabel =
          item.operation === "fitness"
            ? "Candinho Fitness"
            : "Candinho Suplementos";
        const effectivePromotion =
          item.kind === "promotion" ? item : promotionForProduct(item);
        const soldOut =
          effectivePromotion?.stock_status === "sold_out";

        let price: string;
        let oldPrice = "";
        let campaign = `<p>Disponível para venda</p>`;
        let stock = "";

        if (effectivePromotion) {
          price = formatCurrency(effectivePromotion.promotional_price);

          if (
            effectivePromotion.promotional_price <
            effectivePromotion.current_price
          ) {
            oldPrice = `<span class="old-price">${escapeHtml(
              formatCurrency(effectivePromotion.current_price),
            )}</span>`;
          }

          campaign = `<p>${escapeHtml(
            effectivePromotion.promotion_name,
          )}</p>`;

          stock = soldOut
            ? `<div class="sold-out-label">✕ ESTOQUE ZERADO</div>`
            : `<div class="stock-label">Enquanto durar o estoque · ${effectivePromotion.available_quantity} un.</div>`;
        } else if (item.kind === "product") {
          price =
            Math.abs(item.price_from - item.price_to) < 0.01
              ? formatCurrency(item.price_from)
              : `${formatCurrency(item.price_from)} — ${formatCurrency(
                  item.price_to,
                )}`;
        } else {
          price = formatCurrency(item.promotional_price);
        }

        return `
          <article class="card ${soldOut ? "sold-out" : ""}">
            <div class="photo">
              ${
                image
                  ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(
                      item.name,
                    )}">`
                  : `<div class="placeholder">CANDINHO</div>`
              }
              ${soldOut ? `<div class="sold-x">✕</div>` : ""}
            </div>
            <div class="copy">
              <span class="operation">${escapeHtml(operationLabel)}</span>
              <h2>${escapeHtml(item.name)}</h2>
              <span class="category">${escapeHtml(
                item.category ?? "Produto",
              )}</span>
              ${campaign}
              <div class="price">${oldPrice}<strong>${escapeHtml(
                price,
              )}</strong></div>
              ${stock}
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
            body { margin:0;background:#f4f2ed;color:#111;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact; }
            .sheet { max-width:190mm;margin:0 auto; }
            .header { padding:5mm 0 6mm;border-bottom:1.5px solid #c49b3d;display:flex;align-items:center;justify-content:space-between;gap:8mm; }
            .header img { width:62mm;max-height:20mm;object-fit:contain;object-position:left center; }
            .header h1 { margin:0;font-size:20px;text-align:right; }
            .header p { margin:3px 0 0;color:#555;font-size:10px;text-align:right; }
            .notice { margin:5mm 0;padding:3mm 4mm;border-radius:3mm;background:#111;color:#fff;font-size:10px;font-weight:700;text-align:center; }
            .grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5mm; }
            .card { min-height:72mm;border:1px solid #ddd;border-radius:4mm;background:#fff;overflow:hidden;display:grid;grid-template-columns:45% 55%;break-inside:avoid; }
            .photo { min-height:72mm;position:relative;background:#f6f6f6;display:flex;align-items:center;justify-content:center;overflow:hidden; }
            .photo img { width:100%;height:100%;object-fit:contain; }
            .placeholder { font-weight:900;color:#bbb; }
            .copy { padding:5mm;display:flex;flex-direction:column;justify-content:center; }
            .operation { color:#9b7425;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em; }
            h2 { margin:2mm 0 1mm;font-size:15px;line-height:1.1; }
            .category { color:#666;font-size:9px; }
            .copy p { margin:3mm 0 0;font-size:9px;color:#555; }
            .price { margin-top:4mm;display:flex;align-items:baseline;gap:2mm;flex-wrap:wrap; }
            .price strong { font-size:18px;color:#a97916; }
            .old-price { color:#888;text-decoration:line-through;font-size:10px; }
            .stock-label { margin-top:3mm;font-size:8px;font-weight:700;color:#28784a; }
            .sold-out { filter:grayscale(1);opacity:.72; }
            .sold-out-label { margin-top:3mm;color:#c51622;font-size:9px;font-weight:900; }
            .sold-x { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#d71920;font-size:56px;font-weight:900;background:rgba(255,255,255,.35); }
            .footer { margin-top:6mm;padding-top:3mm;border-top:1px solid #ccc;text-align:center;color:#666;font-size:8px; }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="header">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" alt="Candinho">`
                  : ""
              }
              <div><h1>${escapeHtml(
                documentTitle,
              )}</h1><p>Qualidade que entrega resultado.</p></div>
            </header>
            <div class="notice">OFERTAS ENQUANTO DURAR O ESTOQUE</div>
            <section class="grid">${rows}</section>
            <footer class="footer">Valores e disponibilidade sujeitos ao estoque no momento do pedido.</footer>
          </main>
          <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  return (
    <div className="public-storefront-browser">
      {initialPromotionId && (
        <div className="promotion-ux-stock-disclaimer">
          <BadgePercent size={16} />
          <span>
            <strong>Produtos desta campanha já selecionados.</strong> Revise os
            cards e clique em gerar PDF. Ofertas enquanto durar o estoque.
          </span>
        </div>
      )}

      <div className="public-storefront-toolbar">
        <div
          className="public-storefront-view-toggle"
          aria-label="Alternar visualização"
        >
          <button
            className={view === "products" ? "active" : ""}
            type="button"
            onClick={() => setView("products")}
            disabled={Boolean(initialPromotionId)}
          >
            Produtos
          </button>
          <button
            className={view === "promotions" ? "active" : ""}
            type="button"
            onClick={() => setView("promotions")}
          >
            Promoções
          </button>
        </div>

        <label className="public-storefront-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou categoria..."
          />
        </label>

        <select
          aria-label="Filtrar por operação"
          value={operation}
          onChange={(event) =>
            changeOperation(event.target.value as Operation)
          }
        >
          <option value="all">Todas as operações</option>
          <option value="supplements">Suplementos</option>
          <option value="fitness">Fitness</option>
        </select>

        <select
          aria-label="Filtrar por categoria"
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
          aria-label="Ordenar produtos"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortMode)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </select>
      </div>

      {enableExport && (
        <div className="public-storefront-export-bar">
          <div>
            <strong>{selectedItems.length} item(ns) selecionado(s)</strong>
            <span>Selecione produtos ou promoções para gerar o PDF A4.</span>
          </div>
          <div>
            <button
              className="button ghost"
              type="button"
              onClick={selectVisible}
            >
              <CheckSquare size={15} />
              Selecionar visíveis
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => setSelectedIds([])}
            >
              Limpar
            </button>
            <button
              className="button gold"
              type="button"
              onClick={exportPdf}
              disabled={selectedItems.length === 0}
            >
              <Download size={16} />
              Gerar PDF
            </button>
          </div>
        </div>
      )}

      <div className="public-storefront-blocks">
        {blocks.map((block) =>
          block.items.length > 0 ? (
            <section key={block.key}>
              <header>
                <h2>{block.title}</h2>
                <span>{block.items.length} item(ns)</span>
              </header>

              <div className="public-storefront-grid">
                {block.items.map((item) => {
                  const selectable = enableExport;
                  const selectableItem = {
                    ...item,
                    kind:
                      view === "products"
                        ? ("product" as const)
                        : ("promotion" as const),
                  } as SelectableItem;
                  const selected = selectedIds.includes(
                    selectionId(selectableItem),
                  );

                  return view === "products" ? (
                    <ProductCard
                      key={item.id}
                      item={item as PublicStorefrontProduct}
                      promotion={promotionForProduct(
                        item as PublicStorefrontProduct,
                      )}
                      selectable={selectable}
                      selected={selected}
                      onToggle={() => toggleItem(selectableItem)}
                    />
                  ) : (
                    <PromotionCard
                      key={item.id}
                      item={item as PublicStorefrontPromotion}
                      selectable={selectable}
                      selected={selected}
                      onToggle={() => toggleItem(selectableItem)}
                    />
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
