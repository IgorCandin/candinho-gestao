"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Command,
  CornerDownLeft,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserAccess } from "@/lib/access";
import { NexusActionPreviewButton } from "@/components/nexus-action-preview-button";
import { nexusCommandRoutesForAccess } from "@/lib/nexus-command-catalog";
import type { NexusCommandResult } from "@/lib/nexus-command-types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function NexusCommandPalette({
  access,
  enabled = true,
}: {
  access: UserAccess;
  enabled?: boolean;
}) {
  const pathname = usePathname() || "/dashboard";
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NexusCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routes = useMemo(() => nexusCommandRoutesForAccess(access), [access]);

  const suggestions = useMemo(() => {
    const q = normalize(query.trim());
    const base = q
      ? routes.filter((item) =>
          normalize(`${item.label} ${item.keywords}`).includes(q),
        )
      : routes;

    return base.slice(0, 7);
  }, [query, routes]);

  useEffect(() => {
    if (!enabled) return;

    function show() {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show();
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("nexus:command-open", show as EventListener);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nexus:command-open", show as EventListener);
    };
  }, [enabled]);

  if (!enabled) return null;

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  async function interpret() {
    const message = query.trim();
    if (!message || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/nexus/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          current_route: pathname,
        }),
      });

      const payload = (await response.json()) as NexusCommandResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Nexus Command indisponível.");
      }

      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nexus Command indisponível.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="nexus-command-trigger-v454"
        type="button"
        aria-label="Abrir Nexus Command"
        data-nexus-action="open_global_command"
        data-nexus-component="nexus_command"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Command size={14} />
        <span>Comando</span>
        <kbd>Ctrl K</kbd>
      </button>

      {open && (
        <div className="nexus-command-backdrop-v454" role="presentation">
          <section
            className="nexus-command-modal-v454"
            role="dialog"
            aria-modal="true"
            aria-label="Nexus Command"
          >
            <header>
              <span className="nexus-command-orb-v454">
                <Bot size={20} />
              </span>
              <div>
                <span className="eyebrow">Nexus Command · V45.4</span>
                <strong>O que você quer fazer?</strong>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={close}
              >
                <X size={16} />
              </button>
            </header>

            <form
              className="nexus-command-input-v454"
              data-nexus-form="global_command"
              onSubmit={(event) => {
                event.preventDefault();
                void interpret();
              }}
            >
              <Search size={17} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResult(null);
                  setError(null);
                }}
                placeholder='Ex.: "abrir entradas", "criar tarefa amanhã 10h conferir estoque"'
              />
              <button
                type="submit"
                className="button gold compact-button"
                disabled={!query.trim() || loading}
              >
                {loading ? (
                  <LoaderCircle className="spin" size={13} />
                ) : (
                  <CornerDownLeft size={13} />
                )}
                {loading ? "Pensando" : "Executar comando"}
              </button>
            </form>

            {!result && !error && (
              <div className="nexus-command-suggestions-v454">
                <div className="nexus-command-suggestions-head-v454">
                  <span>
                    {query.trim()
                      ? "Atalhos encontrados"
                      : "Atalhos rápidos"}
                  </span>
                  <Link href="/nexus/fila" onClick={close}>
                    Fila Única <ArrowRight size={12} />
                  </Link>
                </div>

                {suggestions.map((item) => (
                  <Link
                    href={item.href}
                    key={`${item.operation}-${item.href}`}
                    onClick={close}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.keywords.split(" ").slice(0, 4).join(" · ")}</small>
                    </span>
                    <ArrowRight size={13} />
                  </Link>
                ))}

                {!query.trim() && (
                  <div className="nexus-command-examples-v454">
                    <Sparkles size={13} />
                    <span>
                      Também entende: <b>“o que faço agora?”</b>,{" "}
                      <b>“onde vejo as faturas?”</b> e{" "}
                      <b>“criar tarefa sexta 16h revisar campanha”</b>.
                    </span>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="nexus-command-result-v454">
                <div className="nexus-command-result-head-v454">
                  <CheckCircle2 size={17} />
                  <div>
                    <span className="eyebrow">
                      {result.intent === "navigate"
                        ? "Navegação"
                        : result.intent === "create_task"
                          ? "Ação preparada"
                          : "Resposta rápida"}
                    </span>
                    <p>{result.message}</p>
                  </div>
                </div>

                <div className="nexus-command-result-actions-v454">
                  {result.intent === "navigate" && result.href && (
                    <Link className="button gold" href={result.href} onClick={close}>
                      Abrir tela <ArrowRight size={14} />
                    </Link>
                  )}

                  {result.intent === "create_task" &&
                    result.task.title &&
                    result.task.due_at &&
                    result.task.operation_scope && (
                      <NexusActionPreviewButton
                        actionKind="create_operational_task"
                        payload={{
                          title: result.task.title,
                          due_at: result.task.due_at,
                          priority: result.task.priority ?? "normal",
                          operation_scope: result.task.operation_scope,
                          category: "task",
                          notes:
                            result.task.notes ??
                            "[Nexus Command] Tarefa preparada por comando rápido.",
                        }}
                        label="Revisar e criar tarefa"
                        tone="gold"
                        compact={false}
                        component="nexus_command"
                      />
                    )}

                  {result.next_actions.map((action) =>
                    action.href ? (
                      <Link
                        className="button ghost compact-button"
                        href={action.href}
                        key={`${action.label}-${action.href}`}
                        onClick={close}
                      >
                        {action.label}
                      </Link>
                    ) : null,
                  )}
                </div>

                <small className="nexus-command-confidence-v454">
                  Confiança: {result.confidence}
                </small>
              </div>
            )}

            {error && (
              <div className="nexus-command-error-v454">
                <strong>Não consegui interpretar esse comando.</strong>
                <span>{error}</span>
              </div>
            )}

            <footer>
              <span>
                Ações críticas continuam fora do comando automático.
              </span>
              <kbd>Esc</kbd>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
