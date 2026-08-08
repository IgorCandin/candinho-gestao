"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type Intent = "quote" | "confirmed";

function activeIntent(): Intent | null {
  const active = document.querySelector<HTMLButtonElement>(
    ".v4510-intent-options button[data-intent].active",
  );

  if (active?.dataset.intent === "confirmed") return "confirmed";
  if (active?.dataset.intent === "quote") return "quote";
  return null;
}

export function BudgetSaveDedupUX() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/vendas/nova") return;

    let pendingIntent: Intent | null = null;
    let frame = 0;

    function onSubmit(event: Event) {
      const form = event.target;

      if (
        !(form instanceof HTMLFormElement) ||
        !form.classList.contains("new-sale-layout")
      ) {
        return;
      }

      // Orçamento novo já recebeu a decisão na própria página.
      // Em orçamento salvo/revisão não há seletor, então o modal
      // nativo continua funcionando como fallback.
      pendingIntent = activeIntent();
    }

    function executeSelectedChoice() {
      if (!pendingIntent) return;

      const modal =
        document.querySelector<HTMLElement>(".budget-choice-modal");

      if (!modal || modal.dataset.v45132AutoChoice === "1") return;

      const target = modal.querySelector<HTMLButtonElement>(
        pendingIntent === "confirmed"
          ? ".budget-choice-card.confirmed"
          : ".budget-choice-card.quote",
      );

      if (!target || target.disabled) return;

      modal.dataset.v45132AutoChoice = "1";

      const backdrop =
        modal.closest<HTMLElement>(".budget-choice-backdrop");

      backdrop?.classList.add("v45132-skip-choice-modal");

      const intentToExecute = pendingIntent;
      pendingIntent = null;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!target.isConnected || target.disabled) {
          pendingIntent = intentToExecute;
          backdrop?.classList.remove("v45132-skip-choice-modal");
          return;
        }

        target.click();
      });
    }

    document.addEventListener("submit", onSubmit, true);

    const observer = new MutationObserver(executeSelectedChoice);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [pathname]);

  return (
    <style>{`
      .v45132-skip-choice-modal {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `}</style>
  );
}
