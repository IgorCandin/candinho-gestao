"use client";

import { useEffect } from "react";

type CatalogOperation = "supplements" | "fitness";

export function PublicCatalogOperationLock({
  operation,
}: {
  operation: CatalogOperation;
}) {
  useEffect(() => {
    const host = document.querySelector<HTMLElement>(
      ".public-storefront-browser",
    );

    if (!host) return;
    const storefrontHost = host;

    let frame = 0;

    function enforce() {
      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const select = storefrontHost.querySelector<HTMLSelectElement>(
          'select[aria-label="Filtrar por operação"]',
        );

        if (select) {
          select.style.display = "none";
          select.setAttribute("aria-hidden", "true");
          select.tabIndex = -1;

          if (select.value !== operation) {
            select.value = operation;
            select.dispatchEvent(
              new Event("change", {
                bubbles: true,
              }),
            );
          }
        }

        const companyToggle = storefrontHost.querySelector<HTMLElement>(
          "[data-company-operation-toggle]",
        );

        if (companyToggle) {
          companyToggle.style.display = "none";
          companyToggle.setAttribute("aria-hidden", "true");
        }
      });
    }

    enforce();

    const observer = new MutationObserver(enforce);

    observer.observe(storefrontHost, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [operation]);

  return null;
}
