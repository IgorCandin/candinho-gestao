"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BankMonthFocusUX } from "@/components/bank-month-focus-ux";

export function ErpHierarchyUX() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/suplementos/painel") return;

    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panel = document.querySelector<HTMLElement>(
          ".dashboard-priorities-panel",
        );
        if (!panel) return;

        const title = panel.querySelector<HTMLElement>(".panel-head h2");
        const description = panel.querySelector<HTMLElement>(".panel-head p");

        const nextTitle = "Exceções de gestão";
        const nextDescription =
          "Riscos e pendências para supervisão. Para executar o dia, use Hoje; para a fila completa, use Fila Única.";

        if (title && title.textContent !== nextTitle) {
          title.textContent = nextTitle;
        }
        if (description && description.textContent !== nextDescription) {
          description.textContent = nextDescription;
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return <BankMonthFocusUX />;
}
