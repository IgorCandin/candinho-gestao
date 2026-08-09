"use client";

import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

const FLOW_CLASS = "v4515-budget-flow";
const CONFIRM_CLASS = "v4515-confirm-flow-open";

function panelTitle(panel: HTMLElement) {
  return (
    panel.querySelector<HTMLElement>(".panel-head h2")
      ?.textContent?.trim() ?? ""
  );
}

function stageForTitle(title: string) {
  if (title === "Pagamento") return "payment";
  if (title === "Entrega") return "delivery";
  if (title === "Pós-venda") return "post-sale";
  if (title === "Parceria") return "partnership";
  return null;
}

function ensurePostSaleAutomaticNote(panel: HTMLElement) {
  panel.classList.add("v4510-postsale-native");

  const body = panel.querySelector<HTMLElement>(".panel-body");
  if (!body) return;

  if (body.querySelector(".v4510-postsale-auto-note")) return;

  const note = document.createElement("div");
  note.className = "v4510-postsale-auto-note";
  note.innerHTML = `
    <strong>Data automática</strong>
    <span>
      O pós-venda será calculado pela duração dos produtos.
      Depois você pode reagendar pela Agenda.
    </span>
  `;

  body.prepend(note);
}

function findContinueWithoutPdf() {
  const modal =
    document.querySelector<HTMLElement>(
      ".budget-pdf-prompt",
    );

  if (!modal) return null;

  return Array.from(
    modal.querySelectorAll<HTMLButtonElement>(
      "button.budget-choice-card",
    ),
  ).find((button) =>
    /continuar sem pdf/i.test(button.textContent ?? ""),
  ) ?? null;
}

export function BudgetConfirmedFlowUX() {
  const pathname = usePathname();
  const confirmedButtonRef =
    useRef<HTMLButtonElement | null>(null);
  const skipConfirmedPdfRef = useRef(false);
  const skipResetTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (pathname !== "/vendas/nova") return;

    document.body.classList.add(FLOW_CLASS);

    let frame = 0;

    function classify() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const side =
          document.querySelector<HTMLElement>(
            ".new-sale-side",
          );

        if (side) {
          side.dataset.v4515BudgetSide = "true";

          for (const panel of side.querySelectorAll<HTMLElement>(
            ":scope > article.panel",
          )) {
            const title = panelTitle(panel);
            const stage = stageForTitle(title);

            if (stage) {
              panel.dataset.v4515Stage = stage;
            }

            if (stage === "post-sale") {
              ensurePostSaleAutomaticNote(panel);
            }
          }
        }

        document
          .querySelectorAll<HTMLElement>(
            ".v458-budget-stage-note, .v4510-intent-card",
          )
          .forEach((element) => {
            element.dataset.v4515PrematureChoice = "true";
          });

        if (skipConfirmedPdfRef.current) {
          const continueButton = findContinueWithoutPdf();

          if (continueButton && !continueButton.disabled) {
            skipConfirmedPdfRef.current = false;

            if (skipResetTimerRef.current) {
              clearTimeout(skipResetTimerRef.current);
              skipResetTimerRef.current = null;
            }

            requestAnimationFrame(() => {
              continueButton.click();
            });
          }
        }
      });
    }

    function onClickCapture(event: MouseEvent) {
      const element = event.target;

      if (!(element instanceof Element)) return;

      const confirmed = element.closest<HTMLButtonElement>(
        ".budget-choice-modal:not(.budget-pdf-prompt) .budget-choice-card.confirmed",
      );

      if (!confirmed) return;

      if (confirmed.dataset.v4515Bypass === "true") {
        delete confirmed.dataset.v4515Bypass;
        return;
      }

      if (confirmed.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      confirmedButtonRef.current = confirmed;

      confirmed
        .closest<HTMLElement>(".budget-choice-backdrop")
        ?.classList.add("v4515-choice-suspended");

      document.body.classList.add(CONFIRM_CLASS);

      setCommitting(false);
      setOpen(true);
      classify();
    }

    classify();

    document.addEventListener(
      "click",
      onClickCapture,
      true,
    );

    const observer = new MutationObserver(classify);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      document.removeEventListener(
        "click",
        onClickCapture,
        true,
      );

      document.body.classList.remove(
        FLOW_CLASS,
        CONFIRM_CLASS,
      );

      document
        .querySelectorAll<HTMLElement>(
          ".v4515-choice-suspended",
        )
        .forEach((element) =>
          element.classList.remove(
            "v4515-choice-suspended",
          ),
        );

      if (skipResetTimerRef.current) {
        clearTimeout(skipResetTimerRef.current);
      }
    };
  }, [pathname]);

  function backToChoice() {
    if (committing) return;

    document.body.classList.remove(CONFIRM_CLASS);

    document
      .querySelectorAll<HTMLElement>(
        ".v4515-choice-suspended",
      )
      .forEach((element) =>
        element.classList.remove(
          "v4515-choice-suspended",
        ),
      );

    setOpen(false);
  }

  function confirmSale() {
    if (committing) return;

    const confirmed = confirmedButtonRef.current;
    if (!confirmed || !confirmed.isConnected) {
      backToChoice();
      return;
    }

    setCommitting(true);
    skipConfirmedPdfRef.current = true;

    if (skipResetTimerRef.current) {
      clearTimeout(skipResetTimerRef.current);
    }

    skipResetTimerRef.current = setTimeout(() => {
      skipConfirmedPdfRef.current = false;
      skipResetTimerRef.current = null;
    }, 15000);

    confirmed.dataset.v4515Bypass = "true";

    document.body.classList.remove(CONFIRM_CLASS);
    setOpen(false);

    requestAnimationFrame(() => {
      confirmed.click();
    });
  }

  if (pathname !== "/vendas/nova" || !open) {
    return null;
  }

  return (
    <div
      className="v4515-confirm-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="v4515-confirm-title"
    >
      <button
        type="button"
        className="v4515-confirm-backdrop"
        aria-label="Voltar"
        onClick={backToChoice}
        disabled={committing}
      />

      <header className="v4515-confirm-header">
        <div>
          <span>ORÇAMENTO CONFIRMADO</span>
          <strong id="v4515-confirm-title">
            Finalize a venda
          </strong>
          <small>
            Agora informe somente o que muda quando o
            cliente realmente fechou.
          </small>
        </div>

        <button
          type="button"
          className="icon-button"
          aria-label="Fechar"
          disabled={committing}
          onClick={backToChoice}
        >
          <X size={18} />
        </button>
      </header>

      <footer className="v4515-confirm-footer">
        <button
          type="button"
          className="button ghost"
          disabled={committing}
          onClick={backToChoice}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <button
          type="button"
          className="button gold"
          disabled={committing}
          onClick={confirmSale}
        >
          {committing ? (
            <LoaderCircle
              className="spin"
              size={17}
            />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {committing
            ? "Confirmando"
            : "Confirmar venda"}
        </button>
      </footer>
    </div>
  );
}
