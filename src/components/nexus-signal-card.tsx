"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellOff,
  Check,
  CircleAlert,
  Clock3,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
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
  const [loading, setLoading] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  async function update(action: "snooze" | "resolve" | "dismiss") {
    setLoading(action);

    try {
      const response = await fetch(`/api/nexus/signals/${signal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          days: action === "snooze" ? 3 : undefined,
        }),
      });

      if (!response.ok) return;

      setHidden(true);
      onChanged?.(signal.id, action);
    } finally {
      setLoading(null);
    }
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

      <div className="nexus-signal-actions">
        {signal.actionHref && (
          <Link className="button gold compact-button" href={signal.actionHref}>
            {signal.actionLabel ?? "Abrir"}
            <ArrowRight size={13} />
          </Link>
        )}

        <button
          type="button"
          className="button ghost compact-button"
          disabled={Boolean(loading)}
          title="Tira da fila por 3 dias. Útil quando você já tratou o assunto fora do sistema."
          onClick={() => void update("snooze")}
        >
          <Check size={13} />
          {loading === "snooze" ? "Salvando" : "Já tratei"}
        </button>

        {!compact && (
          <button
            type="button"
            className="nexus-signal-dismiss"
            disabled={Boolean(loading)}
            title="Ignorar este tipo de ocorrência específica."
            onClick={() => void update("dismiss")}
          >
            <BellOff size={12} />
            Ignorar
          </button>
        )}
      </div>
    </article>
  );
}
