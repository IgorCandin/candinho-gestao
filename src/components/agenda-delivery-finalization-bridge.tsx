"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isAutomaticSaleDeliveryDialog(dialog: HTMLElement) {
  const category =
    dialog
      .querySelector<HTMLElement>(".agenda-category-label")
      ?.textContent?.trim() ?? "";

  const title =
    dialog.querySelector<HTMLElement>(".modal-head h2")
      ?.textContent?.trim() ?? "";

  const recordLink =
    dialog.querySelector<HTMLAnchorElement>(
      'a[href*="/vendas/"]',
    );

  const href = recordLink?.getAttribute("href") ?? "";

  return (
    category === "Entrega" &&
    /^Entrega\s*·/i.test(title) &&
    /\/(?:suplementos\/)?vendas\/[0-9a-f-]{36}(?:$|\?)/i.test(href)
  );
}

export function AgendaDeliveryFinalizationBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname !== "/agenda" &&
      pathname !== "/suplementos/agenda"
    ) {
      return;
    }

    function onClickCapture(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;

      const label = button.textContent?.trim() ?? "";
      if (!/^Concluir$/i.test(label)) return;

      const dialog = button.closest<HTMLElement>(
        ".agenda-event-dialog",
      );
      if (!dialog || !isAutomaticSaleDeliveryDialog(dialog)) return;

      const recordLink =
        dialog.querySelector<HTMLAnchorElement>(
          'a[href*="/vendas/"]',
        );
      const href = recordLink?.getAttribute("href");
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const url = new URL(href, window.location.origin);
      url.searchParams.set("finalizar-entrega", "1");

      window.location.assign(url.toString());
    }

    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.removeEventListener(
        "click",
        onClickCapture,
        true,
      );
    };
  }, [pathname]);

  return null;
}
