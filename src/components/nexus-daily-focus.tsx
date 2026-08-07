"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  FastForward,
  LoaderCircle,
  Route,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NexusActionPreviewButton } from "@/components/nexus-action-preview-button";
import type { NexusDailySnapshot } from "@/lib/nexus-daily-types";
import { emptyNexusDailySnapshot } from "@/lib/nexus-daily-types";
import {
  nexusRouteHref,
  nexusRouteLabel,
  nexusWorkflowLabel,
} from "@/lib/nexus-route-labels";

function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function priorityFor(severity: string) {
  if (severity === "urgent") return "urgent";
  if (severity === "attention") return "attention";
  return "normal";
}

export function NexusDailyFocus() {
  const pathname = usePathname() || "/suplementos";
  const [snapshot, setSnapshot] = useState<NexusDailySnapshot>(
    emptyNexusDailySnapshot(pathname),
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/nexus/daily?route=${encodeURIComponent(pathname)}`,
        { cache: "no-store" },
      );

      if (!response.ok) return;
      setSnapshot((await response.json()) as NexusDailySnapshot);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    void load();
  }, [load]);

  const next = snapshot.next_action;
  const matchingWorkflow =
    snapshot.workflows.find(
      (item) =>
        item.repetitions >= 3 &&
        item.step1 === snapshot.route &&
        Boolean(nexusRouteHref(item.step3)),
    ) ?? null;
  const skipHref = matchingWorkflow
    ? nexusRouteHref(matchingWorkflow.step3)
    : null;

  return (
    <section className="nexus-daily-focus-v453">
      <header>
        <div>
          <span className="eyebrow">Nexus Daily · personalizado</span>
          <h3>
            <Bot size={18} /> Próxima ação
          </h3>
        </div>
        <div className="nexus-daily-header-links-v454">
          <Link href="/nexus/fila">
            Fila Única <ChevronRight size={13} />
          </Link>
          <Link href="/suplementos/nexus/habitos">
            Hábitos <ChevronRight size={13} />
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="nexus-daily-loading-v453">
          <LoaderCircle className="spin" size={16} /> Organizando sua rotina...
        </div>
      ) : next ? (
        <div className="nexus-daily-next-v453">
          <div className={`nexus-daily-severity-v453 ${next.severity}`}>
            {next.severity === "urgent"
              ? "Agora"
              : next.severity === "opportunity"
                ? "Oportunidade"
                : "Próximo"}
          </div>

          <div className="nexus-daily-next-copy-v453">
            <strong>{next.title}</strong>
            {next.summary && <span>{next.summary}</span>}
            {next.recommended_action && (
              <small>{next.recommended_action}</small>
            )}
          </div>

          <div className="nexus-daily-next-actions-v453">
            {next.action_href && (
              <Link
                className="button gold compact-button"
                href={next.action_href}
              >
                Abrir <ArrowRight size={13} />
              </Link>
            )}

            {next.customer_id && (
              <NexusActionPreviewButton
                actionKind="schedule_customer_followup"
                payload={{
                  customer_id: next.customer_id,
                  due_at: tomorrowAtTen(),
                  priority: priorityFor(next.severity),
                  notes: `[Nexus Daily] ${next.title}`,
                }}
                label="Retorno amanhã"
                component="nexus_daily"
                onExecuted={() => void load()}
              />
            )}

            <NexusActionPreviewButton
              actionKind="signal_status"
              payload={{
                signal_id: next.id,
                action: "snooze",
                snooze_days: 3,
              }}
              label="Adiar 3d"
              component="nexus_daily"
              onExecuted={() => void load()}
            />
          </div>
        </div>
      ) : (
        <div className="nexus-daily-clear-v453">
          <Sparkles size={17} />
          <span>
            <strong>Nada crítico agora.</strong>
            Use seus atalhos aprendidos ou revise a Fila Única.
          </span>
        </div>
      )}

      {snapshot.shortcuts.length > 0 && (
        <div className="nexus-context-shortcuts-v453">
          <span className="nexus-context-shortcuts-title-v453">
            <Route size={14} /> Você costuma ir daqui para:
          </span>
          <div>
            {snapshot.shortcuts.slice(0, 5).map((shortcut) => {
              const href = nexusRouteHref(shortcut.to_route);

              if (!href) {
                return (
                  <span
                    className="nexus-smart-chip-v453 disabled"
                    key={shortcut.to_route}
                  >
                    {nexusRouteLabel(shortcut.to_route)}
                    <small>{shortcut.transitions_30d}×</small>
                  </span>
                );
              }

              return (
                <Link
                  className="nexus-smart-chip-v453"
                  href={href}
                  key={shortcut.to_route}
                >
                  {nexusRouteLabel(shortcut.to_route)}
                  <small>{shortcut.transitions_30d}×</small>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {matchingWorkflow && skipHref && (
        <div className="nexus-workflow-hint-v453 nexus-workflow-skip-v454">
          <Sparkles size={13} />
          <span>
            Você repete{" "}
            <strong>
              {nexusWorkflowLabel([
                matchingWorkflow.step1,
                matchingWorkflow.step2,
                matchingWorkflow.step3,
              ])}
            </strong>{" "}
            · {matchingWorkflow.repetitions} vezes.
          </span>

          <Link className="button ghost compact-button" href={skipHref}>
            <FastForward size={12} />
            Ir direto para {nexusRouteLabel(matchingWorkflow.step3)}
          </Link>
        </div>
      )}
    </section>
  );
}
