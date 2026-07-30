"use client";

import { useEffect } from "react";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function PublicCatalogCardLinks({
  links,
}: {
  links: Array<{ product_id: string; slug: string; name: string | null }>;
}) {
  useEffect(() => {
    const byName = new Map(
      links
        .filter((item) => item.name)
        .map((item) => [normalize(item.name ?? ""), item.slug]),
    );

    const cleanup: Array<() => void> = [];

    const apply = () => {
      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".public-storefront-blocks > section",
        ),
      );

      for (const block of blocks) {
        const heading = block.querySelector("header h2")?.textContent ?? "";
        if (normalize(heading) !== "suplementos") continue;

        const cards = Array.from(
          block.querySelectorAll<HTMLElement>(".public-storefront-card"),
        );

        for (const card of cards) {
          if (card.dataset.catalogLinked === "true") continue;

          const name = card.querySelector("h3")?.textContent ?? "";
          const slug = byName.get(normalize(name));
          if (!slug) continue;

          card.dataset.catalogLinked = "true";
          card.setAttribute("role", "link");
          card.setAttribute("tabindex", "0");
          card.setAttribute("aria-label", `Abrir página de ${name}`);
          card.style.cursor = "pointer";
          card.style.transition = "transform .14s ease,border-color .14s ease";

          const copy = card.querySelector<HTMLElement>(
            ".public-storefront-card-copy",
          );

          if (copy && !copy.querySelector("[data-product-detail-link]")) {
            const hint = document.createElement("span");
            hint.dataset.productDetailLink = "true";
            hint.textContent = "Ver detalhes →";
            hint.style.marginTop = "9px";
            hint.style.color = "#d9a63d";
            hint.style.fontSize = "11px";
            hint.style.fontWeight = "800";
            copy.appendChild(hint);
          }

          const navigate = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (
              target?.closest(
                "button,input,select,textarea,a,[role='button']",
              )
            ) {
              return;
            }

            window.location.href = `/catalogo/${slug}`;
          };

          const keydown = (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              window.location.href = `/catalogo/${slug}`;
            }
          };

          const enter = () => {
            card.style.transform = "translateY(-2px)";
            card.style.borderColor = "rgba(217,166,61,.34)";
          };

          const leave = () => {
            card.style.transform = "";
            card.style.borderColor = "";
          };

          card.addEventListener("click", navigate);
          card.addEventListener("keydown", keydown);
          card.addEventListener("mouseenter", enter);
          card.addEventListener("mouseleave", leave);

          cleanup.push(() => {
            card.removeEventListener("click", navigate);
            card.removeEventListener("keydown", keydown);
            card.removeEventListener("mouseenter", enter);
            card.removeEventListener("mouseleave", leave);
          });
        }
      }
    };

    apply();

    const observer = new MutationObserver(apply);
    const host = document.querySelector(".public-storefront-browser");

    if (host) {
      observer.observe(host, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      cleanup.forEach((fn) => fn());
    };
  }, [links]);

  return null;
}
