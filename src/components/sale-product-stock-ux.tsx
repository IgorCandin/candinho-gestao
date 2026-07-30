"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type AvailabilityRow = {
  product_id: string;
  location_id: string;
  available_quantity: number;
};

function findOriginSelect() {
  const labels = Array.from(
    document.querySelectorAll<HTMLLabelElement>("label.field"),
  );

  const originLabel = labels.find((label) => {
    const caption = label.querySelector(":scope > span")?.textContent ?? "";
    return caption.includes("Estoque / depósito de origem");
  });

  return originLabel?.querySelector<HTMLSelectElement>("select") ?? null;
}

function productSelects() {
  return Array.from(
    document.querySelectorAll<HTMLSelectElement>(
      "label.sale-product-field select",
    ),
  );
}

export function SaleProductStockUX({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || pathname !== "/vendas/nova") return;

    let cancelled = false;
    let availability: AvailabilityRow[] = [];
    let scheduled = 0;

    const quantityByKey = new Map<string, number>();

    function rebuildIndex() {
      quantityByKey.clear();

      for (const row of availability) {
        quantityByKey.set(
          `${row.location_id}:${row.product_id}`,
          Number(row.available_quantity ?? 0),
        );
      }
    }

    function apply() {
      scheduled = 0;
      if (cancelled) return;

      const origin = findOriginSelect();
      const locationId = origin?.value ?? "";

      for (const select of productSelects()) {
        for (const option of Array.from(select.options)) {
          if (!option.value) continue;

          const base =
            option.dataset.stockBaseLabel ??
            option.textContent?.trim() ??
            "";

          if (!option.dataset.stockBaseLabel) {
            option.dataset.stockBaseLabel = base;
          }

          const quantity =
            quantityByKey.get(`${locationId}:${option.value}`) ?? 0;

          const desired =
            quantity > 0 ? `${base} · ${quantity} disp.` : base;

          if (option.textContent !== desired) {
            option.textContent = desired;
          }

          if (quantity > 0) {
            option.style.color = "#61d996";
            option.style.fontWeight = "700";
            option.style.backgroundColor = "#0d1712";
          } else {
            option.style.color = "";
            option.style.fontWeight = "";
            option.style.backgroundColor = "";
          }
        }

        const selectedQuantity = select.value
          ? quantityByKey.get(`${locationId}:${select.value}`) ?? 0
          : 0;

        if (selectedQuantity > 0) {
          select.dataset.hasStock = "true";
          select.title = `${selectedQuantity} unidade(s) disponível(is) no estoque selecionado`;
        } else {
          delete select.dataset.hasStock;
          select.title = "";
        }

        const label = select.closest<HTMLLabelElement>(
          "label.sale-product-field",
        );

        if (
          label &&
          !label.querySelector(".sale-product-stock-legend")
        ) {
          const hint = document.createElement("small");
          hint.className = "sale-product-stock-legend";
          hint.textContent =
            "Verde = disponível no estoque de origem selecionado.";
          label.appendChild(hint);
        }
      }
    }

    function scheduleApply() {
      if (scheduled) return;
      scheduled = window.requestAnimationFrame(apply);
    }

    function onChange(event: Event) {
      const target = event.target as HTMLElement | null;

      if (
        target?.matches("label.sale-product-field select") ||
        target === findOriginSelect()
      ) {
        scheduleApply();
      }
    }

    const observer = new MutationObserver(() => scheduleApply());

    async function load() {
      try {
        const response = await fetch("/api/vendas/estoque-disponivel", {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          rows?: AvailabilityRow[];
        };

        if (!response.ok || cancelled) return;

        availability = Array.isArray(payload.rows) ? payload.rows : [];
        rebuildIndex();
        apply();

        const form = document.querySelector("form.new-sale-layout");

        if (form) {
          observer.observe(form, {
            childList: true,
            subtree: true,
          });
        }

        document.addEventListener("change", onChange, true);
      } catch {
        // Melhoria visual: não interfere na venda se a consulta falhar.
      }
    }

    void load();

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("change", onChange, true);

      if (scheduled) {
        window.cancelAnimationFrame(scheduled);
      }
    };
  }, [enabled, pathname]);

  return null;
}
