"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  History,
  ListChecks,
  LoaderCircle,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { NexusPersonalShortcut } from "@/lib/nexus-personal-types";
import type {
  NexusActiveRoutine,
  NexusRoutine,
  NexusRoutineStep,
  NexusRoutineSuggestion,
  NexusRoutinesWorkspace,
} from "@/lib/nexus-routine-types";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

function routineTitleFromSuggestion(item: NexusRoutineSuggestion) {
  const first = item.steps[0]?.href ? nexusRouteLabel(item.steps[0].href) : "Início";
  const last = item.steps.at(-1)?.href
    ? nexusRouteLabel(item.steps.at(-1)!.href)
    : "Fim";

  return `${first} → ${last}`.slice(0, 120);
}

function StepTrail({ steps }: { steps: NexusRoutineStep[] }) {
  return (
    <div className="nexus-routine-trail-v456">
      {steps.map((step, index) => (
        <span key={`${step.href}-${index}`}>
          <b>{index + 1}</b>
          <em>{step.label || nexusRouteLabel(step.href)}</em>
          {index < steps.length - 1 && <ArrowRight size={11} />}
        </span>
      ))}
    </div>
  );
}

async function post(payload: Record<string, unknown>) {
  const response = await fetch("/api/nexus/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Não foi possível concluir.",
    );
  }

  return data;
}

function ActiveRoutineCard({
  active,
  onChanged,
}: {
  active: NexusActiveRoutine;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    try {
      await post({
        action: "cancel",
        run_id: active.run_id,
      });
      window.dispatchEvent(new Event("nexus:routine-changed"));
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="nexus-routine-active-v456">
      <div>
        <span className="eyebrow">Rotina ativa</span>
        <h2>{active.title}</h2>
        <p>
          Etapa {Math.min(active.current_step + 1, active.total_steps)} de{" "}
          {active.total_steps}
        </p>
      </div>

      <div className="nexus-routine-active-progress-v456">
        <span style={{ width: `${active.progress_percent}%` }} />
      </div>

      {active.current && (
        <Link className="button gold" href={active.current.href}>
          Ir para {active.current.label || nexusRouteLabel(active.current.href)}
          <ArrowRight size={13} />
        </Link>
      )}

      <button
        className="button ghost compact-button"
        type="button"
        disabled={loading}
        onClick={() => void cancel()}
      >
        {loading ? <LoaderCircle className="spin" size={12} /> : null}
        Encerrar
      </button>
    </article>
  );
}

function RoutineCard({
  routine,
  onChanged,
}: {
  routine: NexusRoutine;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState<"start" | "delete" | null>(null);

  async function start() {
    setLoading("start");
    try {
      await post({ action: "start", routine_id: routine.id });
      window.dispatchEvent(new Event("nexus:routine-changed"));
      onChanged();
    } finally {
      setLoading(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir a rotina "${routine.title}"?`)) return;

    setLoading("delete");
    try {
      await post({ action: "delete", routine_id: routine.id });
      window.dispatchEvent(new Event("nexus:routine-changed"));
      onChanged();
    } finally {
      setLoading(null);
    }
  }

  return (
    <article className="nexus-routine-card-v456">
      <header>
        <div>
          <small>
            {routine.source === "learned"
              ? "Aprendida pelo Nexus"
              : routine.source === "template"
                ? "Modelo"
                : "Criada por você"}
          </small>
          <h3>{routine.title}</h3>
          {routine.description && <p>{routine.description}</p>}
        </div>

        <span className="badge gray">
          {routine.run_count} execução(ões)
        </span>
      </header>

      <StepTrail steps={routine.steps} />

      <footer>
        <button
          className="button gold compact-button"
          type="button"
          disabled={loading !== null}
          onClick={() => void start()}
        >
          {loading === "start" ? (
            <LoaderCircle className="spin" size={12} />
          ) : (
            <Play size={12} />
          )}
          Iniciar rotina
        </button>

        <button
          className="button ghost compact-button"
          type="button"
          disabled={loading !== null}
          onClick={() => void remove()}
        >
          {loading === "delete" ? (
            <LoaderCircle className="spin" size={12} />
          ) : (
            <Trash2 size={12} />
          )}
          Excluir
        </button>
      </footer>
    </article>
  );
}

export function NexusRoutinesWorkspace({
  initialWorkspace,
  pinnedShortcuts,
}: {
  initialWorkspace: NexusRoutinesWorkspace;
  pinnedShortcuts: NexusPersonalShortcut[];
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedShortcuts = useMemo(
    () => pinnedShortcuts.filter((item) => selected.includes(item.id)),
    [pinnedShortcuts, selected],
  );

  async function reload() {
    const response = await fetch("/api/nexus/routines", { cache: "no-store" });
    if (!response.ok) return;
    setWorkspace((await response.json()) as NexusRoutinesWorkspace);
  }

  async function refresh() {
    setLoading(true);
    setMessage(null);

    try {
      await reload();
      setMessage("Rotinas atualizadas.");
    } finally {
      setLoading(false);
    }
  }

  async function createManual() {
    if (selectedShortcuts.length < 2) {
      setMessage("Escolha pelo menos 2 atalhos.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await post({
        action: "create",
        title: title.trim() || "Minha rotina",
        source: "manual",
        steps: selectedShortcuts.map((item) => ({
          type: "route",
          href: item.href,
          label: item.label,
        })),
      });

      setTitle("");
      setSelected([]);
      await reload();
      setMessage("Rotina criada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setLoading(false);
    }
  }

  async function createSuggestion(item: NexusRoutineSuggestion) {
    setLoading(true);
    setMessage(null);

    try {
      await post({
        action: "create",
        title: routineTitleFromSuggestion(item),
        source: "learned",
        source_key: item.source_key,
        description: `Fluxo repetido ${item.repetitions} vezes em ${item.distinct_days} dia(s).`,
        steps: item.steps.map((step) => ({
          ...step,
          label: nexusRouteLabel(step.href),
        })),
      });

      await reload();
      setMessage("Fluxo aprendido virou uma rotina.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setLoading(false);
    }
  }

  function toggleShortcut(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 8) return current;
      return [...current, id];
    });
  }

  return (
    <section className="nexus-routines-workspace-v456">
      <div className="nexus-routines-hero-v456">
        <div>
          <span className="eyebrow">Nexus · Rotinas</span>
          <h1>Menos menu. Mais sequência.</h1>
          <p>
            Monte caminhos de trabalho e deixe o Nexus conduzir a próxima tela.
            A rotina organiza navegação; ações críticas continuam no fluxo normal.
          </p>
        </div>

        <div>
          <Link className="button ghost compact-button" href="/nexus/foco">
            Meu Dia
          </Link>
          <button
            className="button ghost compact-button"
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? (
              <LoaderCircle className="spin" size={12} />
            ) : (
              <RefreshCcw size={12} />
            )}
            Atualizar
          </button>
        </div>
      </div>

      <div className="nexus-routines-stats-v456">
        <article>
          <span>Minhas rotinas</span>
          <strong>{workspace.stats.routines}</strong>
        </article>
        <article>
          <span>Nexus encontrou</span>
          <strong>{workspace.stats.suggestions}</strong>
        </article>
        <article>
          <span>Execuções recentes</span>
          <strong>{workspace.stats.recent_runs}</strong>
        </article>
        <article className={workspace.active_run ? "active" : ""}>
          <span>Em andamento</span>
          <strong>{workspace.active_run ? "1" : "0"}</strong>
        </article>
      </div>

      {workspace.active_run && (
        <ActiveRoutineCard active={workspace.active_run} onChanged={() => void reload()} />
      )}

      {workspace.suggestions.length > 0 && (
        <article className="panel nexus-routines-panel-v456">
          <div className="panel-head">
            <div>
              <h2><Sparkles size={16} /> Fluxos que o Nexus aprendeu</h2>
              <p>
                Só aparecem sequências repetidas. Você escolhe se alguma merece
                virar rotina permanente.
              </p>
            </div>
          </div>

          <div className="nexus-routine-suggestions-v456">
            {workspace.suggestions.map((item) => (
              <div className="nexus-routine-suggestion-v456" key={item.source_key}>
                <div>
                  <small>
                    Repetido {item.repetitions}x · {item.distinct_days} dia(s)
                  </small>
                  <StepTrail steps={item.steps} />
                </div>

                <button
                  className="button gold compact-button"
                  type="button"
                  disabled={loading}
                  onClick={() => void createSuggestion(item)}
                >
                  <Plus size={12} /> Virar rotina
                </button>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="panel nexus-routines-panel-v456">
        <div className="panel-head">
          <div>
            <h2><Workflow size={16} /> Criar com meus atalhos</h2>
            <p>
              Escolha de 2 a 8 telas na ordem em que quer trabalhar.
            </p>
          </div>
        </div>

        {pinnedShortcuts.length < 2 ? (
          <div className="empty compact">
            <ListChecks size={24} />
            <strong>Fixe pelo menos 2 atalhos primeiro.</strong>
            Abra Meu Dia ou Ctrl+K e use “Fixar”.
          </div>
        ) : (
          <>
            <label className="field">
              <span>Nome da rotina</span>
              <input
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Giro comercial da manhã"
              />
            </label>

            <div className="nexus-routine-builder-v456">
              {pinnedShortcuts.map((item) => {
                const position = selected.indexOf(item.id);
                const isSelected = position >= 0;

                return (
                  <button
                    className={isSelected ? "selected" : ""}
                    type="button"
                    key={item.id}
                    onClick={() => toggleShortcut(item.id)}
                  >
                    <span>{isSelected ? position + 1 : "+"}</span>
                    <strong>{item.label}</strong>
                    <small>{item.href}</small>
                  </button>
                );
              })}
            </div>

            {selectedShortcuts.length > 0 && (
              <div className="nexus-routine-builder-preview-v456">
                <strong>Ordem:</strong>
                <StepTrail
                  steps={selectedShortcuts.map((item) => ({
                    type: "route",
                    href: item.href,
                    label: item.label,
                  }))}
                />
              </div>
            )}

            <button
              className="button gold"
              type="button"
              disabled={loading || selectedShortcuts.length < 2}
              onClick={() => void createManual()}
            >
              <Plus size={13} /> Salvar rotina
            </button>
          </>
        )}
      </article>

      <article className="panel nexus-routines-panel-v456">
        <div className="panel-head">
          <div>
            <h2><ListChecks size={16} /> Minhas rotinas</h2>
            <p>Iniciar uma nova encerra automaticamente a rotina anterior.</p>
          </div>
        </div>

        {workspace.routines.length ? (
          <div className="nexus-routine-grid-v456">
            {workspace.routines.map((routine) => (
              <RoutineCard
                routine={routine}
                key={routine.id}
                onChanged={() => void reload()}
              />
            ))}
          </div>
        ) : (
          <div className="empty compact">
            <Workflow size={24} />
            <strong>Nenhuma rotina salva ainda.</strong>
            Use um fluxo aprendido ou monte uma com seus atalhos.
          </div>
        )}
      </article>

      {workspace.recent_runs.length > 0 && (
        <article className="panel nexus-routines-panel-v456 compact">
          <div className="panel-head">
            <div>
              <h2><History size={16} /> Histórico recente</h2>
            </div>
          </div>

          <div className="nexus-routine-history-v456">
            {workspace.recent_runs.map((run) => (
              <div key={run.run_id}>
                {run.status === "completed" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <History size={13} />
                )}
                <span>
                  <strong>{run.title}</strong>
                  <small>
                    {run.status === "completed" ? "Concluída" : "Encerrada"} ·{" "}
                    {run.current_step}/{run.total_steps} etapas
                  </small>
                </span>
              </div>
            ))}
          </div>
        </article>
      )}

      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
