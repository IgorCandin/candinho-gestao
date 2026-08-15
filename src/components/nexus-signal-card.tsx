"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellOff,
  CircleAlert,
  Clock3,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { NexusActionPreviewButton } from "@/components/nexus-action-preview-button";
import type { NexusSignal } from "@/lib/nexus-operating-types";

function iconFor(signal: NexusSignal) {
  if (signal.severity === "urgent") return CircleAlert;
  if (signal.severity === "opportunity") return Lightbulb;
  if (signal.severity === "attention") return Clock3;
  return Sparkles;
}

function labelFor(signal: NexusSignal) {
  if (signal.severity === "urgent") return "Urgente";
  if (signal.severity === "opportunity") return "Oportunidade";
  if (signal.severity === "attention") return "Atenção";
  return "Nexus";
}

function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function priorityFor(signal: NexusSignal) {
  if (signal.severity === "urgent") return "urgent";
  if (signal.severity === "attention") return "attention";
  return "normal";
}

export function NexusSignalCard({
  signal,
  compact = false,
  onChanged,
}: {
  signal: NexusSignal;
  compact?: boolean;
  onChanged?: (id: string, action: string) => void;
}) {
  const Icon = iconFor(signal);
  const [hidden, setHidden] = useState(false);

  function changed(action: string) {
    setHidden(true);
    onChanged?.(signal.id, action);
  }

  if (hidden) return null;

  return (
    <article
      className={`nexus-signal-card severity-${signal.severity} ${
        compact ? "compact" : ""
      }`}
    >
      <div className="nexus-signal-icon">
        <Icon size={compact ? 16 : 18} />
      </div>

      <div className="nexus-signal-copy">
        <div className="nexus-signal-topline">
          <span>{labelFor(signal)}</span>
          <small>score {Math.round(signal.score)}</small>
        </div>
        <strong>{signal.title}</strong>
        {signal.summary && <p>{signal.summary}</p>}
        {!compact && signal.recommendedAction && (
          <small className="nexus-signal-reason">
            {signal.recommendedAction}
          </small>
        )}
      </div>

      <div className="nexus-signal-actions nexus-signal-actions-v453">
        {signal.actionHref && (
          <Link className="button gold compact-button" href={signal.actionHref}>
            {signal.actionLabel ?? "Abrir"}
            <ArrowRight size={13} />
          </Link>
        )}

        {!compact && signal.customerId && (
          <NexusActionPreviewButton
            actionKind="schedule_customer_followup"
            payload={{
              customer_id: signal.customerId,
              due_at: tomorrowAtTen(),
              priority: priorityFor(signal),
              notes: `[Nexus] ${signal.title}`,
            }}
            label="Retorno amanhã"
            component="nexus_signal"
          />
        )}

        <NexusActionPreviewButton
          actionKind="signal_status"
          payload={{
            signal_id: signal.id,
            action: "snooze",
            snooze_days: 3,
          }}
          label="3 dias"
          component="nexus_signal"
          onExecuted={() => changed("snooze")}
        />

        {!compact && (
          <NexusActionPreviewButton
            actionKind="signal_status"
            payload={{
              signal_id: signal.id,
              action: "dismiss",
              snooze_days: 3,
            }}
            label="Ignorar"
            component="nexus_signal"
            onExecuted={() => changed("dismiss")}
          />
        )}
      </div>
    </article>
  );
}
