"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Monitor,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { UxIssueRow } from "@/components/ux-issue-report-list";
import { UxIssueReportList } from "@/components/ux-issue-report-list";
import type {
  NexusUxAutoSignal,
  NexusUxDoctorSnapshot,
} from "@/lib/nexus-ux-doctor-types";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

const SIGNAL_LABELS: Record<string, string> = {
  horizontal_overflow: "Overflow horizontal",
  fixed_clip: "Elemento fixo cortado",
  client_error: "Erro no cliente",
};

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function healthLabel(score: number) {
  if (score >= 90) return "Saudável";
  if (score >= 75) return "Atenção leve";
  if (score >= 55) return "Precisa de revisão";
  return "Prioridade de UX";
}

function signalDescription(signal: NexusUxAutoSignal) {
  if (signal.signal_type === "horizontal_overflow") {
    return `A página ficou ${signal.overflow_px ?? "?"} px maior que a área visível.`;
  }

  if (signal.signal_type === "fixed_clip") {
    const element =
      typeof signal.payload?.element === "string"
        ? signal.payload.element
        : "elemento fixo";
    return `${element} ultrapassou a área visível em ${signal.overflow_px ?? "?"} px.`;
  }

  const message =
    typeof signal.payload?.message === "string"
      ? signal.payload.message
      : "Erro JavaScript sem mensagem.";
  return message;
}

export function NexusUxDoctorWorkspace({
  initialSnapshot,
  manualRows,
}: {
  initialSnapshot: NexusUxDoctorSnapshot;
  manualRows: UxIssueRow[];
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const topSignals = useMemo(
    () => snapshot.auto_signals.slice(0, 12),
    [snapshot.auto_signals],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/nexus/ux-health", {
        cache: "no-store",
      });
      if (response.ok) {
        setSnapshot((await response.json()) as NexusUxDoctorSnapshot);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function copyDiagnostic() {
    const text = [
      "# Nexus UX Doctor",
      "",
      `Saúde: ${snapshot.health_score}/100 · ${healthLabel(snapshot.health_score)}`,
      `Relatos manuais pendentes: ${snapshot.manual_pending}`,
      `Manuais de alta prioridade: ${snapshot.manual_high}`,
      `Sinais automáticos ativos: ${snapshot.auto_active}`,
      `Sinais automáticos de alta prioridade: ${snapshot.auto_high}`,
      `Sinais repetidos: ${snapshot.repeated_signals}`,
      "",
      "## Rotas com mais atrito",
      ...snapshot.top_routes.map(
        (item, index) =>
          `${index + 1}. ${item.route} · ${item.issue_count} sinal(is) · ${item.high_count} alto(s)`,
      ),
      "",
      "## Sinais automáticos recentes",
      ...snapshot.auto_signals.slice(0, 20).flatMap((signal, index) => [
        `${index + 1}. [${SIGNAL_LABELS[signal.signal_type] ?? signal.signal_type}] ${signal.route}`,
        `   ${signalDescription(signal)}`,
        `   ${signal.viewport_class} ${signal.viewport_width ?? "?"}x${signal.viewport_height ?? "?"} · ${signal.occurrence_count} ocorrência(s)`,
        `   Último: ${dateTime(signal.last_seen_at)}`,
      ]),
      "",
      "## Relatos manuais pendentes",
      ...manualRows
        .filter((row) => row.is_pending)
        .slice(0, 30)
        .flatMap((row, index) => [
          `${index + 1}. [${row.category_label}] ${row.route ?? "Rota não identificada"}`,
          `   ${row.description}`,
          `   Prioridade: ${row.severity} · Status: ${row.status}`,
        ]),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="nexus-ux-doctor-v457">
      <div className="nexus-ux-doctor-hero-v457">
        <div>
          <span className="eyebrow">Nexus · Qualidade</span>
          <h1>UX Doctor</h1>
          <p>
            Junta o que você relata manualmente com sinais técnicos capturados
            durante o uso. O objetivo é achar atrito sem você precisar parar
            para documentar cada detalhe.
          </p>
        </div>

        <div className="nexus-ux-doctor-hero-actions-v457">
          <button
            className="button ghost compact-button"
            type="button"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCcw className={refreshing ? "spin" : ""} size={13} />
            Atualizar
          </button>

          <button
            className="button gold compact-button"
            type="button"
            onClick={() => void copyDiagnostic()}
          >
            <Clipboard size={13} />
            {copied ? "Copiado" : "Copiar diagnóstico"}
          </button>
        </div>
      </div>

      <div className="nexus-ux-doctor-score-v457">
        <div className={`score score-${Math.floor(snapshot.health_score / 20)}`}>
          <span>Saúde da UX</span>
          <strong>{snapshot.health_score}</strong>
          <small>/100 · {healthLabel(snapshot.health_score)}</small>
        </div>

        <article>
          <Wrench size={15} />
          <span>
            <small>Relatos pendentes</small>
            <strong>{snapshot.manual_pending}</strong>
          </span>
        </article>

        <article>
          <Sparkles size={15} />
          <span>
            <small>Sinais automáticos</small>
            <strong>{snapshot.auto_active}</strong>
          </span>
        </article>

        <article>
          <AlertTriangle size={15} />
          <span>
            <small>Alta prioridade</small>
            <strong>{snapshot.manual_high + snapshot.auto_high}</strong>
          </span>
        </article>

        <article>
          <ShieldCheck size={15} />
          <span>
            <small>Repetidos</small>
            <strong>{snapshot.repeated_signals}</strong>
          </span>
        </article>
      </div>

      <div className="nexus-ux-doctor-grid-v457">
        <article className="panel nexus-ux-doctor-routes-v457">
          <div className="panel-head">
            <div>
              <h2><Monitor size={17} /> Rotas com mais atrito</h2>
              <p>
                Combina relatos manuais pendentes e sinais automáticos dos
                últimos 14 dias.
              </p>
            </div>
          </div>

          <div className="panel-body">
            {snapshot.top_routes.length ? (
              snapshot.top_routes.map((item, index) => (
                <div className="nexus-ux-route-v457" key={item.route}>
                  <span className="rank">{index + 1}</span>
                  <span className="copy">
                    <strong>{nexusRouteLabel(item.route)}</strong>
                    <small>{item.route}</small>
                  </span>
                  <span className="numbers">
                    <b>{item.issue_count}</b>
                    <small>{item.high_count} alto(s)</small>
                  </span>
                </div>
              ))
            ) : (
              <div className="empty compact">
                <CheckCircle2 size={24} />
                <strong>Nenhuma rota crítica agora.</strong>
                O UX Doctor ainda não encontrou atrito relevante.
              </div>
            )}
          </div>
        </article>

        <article className="panel nexus-ux-doctor-device-v457">
          <div className="panel-head">
            <div>
              <h2><Smartphone size={17} /> Onde os problemas aparecem</h2>
              <p>Distribuição dos sinais por tamanho de tela.</p>
            </div>
          </div>

          <div className="panel-body">
            {snapshot.device_breakdown.length ? (
              snapshot.device_breakdown.map((item) => (
                <div className="nexus-ux-device-row-v457" key={item.viewport_class}>
                  <span>{item.viewport_class}</span>
                  <strong>{item.total}</strong>
                </div>
              ))
            ) : (
              <div className="empty compact">
                <CheckCircle2 size={23} />
                Sem sinais suficientes.
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="panel nexus-ux-auto-panel-v457">
        <div className="panel-head">
          <div>
            <h2><Sparkles size={17} /> Sinais detectados automaticamente</h2>
            <p>
              Não são tickets. São evidências técnicas que ajudam a localizar
              overflow, corte de elemento fixo e erro de cliente.
            </p>
          </div>
        </div>

        <div className="panel-body nexus-ux-auto-grid-v457">
          {topSignals.length ? (
            topSignals.map((signal) => (
              <article className={`nexus-ux-auto-card-v457 ${signal.severity}`} key={signal.id}>
                <header>
                  <span className="badge gray">
                    {SIGNAL_LABELS[signal.signal_type] ?? signal.signal_type}
                  </span>
                  <small>{signal.occurrence_count}×</small>
                </header>

                <strong>{nexusRouteLabel(signal.route)}</strong>
                <small className="route">{signal.route}</small>
                <p>{signalDescription(signal)}</p>

                <footer>
                  <span>{signal.viewport_class}</span>
                  <span>
                    {signal.viewport_width ?? "?"}×{signal.viewport_height ?? "?"}
                  </span>
                  <span>{dateTime(signal.last_seen_at)}</span>
                </footer>

                <Link href={signal.route}>
                  Abrir tela
                </Link>
              </article>
            ))
          ) : (
            <div className="empty compact">
              <CheckCircle2 size={24} />
              <strong>Nenhum sinal automático ativo.</strong>
              Continue usando o ERP normalmente.
            </div>
          )}
        </div>
      </article>

      <UxIssueReportList rows={manualRows} />
    </section>
  );
}
