"use client";

import { CalendarClock, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type PortalTarget = {
  key: string;
  commitmentKey: string;
  mount: HTMLElement;
};

function isOverduePanel(element: Element) {
  const panel = element.closest("article.panel");
  if (!panel) return false;
  const heading = panel.querySelector(".panel-head h2");
  return heading?.textContent?.trim() === "Atrasados";
}

export function BankOverduePostponeBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [targets, setTargets] = useState<PortalTarget[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/bank") {
      setTargets([]);
      return;
    }

    let frame = 0;

    function scan() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next: PortalTarget[] = [];
        const inputs = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            'input[name="commitment_key"][value^="weekly_subscription:"]',
          ),
        );

        for (const input of inputs) {
          if (!isOverduePanel(input)) continue;

          const actions = input.closest(".bank-header-actions");
          if (!(actions instanceof HTMLElement)) continue;

          const commitmentKey = input.value.trim();
          if (!commitmentKey) continue;

          let mount = actions.querySelector<HTMLElement>(
            `[data-bank-postpone-key="${CSS.escape(commitmentKey)}"]`,
          );

          if (!mount) {
            mount = document.createElement("span");
            mount.dataset.bankPostponeKey = commitmentKey;
            mount.style.display = "contents";
            actions.appendChild(mount);
          }

          next.push({
            key: commitmentKey,
            commitmentKey,
            mount,
          });
        }

        setTargets(next);
      });
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      document
        .querySelectorAll<HTMLElement>("[data-bank-postpone-key]")
        .forEach((mount) => mount.remove());
    };
  }, [pathname]);

  async function postpone(commitmentKey: string) {
    if (savingKey) return;

    const [kind, subscriptionId, occurrenceOn] = commitmentKey.split(":");
    if (
      kind !== "weekly_subscription" ||
      !subscriptionId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceOn ?? "")
    ) {
      setMessage("Não foi possível identificar esta consulta semanal.");
      return;
    }

    setSavingKey(commitmentKey);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "bank_resolve_weekly_subscription_occurrence",
        {
          p_subscription_id: subscriptionId,
          p_occurrence_on: occurrenceOn,
          p_resolution: "skipped",
          p_notes:
            "Consulta adiada pela Home do Candinho Bank. A próxima semana permanece aberta normalmente.",
        },
      );

      if (error) throw error;

      setMessage(
        "Consulta adiada. Esta semana saiu dos atrasados e a próxima continua aberta.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível adiar a consulta.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      {targets.map((target) =>
        createPortal(
          <button
            key={target.key}
            className="button ghost compact-button"
            type="button"
            disabled={savingKey === target.commitmentKey}
            onClick={() => void postpone(target.commitmentKey)}
          >
            {savingKey === target.commitmentKey ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <CalendarClock size={14} />
            )}
            Adiar
          </button>,
          target.mount,
        ),
      )}

      {message && pathname === "/bank" && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 92,
            transform: "translateX(-50%)",
            zIndex: 10020,
            width: "min(92vw, 520px)",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(10,14,21,.96)",
            boxShadow: "0 20px 50px rgba(0,0,0,.4)",
            color: "#f4f6fb",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
      )}
    </>
  );
}
