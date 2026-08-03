"use client";

import { useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type {
  PublicStorefrontProduct,
  PublicStorefrontPromotion,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";

type OperationKey = "supplements" | "fitness";

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function operationFromTitle(value: string): OperationKey | null {
  const title = normalize(value);

  if (title === "suplementos") return "supplements";
  if (title === "fitness") return "fitness";

  return null;
}

function rangeLabel(values: number[]) {
  if (values.length === 0) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);

  return Math.abs(min - max) < 0.01
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function optionLabel(
  promotion: PublicStorefrontPromotion,
  product: PublicStorefrontProduct | null,
) {
  const rawName = promotion.name.trim();

  if (product && rawName.startsWith(product.name)) {
    const suffix = rawName
      .slice(product.name.length)
      .replace(/^[\s·|—–-]+/, "")
      .trim();

    if (suffix) return suffix;
  }

  const pieces = rawName
    .split("·")
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length >= 3) {
    return pieces.slice(-2).join(" · ");
  }

  return pieces.length > 1
    ? pieces.slice(1).join(" · ")
    : "";
}

function setSelectValue(
  select: HTMLSelectElement,
  value: "all" | OperationKey,
) {
  select.value = value;
  select.dispatchEvent(
    new Event("change", {
      bubbles: true,
    }),
  );
}

function rememberCard(card: HTMLElement) {
  const name = card.querySelector<HTMLElement>(
    ".public-storefront-card-copy h3",
  );
  const price = card.querySelector<HTMLElement>(
    ".public-storefront-promotion-price",
  );
  const note =
    card.querySelector<HTMLElement>(".promotion-stock-copy") ??
    card.querySelector<HTMLElement>(".sold-out-copy");

  if (
    name &&
    card.dataset.companyOriginalName == null
  ) {
    card.dataset.companyOriginalName =
      name.textContent ?? "";
  }

  if (
    price &&
    card.dataset.companyOriginalPrice == null
  ) {
    card.dataset.companyOriginalPrice =
      price.innerHTML;
  }

  if (
    note &&
    card.dataset.companyOriginalStockText == null
  ) {
    card.dataset.companyOriginalStockText =
      note.textContent ?? "";
    card.dataset.companyOriginalStockClass =
      note.className;
  }
}

function restoreCard(card: HTMLElement) {
  rememberCard(card);

  card.hidden = false;
  card.classList.remove(
    "company-promotion-grouped",
  );

  const name = card.querySelector<HTMLElement>(
    ".public-storefront-card-copy h3",
  );
  const price = card.querySelector<HTMLElement>(
    ".public-storefront-promotion-price",
  );
  const note =
    card.querySelector<HTMLElement>(".promotion-stock-copy") ??
    card.querySelector<HTMLElement>(".sold-out-copy");

  if (
    name &&
    card.dataset.companyOriginalName != null
  ) {
    name.textContent =
      card.dataset.companyOriginalName;
  }

  if (
    price &&
    card.dataset.companyOriginalPrice != null
  ) {
    price.innerHTML =
      card.dataset.companyOriginalPrice;
  }

  if (
    note &&
    card.dataset.companyOriginalStockText != null
  ) {
    note.textContent =
      card.dataset.companyOriginalStockText;
    note.className =
      card.dataset.companyOriginalStockClass ??
      note.className;
  }

  card
    .querySelector(
      "[data-company-promotion-options]",
    )
    ?.remove();

  const soldOverlay =
    card.querySelector<HTMLElement>(
      ".promotion-ux-sold-out-overlay",
    );

  if (soldOverlay) {
    soldOverlay.style.display = "";
  }
}

export function PublicStorefrontCompanyUX({
  snapshot,
}: {
  snapshot: PublicStorefrontSnapshot;
}) {
  const productById = useMemo(() => {
    const map = new Map<
      string,
      PublicStorefrontProduct
    >();

    for (const product of [
      ...snapshot.products.supplements,
      ...snapshot.products.fitness,
    ]) {
      map.set(
        `${product.operation}:${product.id}`,
        product,
      );
    }

    return map;
  }, [snapshot.products]);

  const promotionsByExactCard = useMemo(() => {
    const map = new Map<
      string,
      PublicStorefrontPromotion[]
    >();

    for (const promotion of [
      ...snapshot.promotions.supplements,
      ...snapshot.promotions.fitness,
    ]) {
      const key = [
        promotion.operation,
        normalize(promotion.promotion_name),
        normalize(promotion.name),
      ].join(":");

      const current = map.get(key) ?? [];
      current.push(promotion);
      map.set(key, current);
    }

    return map;
  }, [snapshot.promotions]);

  useEffect(() => {
    const host = document.querySelector<HTMLElement>(
      ".public-storefront-browser",
    );

    if (!host) return;

    let observer: MutationObserver | null = null;
    let frame = 0;

    function enhanceOperationFilter() {
      const toolbar =
        host.querySelector<HTMLElement>(
          ".public-storefront-toolbar",
        );

      const operationSelect =
        toolbar?.querySelector<HTMLSelectElement>(
          'select[aria-label="Filtrar por operação"]',
        );

      if (!toolbar || !operationSelect) return;

      operationSelect.dataset.companyOperationSelect =
        "true";

      let control =
        toolbar.querySelector<HTMLElement>(
          "[data-company-operation-toggle]",
        );

      if (!control) {
        control = document.createElement("div");
        control.dataset.companyOperationToggle =
          "true";
        control.className =
          "public-storefront-operation-toggle-company";

        const label = document.createElement("span");
        label.className =
          "public-storefront-company-filter-label";
        label.textContent = "Operações";

        const buttons =
          document.createElement("div");
        buttons.className =
          "public-storefront-operation-buttons";

        const supplements =
          document.createElement("button");
        supplements.type = "button";
        supplements.dataset.operation =
          "supplements";
        supplements.className =
          "supplements";
        supplements.innerHTML =
          "<span></span><strong>Suplementos</strong><b>✓</b>";

        const fitness =
          document.createElement("button");
        fitness.type = "button";
        fitness.dataset.operation = "fitness";
        fitness.className = "fitness";
        fitness.innerHTML =
          "<span></span><strong>Fitness</strong><b>✓</b>";

        buttons.append(supplements, fitness);
        control.append(label, buttons);
        operationSelect.before(control);
      }

      const supplementsButton =
        control.querySelector<HTMLButtonElement>(
          'button[data-operation="supplements"]',
        );
      const fitnessButton =
        control.querySelector<HTMLButtonElement>(
          'button[data-operation="fitness"]',
        );

      if (!supplementsButton || !fitnessButton) {
        return;
      }

      function sync() {
        const value = operationSelect.value;
        const supplementsActive =
          value === "all" ||
          value === "supplements";
        const fitnessActive =
          value === "all" ||
          value === "fitness";

        supplementsButton.dataset.active =
          supplementsActive
            ? "true"
            : "false";
        fitnessButton.dataset.active =
          fitnessActive ? "true" : "false";

        supplementsButton.setAttribute(
          "aria-pressed",
          String(supplementsActive),
        );
        fitnessButton.setAttribute(
          "aria-pressed",
          String(fitnessActive),
        );
      }

      supplementsButton.onclick = () => {
        const value = operationSelect.value;

        if (value === "all") {
          setSelectValue(
            operationSelect,
            "fitness",
          );
        } else if (value === "fitness") {
          setSelectValue(
            operationSelect,
            "all",
          );
        } else {
          // Evita deixar a vitrine sem operação ativa.
          setSelectValue(
            operationSelect,
            "supplements",
          );
        }

        window.requestAnimationFrame(sync);
      };

      fitnessButton.onclick = () => {
        const value = operationSelect.value;

        if (value === "all") {
          setSelectValue(
            operationSelect,
            "supplements",
          );
        } else if (value === "supplements") {
          setSelectValue(
            operationSelect,
            "all",
          );
        } else {
          setSelectValue(
            operationSelect,
            "fitness",
          );
        }

        window.requestAnimationFrame(sync);
      };

      sync();
    }

    function enhancePromotionGroups() {
      const activeView =
        host.querySelector<HTMLButtonElement>(
          ".public-storefront-view-toggle button.active",
        )?.textContent ?? "";

      if (normalize(activeView) !== "promocoes") {
        return;
      }

      const sections = Array.from(
        host.querySelectorAll<HTMLElement>(
          ".public-storefront-blocks > section",
        ),
      );

      for (const section of sections) {
        const operation = operationFromTitle(
          section.querySelector("header h2")
            ?.textContent ?? "",
        );

        if (!operation) continue;

        const cards = Array.from(
          section.querySelectorAll<HTMLElement>(
            ".public-storefront-promotion-card",
          ),
        );

        if (cards.length === 0) continue;

        cards.forEach(restoreCard);

        type Row = {
          card: HTMLElement;
          promotion:
            | PublicStorefrontPromotion
            | null;
        };

        const groups = new Map<
          string,
          Row[]
        >();

        for (const card of cards) {
          const originalName =
            card.dataset.companyOriginalName ??
            card.querySelector("h3")
              ?.textContent ??
            "";
          const campaign =
            card.querySelector("small")
              ?.textContent ?? "";

          const lookupKey = [
            operation,
            normalize(campaign),
            normalize(originalName),
          ].join(":");

          const promotion =
            promotionsByExactCard.get(
              lookupKey,
            )?.[0] ?? null;

          const groupKey = promotion
            ? promotion.product_id
              ? [
                  promotion.operation,
                  promotion.promotion_id,
                  promotion.product_id,
                ].join(":")
              : [
                  promotion.operation,
                  promotion.promotion_id,
                  promotion.id,
                ].join(":")
            : `${operation}:unknown:${normalize(
                originalName,
              )}`;

          const current =
            groups.get(groupKey) ?? [];

          current.push({
            card,
            promotion,
          });

          groups.set(groupKey, current);
        }

        for (const rows of groups.values()) {
          const availableLeader =
            rows.find(
              (row) =>
                row.promotion?.stock_status ===
                "available",
            ) ?? rows[0];

          if (!availableLeader) continue;

          const leader = availableLeader.card;
          const promotions = rows
            .map((row) => row.promotion)
            .filter(
              (
                promotion,
              ): promotion is PublicStorefrontPromotion =>
                Boolean(promotion),
            );

          rows.forEach((row) => {
            if (row.card !== leader) {
              row.card.hidden = true;
            }
          });

          if (promotions.length === 0) {
            continue;
          }

          const first = promotions[0];
          const product =
            first.product_id
              ? productById.get(
                  `${operation}:${first.product_id}`,
                ) ?? null
              : null;

          leader.classList.add(
            "company-promotion-grouped",
          );

          if (first.product_id) {
            leader.dataset.storefrontProductId =
              first.product_id;
          }

          leader.dataset.storefrontOperation =
            operation;

          const name =
            leader.querySelector<HTMLElement>(
              ".public-storefront-card-copy h3",
            );

          if (name && product) {
            name.textContent = product.name;
          }

          const usablePromotions =
            promotions.filter(
              (promotion) =>
                promotion.stock_status ===
                "available",
            );

          const priceSource =
            usablePromotions.length > 0
              ? usablePromotions
              : promotions;

          const regular = priceSource.map(
            (promotion) =>
              promotion.current_price,
          );
          const promotional =
            priceSource.map(
              (promotion) =>
                promotion.promotional_price,
            );

          const hasDiscount = priceSource.some(
            (promotion) =>
              promotion.promotional_price <
              promotion.current_price,
          );

          const price =
            leader.querySelector<HTMLElement>(
              ".public-storefront-promotion-price",
            );

          if (price) {
            price.replaceChildren();

            if (hasDiscount) {
              const old =
                document.createElement("span");
              old.textContent =
                rangeLabel(regular);
              price.appendChild(old);
            }

            const current =
              document.createElement("strong");
            current.textContent =
              rangeLabel(promotional);
            price.appendChild(current);
          }

          const availableOptions =
            usablePromotions
              .map((promotion) => ({
                promotion,
                label: optionLabel(
                  promotion,
                  product,
                ),
              }))
              .filter(
                (entry) =>
                  Boolean(entry.label),
              );

          const uniqueOptions =
            Array.from(
              new Map(
                availableOptions.map(
                  (entry) => [
                    normalize(entry.label),
                    entry,
                  ],
                ),
              ).values(),
            );

          if (uniqueOptions.length > 0) {
            const copy =
              leader.querySelector<HTMLElement>(
                ".public-storefront-card-copy",
              );

            if (copy) {
              const strip =
                document.createElement("div");
              strip.dataset.companyPromotionOptions =
                "true";
              strip.className =
                "public-promotion-options-strip";

              const label =
                document.createElement("span");
              label.textContent =
                "Opções em promoção";

              const chips =
                document.createElement("div");

              const visible =
                uniqueOptions.slice(0, 4);

              for (const option of visible) {
                const chip =
                  document.createElement(
                    "span",
                  );
                chip.className =
                  "public-promotion-option-chip";
                chip.textContent =
                  option.label;
                chips.appendChild(chip);
              }

              if (
                uniqueOptions.length >
                visible.length
              ) {
                const more =
                  document.createElement(
                    "span",
                  );
                more.className =
                  "public-promotion-option-chip more";
                more.textContent = `+${
                  uniqueOptions.length -
                  visible.length
                }`;
                chips.appendChild(more);
              }

              strip.append(label, chips);

              const priceElement =
                copy.querySelector(
                  ".public-storefront-promotion-price",
                );

              if (
                priceElement?.parentElement ===
                copy
              ) {
                priceElement.insertAdjacentElement(
                  "afterend",
                  strip,
                );
              } else {
                copy.appendChild(strip);
              }
            }
          }

          const stockNote =
            leader.querySelector<HTMLElement>(
              ".promotion-stock-copy",
            ) ??
            leader.querySelector<HTMLElement>(
              ".sold-out-copy",
            );

          const totalAvailable =
            usablePromotions.reduce(
              (sum, promotion) =>
                sum +
                promotion.available_quantity,
              0,
            );

          if (stockNote) {
            if (
              usablePromotions.length === 0
            ) {
              stockNote.className =
                "sold-out-copy";
              stockNote.textContent =
                "Produto esgotado";
              leader.classList.add(
                "sold-out",
              );
            } else {
              stockNote.className =
                "promotion-stock-copy";
              stockNote.textContent = `${
                uniqueOptions.length ||
                usablePromotions.length
              } opção(ões) · ${totalAvailable} unidade(s) disponíveis`;
              leader.classList.remove(
                "sold-out",
              );

              const soldOverlay =
                leader.querySelector<HTMLElement>(
                  ".promotion-ux-sold-out-overlay",
                );

              if (soldOverlay) {
                soldOverlay.style.display =
                  "none";
              }
            }
          }

          const discount =
            leader.querySelector<HTMLElement>(
              ".public-storefront-discount",
            );

          if (discount) {
            const discounts =
              priceSource
                .map(
                  (promotion) =>
                    promotion.discount_pct,
                )
                .filter(
                  (value) => value > 0,
                );

            if (discounts.length > 0) {
              const maxDiscount =
                Math.max(...discounts);
              const minDiscount =
                Math.min(...discounts);

              discount.textContent =
                Math.abs(
                  maxDiscount -
                    minDiscount,
                ) < 0.01
                  ? `-${Math.round(
                      maxDiscount,
                    )}%`
                  : `até -${Math.round(
                      maxDiscount,
                    )}%`;
            }
          }
        }

        const counter =
          section.querySelector<HTMLElement>(
            "header > span",
          );

        if (counter) {
          counter.textContent = `${
            groups.size
          } produto${
            groups.size === 1 ? "" : "s"
          }`;
        }
      }
    }

    function apply() {
      frame = 0;

      observer?.disconnect();

      enhanceOperationFilter();
      enhancePromotionGroups();

      observer?.observe(host, {
        childList: true,
        subtree: true,
      });
    }

    function schedule() {
      if (frame) return;
      frame =
        window.requestAnimationFrame(
          apply,
        );
    }

    observer =
      new MutationObserver(schedule);

    apply();

    return () => {
      observer?.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    productById,
    promotionsByExactCard,
  ]);

  return null;
}
