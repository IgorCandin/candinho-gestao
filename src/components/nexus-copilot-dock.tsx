"use client";

import Link from "next/link";
import {
  Bot,
  ChevronRight,
  Command,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Route,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NexusDailySnapshot } from "@/lib/nexus-daily-types";
import type { NexusBrief } from "@/lib/nexus-operating-types";
import type { NexusUnifiedQueueSnapshot } from "@/lib/nexus-unified-types";
import { nexusRouteHref, nexusRouteLabel } from "@/lib/nexus-route-labels";

export function NexusCopilotDock({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname() || "/suplementos";
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<NexusBrief | null>(null);
  const [daily, setDaily] = useState<NexusDailySnapshot | null>(null);
  const [unified, setUnified] = useState<NexusUnifiedQueueSnapshot | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const actionableCount = brief
    ? brief.counts.urgent + brief.counts.attention + brief.counts.opportunity
    : 0;

  async function openDock() {
    setOpen(true);
    if ((brief && daily && unified) || loadingBrief) return;

    setLoadingBrief(true);
    try {
      const [briefResponse, dailyResponse, unifiedResponse] = await Promise.all([
        fetch("/api/nexus/brief", { cache: "no-store" }),
        fetch(`/api/nexus/daily?route=${encodeURIComponent(pathname)}`, {
          cache: "no-store",
        }),
        fetch("/api/nexus/unified?limit=20", { cache: "no-store" }),
      ]);

      const briefPayload = (await briefResponse.json()) as NexusBrief & {
        error?: string;
      };

      if (!briefResponse.ok) {
        throw new Error(briefPayload.error ?? "Nexus indisponível.");
      }

      setBrief(briefPayload);

      if (dailyResponse.ok) {
        setDaily((await dailyResponse.json()) as NexusDailySnapshot);
      }

      if (unifiedResponse.ok) {
        setUnified((await unifiedResponse.json()) as NexusUnifiedQueueSnapshot);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nexus indisponível.");
    } finally {
      setLoadingBrief(false);
    }
  }

  async function ask() {
    const question = input.trim();
    if (!question || asking) return;

    setAsking(true);
    setError(null);
    setAnswer("");

    try {
      const response = await fetch("/api/nexus/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history: [] }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível perguntar ao Nexus.");
      }
      setAnswer(payload.message ?? "");
      setInput("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível perguntar ao Nexus.",
      );
    } finally {
      setAsking(false);
    }
  }

  function openCommand() {
    setOpen(false);
    window.dispatchEvent(new Event("nexus:command-open"));
  }

  return (
    <>
      <button
        className={`nexus-dock-trigger ${open ? "open" : ""}`}
        type="button"
        data-nexus-action={open ? "close_copilot" : "open_copilot"}
        data-nexus-component="nexus_dock"
        aria-label={open ? "Fechar Nexus" : "Abrir Nexus"}
        onClick={() => (open ? setOpen(false) : void openDock())}
      >
        {open ? <X size={20} /> : <Bot size={21} />}
        <b>{open ? "Fechar" : "Nexus"}</b>
        {!open && unified?.summary.urgent ? (
          <span>{Math.min(unified.summary.urgent, 99)}</span>
        ) : !open && brief?.counts.urgent ? (
          <span>{Math.min(brief.counts.urgent, 99)}</span>
        ) : null}
      </button>

      {open && (
        <aside className="nexus-dock-panel">
          <div className="nexus-dock-head">
            <div>
              <span className="eyebrow">Nexus</span>
              <strong>Copiloto da operação</strong>
            </div>
            <Link href="/nexus/fila">
              Fila Única <ChevronRight size={13} />
            </Link>
          </div>

          <div className="nexus-dock-content">
            {loadingBrief ? (
              <div className="nexus-dock-loading">
                <LoaderCircle className="spin" size={17} /> Lendo operação...
              </div>
            ) : brief ? (
              <>
                <div className="nexus-dock-counts">
                  <div>
                    <span>Fila global</span>
                    <strong>{unified?.summary.total ?? actionableCount}</strong>
                  </div>
                  <div>
                    <span>Urgente</span>
                    <strong>{unified?.summary.urgent ?? brief.counts.urgent}</strong>
                  </div>
                  <div>
                    <span>Oportunidade</span>
                    <strong>{brief.counts.opportunity}</strong>
                  </div>
                </div>

                <div className="nexus-dock-global-v454">
                  <Link href="/nexus/fila">
                    <ListChecks size={14} />
                    <span>
                      <strong>Fila Única</strong>
                      <small>Suplementos + Fitness + Bank + Central</small>
                    </span>
                    <ChevronRight size={13} />
                  </Link>
                  <button type="button" onClick={openCommand}>
                    <Command size={14} />
                    <span>
                      <strong>Comando rápido</strong>
                      <small>Ctrl+K em qualquer tela</small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {daily?.shortcuts?.length ? (
                  <div className="nexus-dock-smart-v453">
                    <div>
                      <Route size={13} />
                      <strong>Atalhos aprendidos nesta tela</strong>
                    </div>
                    <nav>
                      {daily.shortcuts.slice(0, 4).map((shortcut) => {
                        const href = nexusRouteHref(shortcut.to_route);
                        if (!href) return null;
                        return (
                          <Link href={href} key={shortcut.to_route}>
                            {nexusRouteLabel(shortcut.to_route)}
                            <small>{shortcut.transitions_30d}×</small>
                          </Link>
                        );
                      })}
                    </nav>
                    <Link href="/suplementos/nexus/habitos">
                      Como o Nexus aprendeu isso <ChevronRight size={12} />
                    </Link>
                  </div>
                ) : null}

                <div className="nexus-dock-signals">
                  {brief.signals.slice(0, 3).map((signal) => (
                    <Link
                      href={signal.actionHref ?? "/suplementos/nexus"}
                      key={signal.id}
                    >
                      <Sparkles size={13} />
                      <span>
                        <strong>{signal.title}</strong>
                        <small>{signal.summary}</small>
                      </span>
                      <ChevronRight size={13} />
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            <div className="nexus-dock-ask">
              <label>
                <MessageSquareText size={14} /> Pergunta detalhada
              </label>
              <textarea
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Quem devo chamar? Qual produto oferecer?"
              />
              <button
                className="button gold compact-button"
                type="button"
                data-nexus-action="ask_copilot"
                data-nexus-component="nexus_dock"
                disabled={asking || !input.trim()}
                onClick={() => void ask()}
              >
                {asking ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Send size={14} />
                )}
                {asking ? "Analisando" : "Perguntar"}
              </button>
            </div>

            {answer && <p className="nexus-dock-answer">{answer}</p>}
            {error && <p className="form-message">{error}</p>}
          </div>
        </aside>
      )}
    </>
  );
}
