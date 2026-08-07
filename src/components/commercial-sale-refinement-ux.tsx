"use client";

import { useEffect, useMemo } from "react";
import type { ActivePromotionRow } from "@/lib/active-promotion-data";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function cents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function setNativeInputValue(input: HTMLInputElement, value: number) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );

  descriptor?.set?.call(input, value.toFixed(2));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function CommercialSaleRefinementUX({
  promotions,
  regularPrices,
  hasSavedQuote,
}: {
  promotions: ActivePromotionRow[];
  regularPrices: Record<string, number>;
  hasSavedQuote: boolean;
}) {
  const promotionMap = useMemo(() => {
    const map = new Map<string, ActivePromotionRow>();

    for (const row of promotions) {
      if (
        row.operation_scope !== "supplements" ||
        !row.supplement_product_id ||
        row.available_quantity <= 0 ||
        row.effective_promotional_price >= row.current_price
      ) {
        continue;
      }

      const existing = map.get(row.supplement_product_id);
      if (
        !existing ||
        row.effective_promotional_price <
          existing.effective_promotional_price
      ) {
        map.set(row.supplement_product_id, row);
      }
    }

    return map;
  }, [promotions]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("v458-unsaved-budget", !hasSavedQuote);
    body.classList.toggle("v458-saved-budget", hasSavedQuote);

    const cleanups: Array<() => void> = [];
    const enhanced = new WeakSet<Element>();

    function enhanceItem(item: Element) {
      if (enhanced.has(item)) return;

      const productSelect =
        item.querySelector<HTMLSelectElement>(".sale-product-field select");
      const priceInput = Array.from(
        item.querySelectorAll<HTMLInputElement>('input[type="number"]'),
      ).find((input) => input.step === "0.01");

      if (!productSelect || !priceInput) return;

      const priceField = priceInput.closest<HTMLElement>(".field");
      if (!priceField) return;

      enhanced.add(item);

      const control = document.createElement("div");
      control.className = "v458-promotion-choice";
      priceField.append(control);

      const draw = () => {
        const promotion = promotionMap.get(productSelect.value);
        control.replaceChildren();

        if (!promotion) {
          control.hidden = true;
          return;
        }

        control.hidden = false;

        const currentValue = Number(priceInput.value || 0);
        const regularPrice =
          regularPrices[productSelect.value] ?? promotion.current_price;
        const applied =
          cents(currentValue) === cents(promotion.effective_promotional_price);

        const info = document.createElement("div");
        info.className = "v458-promotion-copy";

        const eyebrow = document.createElement("span");
        eyebrow.textContent = applied
          ? "Valor promocional aplicado"
          : promotion.promotion_name;

        const values = document.createElement("strong");
        values.textContent = `${money(
          regularPrice,
        )} → ${money(promotion.effective_promotional_price)}`;

        const detail = document.createElement("small");
        detail.textContent = promotion.ends_on
          ? `Disponível até ${promotion.ends_on} ou enquanto durar o estoque.`
          : "Disponível enquanto durar o estoque.";

        info.append(eyebrow, values, detail);

        const button = document.createElement("button");
        button.type = "button";
        button.className = applied
          ? "button ghost compact-button v458-promotion-button active"
          : "button gold compact-button v458-promotion-button";
        button.textContent = applied
          ? "Usar preço normal"
          : "Usar valor promocional";

        button.addEventListener(
          "click",
          () => {
            setNativeInputValue(
              priceInput,
              applied
                ? regularPrice
                : promotion.effective_promotional_price,
            );

            window.requestAnimationFrame(draw);
          },
          { once: true },
        );

        control.append(info, button);
      };

      const redraw = () => window.requestAnimationFrame(draw);

      productSelect.addEventListener("change", redraw);
      priceInput.addEventListener("input", redraw);
      priceInput.addEventListener("change", redraw);

      cleanups.push(() => {
        productSelect.removeEventListener("change", redraw);
        priceInput.removeEventListener("input", redraw);
        priceInput.removeEventListener("change", redraw);
        control.remove();
      });

      window.requestAnimationFrame(draw);
    }

    function stagePanels() {
      const side = document.querySelector<HTMLElement>(".new-sale-side");
      if (!side) return;

      if (!side.querySelector(".v458-budget-stage-note")) {
        const note = document.createElement("article");
        note.className = "v458-budget-stage-note";
        note.innerHTML = hasSavedQuote
          ? `
            <span>ETAPA 2 · ORÇAMENTO SALVO</span>
            <strong>Revise e confirme quando o cliente fechar.</strong>
            <small>Pagamento e entrega serão registrados na venda criada; aqui você só prepara a confirmação.</small>
          `
          : `
            <span>ETAPA 1 · PROPOSTA</span>
            <strong>Monte e salve o orçamento primeiro.</strong>
            <small>Nenhum pagamento, entrega ou baixa de estoque é registrado antes da confirmação.</small>
          `;
        side.prepend(note);
      }

      for (const panel of side.querySelectorAll<HTMLElement>("article.panel")) {
        const title = panel.querySelector("h2")?.textContent?.trim() ?? "";

        // Pagamento e entrega pertencem à venda confirmada, não ao orçamento.
        if (["Pagamento", "Entrega"].includes(title)) {
          panel.classList.add("v458-stage-hidden");
        }

        // Pós-venda só é preparado na revisão, imediatamente antes de confirmar.
        if (!hasSavedQuote && title === "Pós-venda") {
          panel.classList.add("v458-stage-hidden");
        }
      }
    }

    function refineSaveModal() {
      const modal = document.querySelector<HTMLElement>(".budget-choice-modal");
      if (!modal || hasSavedQuote || modal.dataset.v458Refined === "1") return;

      modal.dataset.v458Refined = "1";

      const confirmed =
        modal.querySelector<HTMLElement>(".budget-choice-card.confirmed");
      confirmed?.classList.add("v458-stage-hidden");

      const title = modal.querySelector<HTMLElement>("#budget-choice-title");
      if (title) title.textContent = "Salvar esta proposta";

      const description = modal.querySelector<HTMLElement>(
        ".budget-choice-heading p",
      );
      if (description) {
        description.textContent =
          "Primeiro salve o orçamento. Depois, na revisão, você poderá confirmar como venda.";
      }

      const quote = modal.querySelector<HTMLElement>(".budget-choice-card.quote");
      const quoteTitle = quote?.querySelector<HTMLElement>("strong");
      const quoteDescription = quote?.querySelector<HTMLElement>("small");

      if (quoteTitle) quoteTitle.textContent = "Salvar orçamento";
      if (quoteDescription) {
        quoteDescription.textContent =
          "Salva a proposta sem receber pagamento, entregar produto ou movimentar estoque.";
      }
    }

    function scan() {
      document
        .querySelectorAll(".sale-form-item")
        .forEach((item) => enhanceItem(item));

      stagePanels();
      refineSaveModal();
    }

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      body.classList.remove("v458-unsaved-budget", "v458-saved-budget");
    };
  }, [hasSavedQuote, promotionMap, regularPrices]);

  return null;
}
