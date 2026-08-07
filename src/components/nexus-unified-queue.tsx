"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleAlert,
  Dumbbell,
  Landmark,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NexusActionPreviewButton } from "@/components/nexus-action-preview-button";
import type {
  NexusUnifiedQueueItem,
  NexusUnifiedQueueSnapshot,
} from "@/lib/nexus-unified-types";

const OPERATIONS = [
  { key: "all", label: "Tudo" },
  { key: "supplements", label: "Suplementos" },
  { key: "fitness", label: "Fitness" },
  { key: "bank", label: "Bank" },
  { key: "company", label: "Central" },
  { key: "marketing", label: "Marketing" },
] as const;

const SEVERITIES = [
  { key: "all", label: "Todas" },
  { key: "urgent", label: "Urgente" },
  { key: "attention", label: "Atenção" },
  { key: "opportunity", label: "Oportunidade" },
  { key: "info", label: "Info" },
] as const;

function iconFor(operation: string) {
  if (operation === "fitness") return Dumbbell;
  if (operation === "bank") return Landmark;
  if (operation === "company" || operation === "marketing") return Building2;
  return Sparkles;
}

function dueLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function severityLabel(value: string) {
  if (value === "urgent") return "Urgente";
  if (value === "attention") return "Atenção";
  if (value === "opportunity") return "Oportunidade";
  return "Info";
}

function visibleSummary(item: NexusUnifiedQueueItem) {
  const summary = item.summary?.trim();
  if (!summary) return null;

  if (item.source_type !== "bank_invoice") {
    return summary;
  }

  // Algumas faturas não possuem valor consolidado no momento em que entram
  // na fila. "R$ 0,00" nesse caso é ruído visual, não informação financeira.
  const withoutZeroAmount = summary
    .replace(
      /^R\$\s*0(?:[.,]00)?\s*(?:[·•|—–-]\s*)?/i,
      "",
    )
    .trim();

  return withoutZeroAmount || null;
}

function QueueRow({
  item,
  onSignalChanged,
}: {
  item: NexusUnifiedQueueItem;
  onSignalChanged: (queueId: string) => void;
}) {
  const Icon = iconFor(item.operation_scope);
  const summary = visibleSummary(item);

  return (
    <article className={`nexus-unified-row-v454 severity-${item.severity}`}>
      <span className={`nexus-operation-orb-v454 op-${item.operation_scope}`}>
        <Icon size={15} />
      </span>

      <div className="nexus-unified-copy-v454">
        <div>
          <span className={`nexus-queue-severity-v454 ${item.severity}`}>
            {severityLabel(item.severity)}
          </span>
          <small>{item.operation_label}</small>
        </div>

        <strong>{item.title}</strong>
        {summary && <p>{summary}</p>}
        {item.due_at && <small>Prazo: {dueLabel(item.due_at)}</small>}
      </div>

      <div className="nexus-unified-actions-v454">
        <Link className="button gold compact-button" href={item.href}>
          Abrir <ArrowRight size={13} />
        </Link>

        {item.source_type === "nexus_signal" && (
          <>
            <NexusActionPreviewButton
              actionKind="signal_status"
              payload={{
                signal_id: item.source_id,
                action: "resolve",
                snooze_days: 3,
              }}
              label="Concluir"
              component="unified_queue"
              onExecuted={() => onSignalChanged(item.queue_id)}
            />
            <NexusActionPreviewButton
              actionKind="signal_status"
              payload={{
                signal_id: item.source_id,
                action: "snooze",
                snooze_days: 3,
              }}
              label="3 dias"
              component="unified_queue"
              onExecuted={() => onSignalChanged(item.queue_id)}
            />
          </>
        )}
      </div>
    </article>
  );
}

export function NexusUnifiedQueue({
  initialSnapshot,
}: {
  initialSnapshot: NexusUnifiedQueueSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [operation, setOperation] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      snapshot.items.filter(
        (item) =>
          (operation === "all" || item.operation_scope === operation) &&
          (severity === "all" || item.severity === severity),
      ),
    [operation, severity, snapshot.items],
  );

  const focus = visible[0] ?? null;
  const focusSummary = focus ? visibleSummary(focus) : null;

  async function refresh() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/nexus/unified?limit=120", {
        cache: "no-store",
      });
      const payload = (await response.json()) as NexusUnifiedQueueSnapshot & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível atualizar a fila.");
      }

      setSnapshot(payload);
      setMessage("Fila atualizada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a fila.",
      );
    } finally {
      setLoading(false);
    }
  }

  function removeSignal(queueId: string) {
    setSnapshot((current) => ({
      ...current,
      items: current.items.filter((item) => item.queue_id !== queueId),
      summary: {
        ...current.summary,
        total: Math.max(0, current.summary.total - 1),
      },
    }));
  }

  return (
    <section className="nexus-unified-v454">
      <div className="nexus-unified-stats-v454">
        <article>
          <Bot size={17} />
          <span>Fila total</span>
          <strong>{snapshot.summary.total}</strong>
          <small>fontes oficiais cruzadas</small>
        </article>
        <article className="urgent">
          <CircleAlert size={17} />
          <span>Urgentes</span>
          <strong>{snapshot.summary.urgent}</strong>
          <small>vencido ou prioridade máxima</small>
        </article>
        <article>
          <Sparkles size={17} />
          <span>Atenções</span>
          <strong>{snapshot.summary.attention}</strong>
          <small>vale resolver em seguida</small>
        </article>
        <article>
          <CheckCircle2 size={17} />
          <span>Operações</span>
          <strong>{Object.keys(snapshot.summary.by_operation).length}</strong>
          <small>com item acionável</small>
        </article>
      </div>

      {focus && (
        <article className={`nexus-focus-now-v454 severity-${focus.severity}`}>
          <div>
            <span className="eyebrow">Nexus · Faça primeiro</span>
            <h2>{focus.title}</h2>
            {focusSummary && <p>{focusSummary}</p>}
            <small>
              {focus.operation_label}
              {focus.due_at ? ` · ${dueLabel(focus.due_at)}` : ""}
            </small>
          </div>
          <Link className="button gold" href={focus.href}>
            Resolver agora <ArrowRight size={14} />
          </Link>
        </article>
      )}

      <div className="nexus-unified-toolbar-v454">
        <div>
          {OPERATIONS.map((item) => (
            <button
              type="button"
              className={operation === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setOperation(item.key)}
            >
              {item.label}
              {item.key !== "all" && (
                <small>{snapshot.summary.by_operation[item.key] ?? 0}</small>
              )}
            </button>
          ))}
        </div>

        <div>
          {SEVERITIES.map((item) => (
            <button
              type="button"
              className={severity === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setSeverity(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          className="button ghost compact-button"
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? (
            <LoaderCircle className="spin" size={13} />
          ) : (
            <RefreshCcw size={13} />
          )}
          {loading ? "Atualizando" : "Atualizar"}
        </button>
      </div>

      <div className="nexus-unified-list-v454">
        {visible.length ? (
          visible.map((item) => (
            <QueueRow
              item={item}
              key={item.queue_id}
              onSignalChanged={removeSignal}
            />
          ))
        ) : (
          <div className="empty compact">
            <CheckCircle2 size={26} />
            <strong>Nada neste filtro</strong>
            Troque a operação ou a prioridade.
          </div>
        )}
      </div>

      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
