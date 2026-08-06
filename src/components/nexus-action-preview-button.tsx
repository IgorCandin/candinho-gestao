"use client";

import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type {
  NexusActionKind,
  NexusExecutedAction,
  NexusPreparedAction,
} from "@/lib/nexus-daily-types";

export function NexusActionPreviewButton({
  actionKind,
  payload,
  label,
  tone = "ghost",
  compact = true,
  component = "nexus",
  onExecuted,
}: {
  actionKind: NexusActionKind;
  payload: Record<string, unknown>;
  label: string;
  tone?: "ghost" | "gold";
  compact?: boolean;
  component?: string;
  onExecuted?: (result: NexusExecutedAction) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [plan, setPlan] = useState<NexusPreparedAction | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon =
    actionKind === "schedule_customer_followup"
      ? CalendarPlus
      : actionKind === "signal_status" && payload.action === "snooze"
        ? Clock3
        : CheckCircle2;

  async function prepare() {
    if (preparing) return;

    setPreparing(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          action_kind: actionKind,
          payload,
          source_route: pathname,
        }),
      });

      const data = (await response.json()) as NexusPreparedAction & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível preparar a ação.");
      }

      setPlan(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível preparar a ação.",
      );
    } finally {
      setPreparing(false);
    }
  }

  async function execute() {
    if (!plan || executing) return;

    setExecuting(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execute",
          plan_id: plan.plan_id,
        }),
      });

      const data = (await response.json()) as NexusExecutedAction & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível executar a ação.");
      }

      setPlan(null);
      onExecuted?.(data);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível executar a ação.",
      );
    } finally {
      setExecuting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`button ${tone} ${compact ? "compact-button" : ""}`}
        data-nexus-action={`preview:${actionKind}`}
        data-nexus-component={component}
        disabled={preparing}
        onClick={() => void prepare()}
      >
        {preparing ? (
          <LoaderCircle className="spin" size={13} />
        ) : (
          <Icon size={13} />
        )}
        {preparing ? "Preparando" : label}
      </button>

      {error && !plan && <small className="nexus-action-inline-error">{error}</small>}

      {plan && (
        <div className="nexus-action-preview-backdrop" role="presentation">
          <section
            className="nexus-action-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar ação do Nexus"
          >
            <header>
              <span className="nexus-action-preview-icon">
                <ShieldCheck size={20} />
              </span>
              <div>
                <span className="eyebrow">Nexus · Preview obrigatório</span>
                <h3>{plan.preview.headline}</h3>
                {plan.preview.description && <p>{plan.preview.description}</p>}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar preview"
                onClick={() => setPlan(null)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="nexus-action-preview-changes">
              {plan.preview.changes.map((change) => (
                <div key={change}>
                  <Sparkles size={13} />
                  <span>{change}</span>
                </div>
              ))}
            </div>

            <div className="nexus-action-preview-safety">
              <ShieldCheck size={14} />
              <span>
                Nenhuma alteração foi feita ainda. Este preview expira em{" "}
                {plan.preview.expires_in_minutes} minutos.
              </span>
            </div>

            {error && <p className="form-message">{error}</p>}

            <footer>
              <button
                type="button"
                className="button ghost"
                disabled={executing}
                onClick={() => setPlan(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button gold"
                data-nexus-action={`execute:${actionKind}`}
                data-nexus-component={component}
                disabled={executing}
                onClick={() => void execute()}
              >
                {executing ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {executing ? "Executando..." : "Confirmar e executar"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
