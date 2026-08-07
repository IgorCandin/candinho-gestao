"use client";

import { useEffect, useMemo } from "react";
import type { ActivePromotionRow } from "@/lib/active-promotion-data";

type SaleIntent = "quote" | "confirmed";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function cents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function setNativeInputValue(input: HTMLInputElement, value: number | string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );

  descriptor?.set?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

function datePlusDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export function CommercialSaleRefinementUX({
  promotions,
  regularPrices,
  productDurations,
  hasSavedQuote,
}: {
  promotions: ActivePromotionRow[];
  regularPrices: Record<string, number>;
  productDurations: Record<string, number>;
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

    let intent: SaleIntent = hasSavedQuote ? "confirmed" : "quote";
    const cleanups: Array<() => void> = [];
    const enhancedProducts = new WeakSet<Element>();
    const enhancedBags = new WeakSet<Element>();

    function selectedItems() {
      return Array.from(document.querySelectorAll(".sale-form-item"))
        .map((item) => {
          const productSelect =
            item.querySelector<HTMLSelectElement>(
              ".sale-product-field select",
            );

          if (!productSelect?.value) return null;

          const numberInputs = Array.from(
            item.querySelectorAll<HTMLInputElement>(
              'input[type="number"]',
            ),
          );

          const priceInput = numberInputs.find(
            (input) => input.step === "0.01",
          );

          const quantityInput = numberInputs.find(
            (input) =>
              input !== priceInput &&
              (
                input.step === "1" ||
                input.min === "1" ||
                !input.step
              ),
          );

          const quantity = Math.max(
            1,
            Math.round(Number(quantityInput?.value || 1)),
          );

          const duration = Math.max(
            1,
            Math.round(productDurations[productSelect.value] || 30),
          );

          return {
            productId: productSelect.value,
            productName:
              productSelect.options[
                productSelect.selectedIndex
              ]?.textContent?.trim() || "Produto",
            quantity,
            duration,
            estimatedDays: duration * quantity,
          };
        })
        .filter(Boolean) as Array<{
          productId: string;
          productName: string;
          quantity: number;
          duration: number;
          estimatedDays: number;
        }>;
    }

    function drawFollowupPreview() {
      const side = document.querySelector<HTMLElement>(".new-sale-side");
      if (!side) return;

      let panel = side.querySelector<HTMLElement>(
        ".v4510-followup-preview",
      );

      if (!panel) {
        panel = document.createElement("article");
        panel.className =
          "panel v4510-followup-preview v4510-confirmed-only";
        side.append(panel);
      }

      const items = selectedItems();
      const signature = JSON.stringify(
        items.map((item) => [
          item.productId,
          item.quantity,
          item.duration,
        ]),
      );

      if (panel.dataset.signature === signature) return;
      panel.dataset.signature = signature;

      if (!items.length) {
        panel.innerHTML = `
          <div class="v4510-followup-head">
            <span>AGENDA INTELIGENTE</span>
            <strong>Escolha os produtos para calcular os retornos.</strong>
          </div>
        `;
        return;
      }

      const postDays = Math.min(
        ...items.map((item) =>
          Math.min(30, item.estimatedDays),
        ),
      );

      const replenishments = items
        .filter((item) => item.estimatedDays > 30)
        .sort((a, b) => a.estimatedDays - b.estimatedDays);

      const replacementHtml = replenishments.length
        ? replenishments
            .map(
              (item) => `
                <li>
                  <span>
                    <strong>${escapeHtml(item.productName)}</strong>
                    <small>
                      ${item.quantity} un. · duração estimada ${item.estimatedDays} dias
                    </small>
                  </span>
                  <b>${datePlusDays(item.estimatedDays)}</b>
                </li>
              `,
            )
            .join("")
        : `
          <li class="merged">
            <span>
              <strong>Reposição junto do pós-venda</strong>
              <small>
                O produto deve acabar em até 30 dias; não criaremos dois contatos iguais.
              </small>
            </span>
          </li>
        `;

      panel.innerHTML = `
        <div class="v4510-followup-head">
          <span>AGENDA INTELIGENTE</span>
          <strong>O ERP calcula os retornos ao confirmar.</strong>
          <small>
            Você pode reagendar depois pela Agenda.
          </small>
        </div>

        <div class="v4510-postsale-main">
          <span>Pós-venda sugerido</span>
          <strong>${datePlusDays(postDays)}</strong>
          <small>
            ${postDays} dia${postDays === 1 ? "" : "s"} após a compra.
          </small>
        </div>

        <div class="v4510-replenishment-list">
          <span>Reposição provável</span>
          <ul>${replacementHtml}</ul>
        </div>
      `;
    }

    function enhanceItem(item: Element) {
      if (enhancedProducts.has(item)) return;

      const productSelect =
        item.querySelector<HTMLSelectElement>(
          ".sale-product-field select",
        );

      const numberInputs = Array.from(
        item.querySelectorAll<HTMLInputElement>(
          'input[type="number"]',
        ),
      );

      const priceInput = numberInputs.find(
        (input) => input.step === "0.01",
      );

      if (!productSelect || !priceInput) return;

      const priceField = priceInput.closest<HTMLElement>(".field");
      if (!priceField) return;

      enhancedProducts.add(item);

      const control = document.createElement("div");
      control.className = "v458-promotion-choice";
      priceField.append(control);

      const draw = () => {
        const promotion = promotionMap.get(productSelect.value);
        control.replaceChildren();

        if (!promotion) {
          control.hidden = true;
          drawFollowupPreview();
          return;
        }

        control.hidden = false;

        const currentValue = Number(priceInput.value || 0);
        const regularPrice =
          regularPrices[productSelect.value] ??
          promotion.current_price;

        const applied =
          cents(currentValue) ===
          cents(promotion.effective_promotional_price);

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
        drawFollowupPreview();
      };

      const redraw = () => window.requestAnimationFrame(draw);

      productSelect.addEventListener("change", redraw);
      priceInput.addEventListener("input", redraw);
      priceInput.addEventListener("change", redraw);

      for (const input of numberInputs) {
        input.addEventListener("input", drawFollowupPreview);
        input.addEventListener("change", drawFollowupPreview);
      }

      cleanups.push(() => {
        productSelect.removeEventListener("change", redraw);
        priceInput.removeEventListener("input", redraw);
        priceInput.removeEventListener("change", redraw);

        for (const input of numberInputs) {
          input.removeEventListener("input", drawFollowupPreview);
          input.removeEventListener("change", drawFollowupPreview);
        }

        control.remove();
      });

      window.requestAnimationFrame(draw);
    }

    function enhanceBagChoice() {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("label, .field"),
      ).filter((element) =>
        /\bsacola\b/i.test(element.textContent || ""),
      );

      for (const candidate of candidates) {
        const field = candidate.classList.contains("field")
          ? candidate
          : candidate.closest<HTMLElement>(".field") ??
            candidate.parentElement;

        if (!field || enhancedBags.has(field)) continue;

        const checkbox =
          field.querySelector<HTMLInputElement>(
            'input[type="checkbox"]',
          );

        if (!checkbox) continue;

        enhancedBags.add(field);
        field.classList.add("v4510-bag-field");

        const originalLabel =
          checkbox.closest<HTMLElement>("label");

        originalLabel?.classList.add("v4510-bag-native");

        const control = document.createElement("div");
        control.className = "v4510-bag-toggle";
        control.innerHTML = `
          <div>
            <span>EMBALAGEM</span>
            <strong>Sacola na entrega?</strong>
            <small>Uma decisão rápida; sem campo perdido no formulário.</small>
          </div>
          <div class="v4510-bag-options">
            <button type="button" data-bag="no">Sem sacola</button>
            <button type="button" data-bag="yes">Usou sacola</button>
          </div>
        `;

        const sync = () => {
          for (const button of control.querySelectorAll<HTMLButtonElement>(
            "button[data-bag]",
          )) {
            button.classList.toggle(
              "active",
              (button.dataset.bag === "yes") === checkbox.checked,
            );
          }
        };

        for (const button of control.querySelectorAll<HTMLButtonElement>(
          "button[data-bag]",
        )) {
          button.addEventListener("click", () => {
            checkbox.checked = button.dataset.bag === "yes";
            checkbox.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
            sync();
          });
        }

        checkbox.addEventListener("change", sync);
        field.append(control);
        sync();

        cleanups.push(() => {
          checkbox.removeEventListener("change", sync);
          control.remove();
          originalLabel?.classList.remove("v4510-bag-native");
          field.classList.remove("v4510-bag-field");
        });
      }
    }

    function applyIntent() {
      const confirmed =
        hasSavedQuote || intent === "confirmed";

      body.classList.toggle(
        "v4510-confirmed-intent",
        confirmed,
      );
      body.classList.toggle(
        "v4510-quote-intent",
        !confirmed,
      );

      const side = document.querySelector<HTMLElement>(".new-sale-side");
      if (!side) return;

      for (const panel of side.querySelectorAll<HTMLElement>(
        "article.panel",
      )) {
        const title =
          panel.querySelector("h2")?.textContent?.trim() ?? "";

        if (["Pagamento", "Entrega", "Pós-venda"].includes(title)) {
          panel.classList.remove("v458-stage-hidden");
          panel.classList.toggle(
            "v4510-stage-hidden",
            !confirmed,
          );
        }

        if (title === "Pós-venda" && confirmed) {
          panel.classList.add("v4510-postsale-native");

          if (!panel.querySelector(".v4510-postsale-auto-note")) {
            const note = document.createElement("div");
            note.className = "v4510-postsale-auto-note";
            note.innerHTML = `
              <strong>Data automática</strong>
              <span>
                O pós-venda será calculado pela duração dos produtos.
                Depois você pode reagendar pela Agenda.
              </span>
            `;
            panel.querySelector(".panel-body")?.prepend(note);
          }
        }
      }

      drawFollowupPreview();
    }

    function ensureIntentSelector() {
      const side = document.querySelector<HTMLElement>(".new-sale-side");
      if (!side) return;

      let note =
        side.querySelector<HTMLElement>(".v458-budget-stage-note");

      if (!note) {
        note = document.createElement("article");
        note.className = "v458-budget-stage-note";
        side.prepend(note);
      }

      if (hasSavedQuote) {
        if (note.dataset.v4510Saved !== "1") {
          note.dataset.v4510Saved = "1";
          note.innerHTML = `
            <span>ORÇAMENTO SALVO</span>
            <strong>Revise e confirme quando o cliente fechar.</strong>
            <small>
              Pagamento, entrega e agenda inteligente já estão disponíveis para a confirmação.
            </small>
          `;
        }
        return;
      }

      note.classList.add("v4510-intent-card");

      if (!note.querySelector(".v4510-intent-options")) {
        note.innerHTML = `
          <span>COMO ESTÁ ESSA NEGOCIAÇÃO?</span>
          <strong>Escolha antes de preencher os detalhes finais.</strong>
          <small>
            Se ainda não vendeu, deixe como orçamento. Se o cliente já fechou,
            libere pagamento, entrega e pós-venda.
          </small>
          <div class="v4510-intent-options">
            <button type="button" data-intent="quote">
              <b>Apenas orçamento</b>
              <em>Ainda é uma proposta</em>
            </button>
            <button type="button" data-intent="confirmed">
              <b>Orçamento confirmado</b>
              <em>Cliente já fechou</em>
            </button>
          </div>
        `;

        for (const button of note.querySelectorAll<HTMLButtonElement>(
          "button[data-intent]",
        )) {
          button.addEventListener("click", () => {
            intent =
              button.dataset.intent === "confirmed"
                ? "confirmed"
                : "quote";

            syncIntentButtons();
            applyIntent();
          });
        }
      }

      syncIntentButtons();
    }

    function syncIntentButtons() {
      document
        .querySelectorAll<HTMLButtonElement>(
          ".v4510-intent-options button[data-intent]",
        )
        .forEach((button) => {
          button.classList.toggle(
            "active",
            button.dataset.intent === intent,
          );
        });
    }

    function refineSaveModal() {
      const modal =
        document.querySelector<HTMLElement>(".budget-choice-modal");

      if (!modal) return;

      modal.dataset.v458Refined = "1";

      const quote =
        modal.querySelector<HTMLElement>(
          ".budget-choice-card.quote",
        );

      const confirmed =
        modal.querySelector<HTMLElement>(
          ".budget-choice-card.confirmed",
        );

      quote?.classList.remove("v458-stage-hidden");
      confirmed?.classList.remove("v458-stage-hidden");

      if (modal.dataset.v4510Refined !== "1") {
        modal.dataset.v4510Refined = "1";

        const title =
          modal.querySelector<HTMLElement>("#budget-choice-title");

        if (title) {
          title.textContent = "Como deseja salvar?";
        }

        const description =
          modal.querySelector<HTMLElement>(
            ".budget-choice-heading p",
          );

        if (description) {
          description.textContent =
            "Orçamento mantém a proposta aberta. Orçamento confirmado cria a venda agora.";
        }

        const quoteTitle =
          quote?.querySelector<HTMLElement>("strong");
        const quoteDescription =
          quote?.querySelector<HTMLElement>("small");

        if (quoteTitle) {
          quoteTitle.textContent = "Apenas orçamento";
        }

        if (quoteDescription) {
          quoteDescription.textContent =
            "Salva a proposta sem registrar pagamento, entrega ou movimentação de estoque.";
        }

        const confirmedTitle =
          confirmed?.querySelector<HTMLElement>("strong");

        const confirmedDescription =
          confirmed?.querySelector<HTMLElement>("small");

        if (confirmedTitle) {
          confirmedTitle.textContent = "Orçamento confirmado";
        }

        if (confirmedDescription) {
          confirmedDescription.textContent =
            "Cria a venda agora usando pagamento, entrega e agenda inteligente informados.";
        }
      }

      quote?.classList.toggle(
        "v4510-modal-recommended",
        intent === "quote" && !hasSavedQuote,
      );

      confirmed?.classList.toggle(
        "v4510-modal-recommended",
        intent === "confirmed" || hasSavedQuote,
      );
    }

    function scan() {
      document
        .querySelectorAll(".sale-form-item")
        .forEach((item) => enhanceItem(item));

      ensureIntentSelector();
      enhanceBagChoice();
      applyIntent();
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

      body.classList.remove(
        "v458-unsaved-budget",
        "v458-saved-budget",
        "v4510-confirmed-intent",
        "v4510-quote-intent",
      );
    };
  }, [
    hasSavedQuote,
    productDurations,
    promotionMap,
    regularPrices,
  ]);

  return null;
}
