"use client";

import Link from "next/link";
import {
  Bot,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { NexusBrief } from "@/lib/nexus-operating-types";

export function NexusCopilotDock({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<NexusBrief | null>(null);
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
    if (brief || loadingBrief) return;

    setLoadingBrief(true);
    try {
      const response = await fetch("/api/nexus/brief", { cache: "no-store" });
      const payload = (await response.json()) as NexusBrief & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Nexus indisponível.");
      setBrief(payload);
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
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível perguntar ao Nexus.");
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

  return (
    <>
      <button
        className={`nexus-dock-trigger ${open ? "open" : ""}`}
        type="button"
        aria-label={open ? "Fechar Nexus" : "Abrir Nexus"}
        onClick={() => (open ? setOpen(false) : void openDock())}
      >
        {open ? <X size={20} /> : <Bot size={21} />}
        <b>{open ? "Fechar" : "Nexus"}</b>
        {!open && brief?.counts.urgent ? (
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
            <Link href="/suplementos/nexus">
              Central completa <ChevronRight size={13} />
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
                  <div><span>Agora</span><strong>{actionableCount}</strong></div>
                  <div><span>Urgente</span><strong>{brief.counts.urgent}</strong></div>
                  <div><span>Oportunidade</span><strong>{brief.counts.opportunity}</strong></div>
                </div>

                <div className="nexus-dock-signals">
                  {brief.signals.slice(0, 4).map((signal) => (
                    <Link href={signal.actionHref ?? "/suplementos/nexus"} key={signal.id}>
                      <Sparkles size={13} />
                      <span><strong>{signal.title}</strong><small>{signal.summary}</small></span>
                      <ChevronRight size={13} />
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            <div className="nexus-dock-ask">
              <label>
                <MessageSquareText size={14} /> Pergunta rápida
              </label>
              <textarea
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="O que faço agora? Quem devo chamar?"
              />
              <button
                className="button gold compact-button"
                type="button"
                disabled={asking || !input.trim()}
                onClick={() => void ask()}
              >
                {asking ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}
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
