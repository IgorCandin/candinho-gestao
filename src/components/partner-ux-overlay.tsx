"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Gift,
  PencilLine,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Summary = {
  partner_id: string;
  completion: {
    pct: number;
    completed_fields: number;
    total_fields: number;
    missing_count: number;
    missing_fields: Array<{
      key: string;
      label: string;
    }>;
  };
  reward: {
    enabled: boolean;
    total_sales: number;
    target_interval: number;
    covered_sales: number;
    next_reward_at: number;
    sales_to_next: number;
    due_units: number;
    available: boolean;
    progress_pct: number;
  };
};

function partnerIdFromPath(pathname: string) {
  const match = pathname.match(
    /^\/parceiros\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i,
  );

  return match?.[1] ?? null;
}

export function PartnerUxOverlay({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();
  const partnerId = useMemo(
    () => partnerIdFromPath(pathname),
    [pathname],
  );

  const [summary, setSummary] = useState<Summary | null>(null);
  const [completionHost, setCompletionHost] =
    useState<HTMLElement | null>(null);
  const [rewardHost, setRewardHost] =
    useState<HTMLElement | null>(null);

  const completionRef = useRef<HTMLElement | null>(null);
  const rewardRef = useRef<HTMLElement | null>(null);
  const originalRewardButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !partnerId) return;

    try {
      const response = await fetch(
        `/api/parceiros/${partnerId}/ux-summary`,
        { cache: "no-store" },
      );

      if (!response.ok) return;

      const payload = (await response.json()) as Summary;
      setSummary(payload);
    } catch {
      // UX auxiliar: a ficha do parceiro continua funcional sem esse resumo.
    }
  }, [enabled, partnerId]);

  useEffect(() => {
    if (!enabled || !partnerId) {
      setSummary(null);
      return;
    }

    void load();
  }, [enabled, load, partnerId]);

  useEffect(() => {
    if (!enabled || !partnerId) return;

    let frame = 0;
    let disposed = false;

    function attach() {
      frame = 0;
      if (disposed) return;

      const side = document.querySelector<HTMLElement>(
        ".partner-detail-side",
      );

      let completionSlot =
        document.querySelector<HTMLElement>(
          '[data-partner-completion-slot="true"]',
        ) ?? null;

      if (side && !completionSlot) {
        completionSlot = document.createElement("div");
        completionSlot.dataset.partnerCompletionSlot = "true";
        side.prepend(completionSlot);
      }

      if (
        completionSlot &&
        completionSlot !== completionRef.current
      ) {
        completionRef.current = completionSlot;
        setCompletionHost(completionSlot);
      }

      const rewardPanel =
        document.querySelector<HTMLElement>(
          ".partner-settlement-panel",
        );

      const head =
        rewardPanel?.querySelector<HTMLElement>(".panel-head") ??
        null;

      const original =
        head?.querySelector<HTMLButtonElement>(
          ":scope > button.button.gold",
        ) ?? null;

      if (original && head) {
        if (
          originalRewardButtonRef.current &&
          originalRewardButtonRef.current !== original
        ) {
          originalRewardButtonRef.current.style.display = "";
        }

        originalRewardButtonRef.current = original;

        let rewardSlot =
          head.querySelector<HTMLElement>(
            '[data-partner-reward-ux-slot="true"]',
          ) ?? null;

        if (!rewardSlot) {
          rewardSlot = document.createElement("div");
          rewardSlot.dataset.partnerRewardUxSlot = "true";
          head.appendChild(rewardSlot);
        }

        if (rewardSlot !== rewardRef.current) {
          rewardRef.current = rewardSlot;
          setRewardHost(rewardSlot);
        }
      }

      const success =
        rewardPanel?.querySelector<HTMLElement>(
          ".sale-action-message",
        )?.textContent ?? "";

      if (
        success.includes("Recompensa entregue") &&
        rewardPanel?.dataset.rewardUxReloaded !== success
      ) {
        if (rewardPanel) {
          rewardPanel.dataset.rewardUxReloaded = success;
        }

        window.setTimeout(() => void load(), 250);
      }
    }

    function scheduleAttach() {
      if (frame) return;
      frame = window.requestAnimationFrame(attach);
    }

    attach();

    const observer = new MutationObserver(scheduleAttach);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      disposed = true;
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (originalRewardButtonRef.current) {
        originalRewardButtonRef.current.style.display = "";
      }

      completionRef.current?.remove();
      rewardRef.current?.remove();

      completionRef.current = null;
      rewardRef.current = null;
      originalRewardButtonRef.current = null;

      setCompletionHost(null);
      setRewardHost(null);
    };
  }, [enabled, load, partnerId]);

  useEffect(() => {
    const original = originalRewardButtonRef.current;

    if (!original) return;

    if (summary?.reward.enabled && rewardHost) {
      original.style.display = "none";
    } else {
      original.style.display = "";
    }

    return () => {
      original.style.display = "";
    };
  }, [rewardHost, summary]);

  useEffect(() => {
    if (!summary?.reward.enabled) return;

    let frame = 0;
    const reward = summary.reward;

    function patchRewardReadout() {
      frame = 0;

      const statCards = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".partner-detail-stats .stat-card",
        ),
      );

      const rewardCard = statCards.find((card) => {
        const label =
          card.querySelector<HTMLElement>(
            ".stat-head > span:first-child",
          )?.textContent ?? "";

        return label.includes("Próxima recompensa");
      });

      if (rewardCard) {
        const value =
          rewardCard.querySelector<HTMLElement>(".stat-value");
        const note =
          rewardCard.querySelector<HTMLElement>(".stat-note");

        const expectedValue = reward.available
          ? "Meta alcançada"
          : `${reward.sales_to_next} venda(s)`;

        const expectedNote =
          `Meta em ${reward.next_reward_at} vendas`;

        if (value && value.textContent !== expectedValue) {
          value.textContent = expectedValue;
        }

        if (note && note.textContent !== expectedNote) {
          note.textContent = expectedNote;
        }

        rewardCard.setAttribute(
          "aria-label",
          `Próxima recompensa: ${expectedValue}. ${expectedNote}`,
        );
      }

      const progressPanel =
        document.querySelector<HTMLElement>(
          ".partner-progress-panel",
        );

      const progressBoxes = progressPanel
        ? Array.from(
            progressPanel.querySelectorAll<HTMLElement>(
              ".partner-progress-large > div",
            ),
          )
        : [];

      const secondBox = progressBoxes[1] ?? null;

      if (secondBox) {
        const strong =
          secondBox.querySelector<HTMLElement>("strong");
        const caption =
          secondBox.querySelector<HTMLElement>("span");

        const expectedStrong = reward.available
          ? "Meta alcançada"
          : `${reward.total_sales} / ${reward.next_reward_at}`;

        const expectedCaption = reward.available
          ? `recompensa disponível na meta ${reward.next_reward_at}`
          : `faltam ${reward.sales_to_next} venda(s) para a meta ${reward.next_reward_at}`;

        if (strong && strong.textContent !== expectedStrong) {
          strong.textContent = expectedStrong;
        }

        if (caption && caption.textContent !== expectedCaption) {
          caption.textContent = expectedCaption;
        }
      }

      const track =
        progressPanel?.querySelector<HTMLElement>(
          ".partner-progress-track.large > span",
        ) ?? null;

      if (track) {
        const width = `${Math.max(
          0,
          Math.min(100, reward.progress_pct),
        )}%`;

        if (track.style.width !== width) {
          track.style.width = width;
        }
      }
    }

    function schedulePatch() {
      if (frame) return;
      frame = window.requestAnimationFrame(
        patchRewardReadout,
      );
    }

    patchRewardReadout();

    const observer = new MutationObserver(schedulePatch);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [summary]);

  if (!partnerId || !enabled) return null;

  const completionPortal =
    completionHost && summary
      ? createPortal(
          <article className="panel partner-registration-completion">
            <div className="panel-head">
              <div>
                <h2>Pendências do cadastro</h2>
                <p>
                  O que falta para essa parceria ficar 100% documentada.
                </p>
              </div>

              <span
                className={`partner-completion-score ${
                  summary.completion.pct === 100 ? "complete" : ""
                }`}
              >
                {summary.completion.pct}%
              </span>
            </div>

            <div className="panel-body">
              <div
                className={`partner-completion-track ${
                  summary.completion.pct === 100 ? "complete" : ""
                }`}
                aria-label={`Cadastro ${summary.completion.pct}% completo`}
              >
                <span
                  style={{
                    width: `${summary.completion.pct}%`,
                  }}
                />
              </div>

              <div className="partner-completion-meta">
                <span>
                  {summary.completion.completed_fields} de{" "}
                  {summary.completion.total_fields} campos completos
                </span>
                <span>
                  {summary.completion.missing_count === 0
                    ? "Sem pendências"
                    : `${summary.completion.missing_count} pendência(s)`}
                </span>
              </div>

              {summary.completion.missing_fields.length > 0 ? (
                <div className="partner-completion-missing">
                  <strong>Falta para 100%</strong>
                  <div className="partner-completion-chips">
                    {summary.completion.missing_fields.map((field) => (
                      <span
                        className="partner-completion-chip"
                        key={field.key}
                      >
                        {field.label}
                      </span>
                    ))}
                  </div>

                  <div
                    className="panel-actions"
                    style={{ marginTop: 11 }}
                  >
                    <Link
                      className="button ghost compact-button"
                      href={`/parceiros/${partnerId}/editar`}
                    >
                      <PencilLine size={14} />
                      Completar cadastro
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="partner-completion-ok">
                  <BadgeCheck size={17} />
                  Cadastro operacional completo.
                </div>
              )}
            </div>
          </article>,
          completionHost,
        )
      : null;

  const originalRewardButton =
    originalRewardButtonRef.current;

  const rewardPortal =
    rewardHost &&
    summary?.reward.enabled &&
    originalRewardButton
      ? createPortal(
          <div className="partner-reward-action-ux">
            <button
              className="button gold compact-button"
              type="button"
              onClick={() => originalRewardButton.click()}
            >
              {summary.reward.available ? (
                <Gift size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {summary.reward.available
                ? "Entregar recompensa"
                : "Registrar antecipada"}
            </button>

            <small>
              {summary.reward.available
                ? summary.reward.due_units > 1
                  ? `${summary.reward.due_units} recompensas estão pendentes.`
                  : `Meta ${summary.reward.next_reward_at} alcançada.`
                : `Próxima meta ${summary.reward.next_reward_at} · faltam ${summary.reward.sales_to_next} venda(s).`}
            </small>
          </div>,
          rewardHost,
        )
      : null;

  return (
    <>
      {completionPortal}
      {rewardPortal}
    </>
  );
}
