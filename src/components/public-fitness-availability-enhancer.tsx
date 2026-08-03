"use client";

import { useEffect, useMemo } from "react";
import type { PublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import type { PublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function PublicFitnessAvailabilityEnhancer({
  snapshot,
  availability,
}: {
  snapshot: PublicStorefrontSnapshot;
  availability: PublicFitnessAvailabilityMap;
}) {
  const optionsByName = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        size: string;
        color: string;
        available_quantity: number;
      }>
    >();

    for (const product of snapshot.products.fitness) {
      map.set(
        normalize(product.name),
        availability[product.id] ?? [],
      );
    }

    return map;
  }, [availability, snapshot.products.fitness]);

  useEffect(() => {
    let frame = 0;

    function enhance() {
      frame = 0;

      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".public-storefront-blocks > section",
        ),
      );

      for (const block of blocks) {
        const title =
          block.querySelector<HTMLElement>("header h2")
            ?.textContent ?? "";

        if (normalize(title) !== "fitness") continue;

        const cards = Array.from(
          block.querySelectorAll<HTMLElement>(
            ".public-storefront-card",
          ),
        );

        for (const card of cards) {
          // A promoção pode ser de uma variação específica.
          // Não misturamos todas as variações do produto nesse card.
          if (
            card.classList.contains(
              "public-storefront-promotion-card",
            )
          ) {
            continue;
          }

          if (
            card.querySelector(
              "[data-fitness-availability-card]",
            )
          ) {
            continue;
          }

          const name =
            card.querySelector<HTMLElement>(
              ".public-storefront-card-copy h3",
            )?.textContent ?? "";

          const options =
            optionsByName.get(normalize(name)) ?? [];

          if (options.length === 0) continue;

          const copy =
            card.querySelector<HTMLElement>(
              ".public-storefront-card-copy",
            );

          if (!copy) continue;

          const container =
            document.createElement("div");
          container.dataset.fitnessAvailabilityCard = "true";
          container.className =
            "public-fitness-availability-card";

          const label =
            document.createElement("span");
          label.className =
            "fitness-availability-label";
          label.textContent = "Tamanhos e cores";

          const chips =
            document.createElement("div");
          chips.className =
            "fitness-availability-chips";

          const visible = options.slice(0, 6);

          for (const option of visible) {
            const chip =
              document.createElement("span");
            chip.className =
              "fitness-availability-chip";
            chip.textContent =
              `${option.size} · ${option.color}`;
            chips.appendChild(chip);
          }

          if (options.length > visible.length) {
            const more =
              document.createElement("span");
            more.className =
              "fitness-availability-chip more";
            more.textContent =
              `+${options.length - visible.length}`;
            chips.appendChild(more);
          }

          container.append(label, chips);

          const price =
            copy.querySelector(
              ".public-storefront-product-effective-price",
            ) ??
            copy.querySelector(
              ".public-storefront-product-promo-note",
            );

          if (price?.parentElement === copy) {
            price.insertAdjacentElement(
              "afterend",
              container,
            );
          } else {
            copy.appendChild(container);
          }
        }
      }
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(enhance);
    }

    enhance();

    const host = document.querySelector(
      ".public-storefront-browser",
    );
    const observer = new MutationObserver(schedule);

    if (host) {
      observer.observe(host, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [optionsByName]);

  return null;
}
