"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Command,
  Dumbbell,
  Keyboard,
  Landmark,
  LoaderCircle,
  ListChecks,
  Pin,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { NexusPinShortcutButton } from "@/components/nexus-pin-shortcut-button";
import type {
  NexusPersonalShortcut,
  NexusPersonalWorkspace,
} from "@/lib/nexus-personal-types";
import type {
  NexusUnifiedQueueItem,
  NexusUnifiedQueueSnapshot,
} from "@/lib/nexus-unified-types";
import {
  operationLabel,
  personalShortcutSourceLabel,
} from "@/lib/nexus-shortcut-utils";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

function iconFor(scope: string) {
  if (scope === "fitness") return Dumbbell;
  if (scope === "bank") return Landmark;
  if (scope === "company" || scope === "central" || scope === "marketing") return Building2;
  return Sparkles;
}

function dueLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function recordUse(id: string) {
  try {
    await fetch("/api/nexus/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "use", id }),
      keepalive: true,
    });
  } catch {
    // Não bloqueia navegação.
  }
}

function QueueCard({ item, rank }: { item: NexusUnifiedQueueItem; rank: number }) {
  const Icon = iconFor(item.operation_scope);
  return (
    <Link className={`nexus-focus-priority-v455 ${item.severity}`} href={item.href}>
      <span className="nexus-focus-rank-v455">{rank}</span>
      <span className={`nexus-focus-op-v455 ${item.operation_scope}`}><Icon size={14} /></span>
      <span className="nexus-focus-priority-copy-v455">
        <small>{item.operation_label}{item.due_at ? ` · ${dueLabel(item.due_at)}` : ""}</small>
        <strong>{item.title}</strong>
        {item.summary && <span>{item.summary}</span>}
      </span>
      <ArrowRight size={14} />
    </Link>
  );
}

function PinnedCard({
  shortcut,
  slot,
  onChanged,
}: {
  shortcut: NexusPersonalShortcut;
  slot: number | null;
  onChanged: () => void;
}) {
  const Icon = iconFor(shortcut.operation_scope);
  return (
    <article className={`nexus-personal-card-v455 ${shortcut.operation_scope}`}>
      <div className="nexus-personal-card-head-v455">
        <span className="nexus-personal-card-icon-v455"><Icon size={15} /></span>
        {slot ? <kbd>Alt+{slot}</kbd> : <span />}
      </div>
      <Link href={shortcut.href} onClick={() => void recordUse(shortcut.id)}>
        <small>{operationLabel(shortcut.operation_scope)} · {personalShortcutSourceLabel(shortcut.source)}</small>
        <strong>{shortcut.label}</strong>
        <span>{shortcut.href}</span>
      </Link>
      <NexusPinShortcutButton
        href={shortcut.href}
        label={shortcut.label}
        contextRoute={shortcut.context_route}
        source={shortcut.source}
        initialShortcutId={shortcut.id}
        onChanged={onChanged}
      />
    </article>
  );
}

export function NexusFocusWorkspace({
  userName,
  initialPersonal,
  initialQueue,
}: {
  userName: string;
  initialPersonal: NexusPersonalWorkspace;
  initialQueue: NexusUnifiedQueueSnapshot;
}) {
  const [personal, setPersonal] = useState(initialPersonal);
  const [queue, setQueue] = useState(initialQueue);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const topQueue = useMemo(() => {
    const commercial = queue.items.find((item) => item.source_type === "commercial_queue");
    const others = queue.items.filter((item) => item.source_type !== "commercial_queue");
    if (!commercial) return others.slice(0, 5);
    return [...others.slice(0, 4), commercial].sort((a, b) => b.score - a.score);
  }, [queue.items]);

  const reloadPersonal = useCallback(async () => {
    const response = await fetch("/api/nexus/personal?route=/nexus/foco", { cache: "no-store" });
    if (!response.ok) return;
    setPersonal((await response.json()) as NexusPersonalWorkspace);
  }, []);

  function openNexus() {
    const trigger = document.querySelector<HTMLButtonElement>(".nexus-dock-trigger");
    trigger?.click();
  }

  async function refreshAll() {
    setRefreshing(true);
    setMessage(null);
    try {
      const [personalResponse, queueResponse] = await Promise.all([
        fetch("/api/nexus/personal?route=/nexus/foco", { cache: "no-store" }),
        fetch("/api/nexus/unified?limit=80", { cache: "no-store" }),
      ]);
      if (personalResponse.ok) setPersonal((await personalResponse.json()) as NexusPersonalWorkspace);
      if (queueResponse.ok) setQueue((await queueResponse.json()) as NexusUnifiedQueueSnapshot);
      setMessage("Seu foco foi atualizado.");
    } catch {
      setMessage("Não foi possível atualizar agora.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="nexus-focus-workspace-v455">
      <div className="nexus-focus-hero-v455">
        <div>
          <span className="eyebrow">Nexus · Meu Dia</span>
          <h1>Olá, {userName}. Comece por aqui.</h1>
          <p>Prioridades, Nexus, comando, rotinas e seus atalhos pessoais concentrados em uma única tela.</p>
        </div>

        <div className="nexus-focus-hero-actions-v455">
          <Link className="button ghost compact-button" href="/nexus/rotinas">
            <ListChecks size={13} /> Rotinas
          </Link>
          <button className="button ghost compact-button" type="button" onClick={openNexus}>
            <Bot size={13} /> Nexus
          </button>
          <button
            className="button ghost compact-button"
            type="button"
            disabled={refreshing}
            onClick={() => void refreshAll()}
          >
            {refreshing ? <LoaderCircle className="spin" size={13} /> : <RefreshCcw size={13} />}
            Atualizar
          </button>
          <button
            className="button gold compact-button"
            type="button"
            onClick={() => window.dispatchEvent(new Event("nexus:command-open"))}
          >
            <Command size={13} /> Comando
          </button>
        </div>
      </div>

      <div className="nexus-focus-summary-v455">
        <article><span>Fila total</span><strong>{queue.summary.total}</strong><small>em todas as operações</small></article>
        <article className="urgent"><span>Urgentes</span><strong>{queue.summary.urgent}</strong><small>merecem atenção primeiro</small></article>
        <article><span>Meus atalhos</span><strong>{personal.stats.total_pins}</strong><small>fixados por você</small></article>
        <article><span>Nexus sugere</span><strong>{personal.stats.suggestion_count}</strong><small>baseado em uso real</small></article>
      </div>

      <article className="nexus-focus-panel-v455">
        <header>
          <div>
            <span className="eyebrow">Agora</span>
            <h2><Bot size={17} /> Cinco próximas ações</h2>
            <p>A fila comercial ocupa no máximo uma posição aqui. As outras quatro continuam livres para obrigações reais.</p>
          </div>
          <Link className="button ghost compact-button" href="/nexus/fila">Ver Fila Única <ArrowRight size={13} /></Link>
        </header>

        <div className="nexus-focus-priorities-v455">
          {topQueue.length ? (
            topQueue.map((item, index) => <QueueCard item={item} rank={index + 1} key={item.queue_id} />)
          ) : (
            <div className="empty compact"><CheckCircle2 size={24} /><strong>Fila limpa.</strong>Nenhuma prioridade operacional apareceu agora.</div>
          )}
        </div>
      </article>

      <article className="nexus-focus-panel-v455">
        <header>
          <div>
            <span className="eyebrow">Personalizado</span>
            <h2><Pin size={17} /> Meus atalhos</h2>
            <p>Os quatro primeiros também funcionam por teclado: Alt+1 até Alt+4.</p>
          </div>
          <span className="nexus-focus-keyboard-v455"><Keyboard size={14} /> Alt + 1…4</span>
        </header>

        {personal.pinned.length ? (
          <div className="nexus-personal-grid-v455">
            {personal.pinned.map((shortcut, index) => (
              <PinnedCard
                shortcut={shortcut}
                slot={index < 4 ? index + 1 : null}
                key={shortcut.id}
                onChanged={() => void reloadPersonal()}
              />
            ))}
          </div>
        ) : (
          <div className="nexus-focus-onboarding-v455">
            <Pin size={18} />
            <div><strong>Você ainda não fixou nenhum atalho.</strong><span>Escolha uma sugestão abaixo. Você decide quais caminhos ficam permanentes.</span></div>
          </div>
        )}
      </article>

      {personal.suggested.length > 0 && (
        <article className="nexus-focus-panel-v455">
          <header><div><span className="eyebrow">Aprendizado</span><h2><Sparkles size={17} /> O Nexus percebeu estes caminhos</h2><p>Sugestões baseadas na sua navegação dos últimos 30 dias.</p></div></header>
          <div className="nexus-focus-suggestions-v455">
            {personal.suggested.map((item) => (
              <div className="nexus-focus-suggestion-v455" key={item.href}>
                <Link href={item.href}>
                  <small>{operationLabel(item.operation_scope)} · {item.hits} uso(s) · {item.distinct_days} dia(s)</small>
                  <strong>{nexusRouteLabel(item.href)}</strong>
                  <span>{item.reason}</span>
                </Link>
                <NexusPinShortcutButton href={item.href} label={nexusRouteLabel(item.href)} source="learned" contextRoute="*" onChanged={() => void reloadPersonal()} />
              </div>
            ))}
          </div>
        </article>
      )}

      {personal.recent.length > 0 && (
        <article className="nexus-focus-panel-v455 compact">
          <header><div><span className="eyebrow">Continuidade</span><h2><Clock3 size={17} /> Continue de onde passou</h2></div></header>
          <div className="nexus-focus-recent-v455">
            {personal.recent.map((item) => (
              <Link href={item.href} key={item.href}><strong>{nexusRouteLabel(item.href)}</strong><small>{operationLabel(item.operation_scope)}</small></Link>
            ))}
          </div>
        </article>
      )}

      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
