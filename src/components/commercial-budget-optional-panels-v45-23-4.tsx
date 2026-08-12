"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TARGETS = new Map([
  [
    "Ajustes do valor e brinde",
    "Desconto, lucro combinado ou brinde",
  ],
  [
    "Observações",
    "Informações opcionais para o orçamento/PDF",
  ],
]);

export function CommercialBudgetOptionalPanelsV45234() {
  const pathname = usePathname();

  useEffect(() => {
    const active =
      pathname === "/vendas/nova" ||
      pathname === "/suplementos/vendas/nova";

    if (!active) return;

    const cleanups: Array<() => void> = [];

    function enhance() {
      for (const panel of document.querySelectorAll<HTMLElement>(
        ".new-sale-main > article.panel",
      )) {
        if (panel.dataset.v45234Optional === "1") continue;

        const title =
          panel.querySelector<HTMLElement>(".panel-head h2")
            ?.textContent?.trim() ?? "";

        const helper = TARGETS.get(title);
        if (!helper) continue;

        const head = panel.querySelector<HTMLElement>(".panel-head");
        const body = panel.querySelector<HTMLElement>(".panel-body");
        if (!head || !body) continue;

        panel.dataset.v45234Optional = "1";
        panel.classList.add("v45234-optional-panel");

        const button = document.createElement("button");
        button.type = "button";
        button.className = "v45234-optional-toggle";
        button.innerHTML = `
          <span>
            <b>Opcional</b>
            <small>${helper}</small>
          </span>
          <span data-state>Abrir</span>
        `;

        const icon = document.createElement("span");
        icon.className = "v45234-optional-toggle-icon";
        head.append(button);
        button.append(icon);

        const sync = () => {
          const open = panel.classList.contains("is-open");
          const state = button.querySelector<HTMLElement>("[data-state]");
          if (state) state.textContent = open ? "Fechar" : "Abrir";
          button.setAttribute("aria-expanded", open ? "true" : "false");
        };

        const onClick = () => {
          panel.classList.toggle("is-open");
          sync();
        };

        button.addEventListener("click", onClick);
        sync();

        cleanups.push(() => {
          button.removeEventListener("click", onClick);
          button.remove();
          panel.classList.remove(
            "v45234-optional-panel",
            "is-open",
          );
          delete panel.dataset.v45234Optional;
        });
      }
    }

    enhance();

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pathname]);

  return null;
}