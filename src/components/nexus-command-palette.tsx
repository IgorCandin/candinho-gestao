"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Command,
  CornerDownLeft,
  Keyboard,
  LoaderCircle,
  Pin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserAccess } from "@/lib/access";
import { NexusActionPreviewButton } from "@/components/nexus-action-preview-button";
import { NexusPinShortcutButton } from "@/components/nexus-pin-shortcut-button";
import { nexusCommandRoutesForAccess } from "@/lib/nexus-command-catalog";
import type { NexusCommandResult } from "@/lib/nexus-command-types";
import type {
  NexusPersonalShortcut,
  NexusPersonalWorkspace,
} from "@/lib/nexus-personal-types";
import { emptyNexusPersonalWorkspace } from "@/lib/nexus-personal-types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
    // Navegação não depende disso.
  }
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
  const [personal, setPersonal] = useState<NexusPersonalWorkspace>(
    emptyNexusPersonalWorkspace(pathname),
  );

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

  const pinned = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return personal.pinned.slice(0, 6);

    return personal.pinned
      .filter((item) =>
        normalize(`${item.label} ${item.href}`).includes(q),
      )
      .slice(0, 6);
  }, [personal.pinned, query]);

  const loadPersonal = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch(
        `/api/nexus/personal?route=${encodeURIComponent(pathname)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      setPersonal((await response.json()) as NexusPersonalWorkspace);
    } catch {
      // Personalização não bloqueia o Command.
    }
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    function show() {
      setOpen(true);
      void loadPersonal();
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
    window.addEventListener("nexus:shortcuts-changed", loadPersonal);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nexus:command-open", show as EventListener);
      window.removeEventListener("nexus:shortcuts-changed", loadPersonal);
    };
  }, [enabled, loadPersonal]);

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
          void loadPersonal();
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
                <span className="eyebrow">Nexus Command · V45.5</span>
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
                {pinned.length > 0 && (
                  <>
                    <div className="nexus-command-suggestions-head-v454">
                      <span><Pin size={11} /> Meus atalhos</span>
                      <span className="nexus-command-alt-hint-v455">
                        <Keyboard size={11} /> Alt+1…4
                      </span>
                    </div>

                    {pinned.map((item: NexusPersonalShortcut, index) => (
                      <div className="nexus-command-route-row-v455" key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            void recordUse(item.id);
                            close();
                          }}
                        >
                          <span>
                            <strong>{item.label}</strong>
                            <small>
                              {item.context_route === "*" ? "Global" : "Nesta tela"}
                              {index < 4 ? ` · Alt+${index + 1}` : ""}
                            </small>
                          </span>
                          <ArrowRight size={13} />
                        </Link>

                        <NexusPinShortcutButton
                          href={item.href}
                          label={item.label}
                          contextRoute={item.context_route}
                          source={item.source}
                          initialShortcutId={item.id}
                          onChanged={() => void loadPersonal()}
                        />
                      </div>
                    ))}
                  </>
                )}

                <div className="nexus-command-suggestions-head-v454">
                  <span>{query.trim() ? "Atalhos encontrados" : "Rotas rápidas"}</span>
                  <Link href="/nexus/foco" onClick={close}>
                    Meu Dia <ArrowRight size={12} />
                  </Link>
                </div>

                {suggestions.map((item) => {
                  const pinnedItem = personal.pinned.find(
                    (shortcut) =>
                      shortcut.href === item.href &&
                      shortcut.context_route === "*",
                  );

                  return (
                    <div
                      className="nexus-command-route-row-v455"
                      key={`${item.operation}-${item.href}`}
                    >
                      <Link href={item.href} onClick={close}>
                        <span>
                          <strong>{item.label}</strong>
                          <small>
                            {item.keywords.split(" ").slice(0, 4).join(" · ")}
                          </small>
                        </span>
                        <ArrowRight size={13} />
                      </Link>

                      <NexusPinShortcutButton
                        href={item.href}
                        label={item.label}
                        contextRoute="*"
                        source="command"
                        initialShortcutId={pinnedItem?.id ?? null}
                        onChanged={() => void loadPersonal()}
                      />
                    </div>
                  );
                })}

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
                    <>
                      <Link className="button gold" href={result.href} onClick={close}>
                        Abrir tela <ArrowRight size={14} />
                      </Link>
                      <NexusPinShortcutButton
                        href={result.href}
                        label={
                          routes.find((route) => route.href === result.href)?.label ??
                          "Atalho"
                        }
                        contextRoute="*"
                        source="command"
                        initialShortcutId={
                          personal.pinned.find(
                            (shortcut) =>
                              shortcut.href === result.href &&
                              shortcut.context_route === "*",
                          )?.id ?? null
                        }
                        onChanged={() => void loadPersonal()}
                      />
                    </>
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
              <span>Ações críticas continuam fora do comando automático.</span>
              <kbd>Esc</kbd>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
