"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FastForward,
  LoaderCircle,
  Square,
  Workflow,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NexusActiveRoutine } from "@/lib/nexus-routine-types";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

function routePath(value: string | null | undefined) {
  if (!value) return "";
  return value.split("?")[0].split("#")[0];
}

async function post(payload: Record<string, unknown>) {
  const response = await fetch("/api/nexus/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as NexusActiveRoutine | null | {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok) {
    throw new Error(
      data && "error" in data && typeof data.error === "string"
        ? data.error
        : "Rotina indisponível.",
    );
  }

  return data;
}

export function NexusRoutineDock({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname() || "/dashboard";
  const [active, setActive] = useState<NexusActiveRoutine | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState<string | null>(null);
  const arrivalKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch("/api/nexus/routines?mode=active", {
        cache: "no-store",
      });
      if (!response.ok) return;
      setActive((await response.json()) as NexusActiveRoutine | null);
    } catch {
      // Rotina nunca interrompe o ERP.
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    window.addEventListener("nexus:routine-changed", load);
    return () => window.removeEventListener("nexus:routine-changed", load);
  }, [load]);

  useEffect(() => {
    if (!enabled || !active?.current) return;

    const expected = routePath(active.current.href);
    const current = routePath(pathname);
    if (!expected || expected !== current) return;

    const key = `${active.run_id}:${active.current_step}:${current}`;
    if (arrivalKey.current === key) return;
    arrivalKey.current = key;

    void (async () => {
      try {
        const response = await post({
          action: "advance",
          run_id: active.run_id,
          mode: "arrive",
          href: pathname,
        });

        if (response && "run_id" in response) {
          setActive(response as NexusActiveRoutine);
        } else {
          setCompleted(active.title);
          setActive(null);
          window.setTimeout(() => setCompleted(null), 4500);
        }

        window.dispatchEvent(new Event("nexus:routine-changed"));
      } catch {
        // Não avança se o backend não confirmar a chegada.
      }
    })();
  }, [active, enabled, pathname]);

  if (!enabled) return null;

  async function skip() {
    if (!active || loading) return;

    setLoading(true);
    try {
      const response = await post({
        action: "advance",
        run_id: active.run_id,
        mode: "skip",
        href: pathname,
      });

      if (response && "run_id" in response) {
        setActive(response as NexusActiveRoutine);
      } else {
        setCompleted(active.title);
        setActive(null);
        window.setTimeout(() => setCompleted(null), 4500);
      }
      window.dispatchEvent(new Event("nexus:routine-changed"));
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!active || loading) return;

    setLoading(true);
    try {
      await post({
        action: "cancel",
        run_id: active.run_id,
      });
      setActive(null);
      window.dispatchEvent(new Event("nexus:routine-changed"));
    } finally {
      setLoading(false);
    }
  }

  if (!active && !completed) return null;

  if (completed) {
    return (
      <aside className="nexus-routine-dock-v456 completed">
        <CheckCircle2 size={17} />
        <span>
          <strong>Rotina concluída</strong>
          <small>{completed}</small>
        </span>
      </aside>
    );
  }

  if (!active) return null;

  return (
    <aside className={`nexus-routine-dock-v456 ${collapsed ? "collapsed" : ""}`}>
      <header>
        <span className="nexus-routine-dock-icon-v456">
          <Workflow size={15} />
        </span>
        <div>
          <small>Nexus · rotina ativa</small>
          <strong>{active.title}</strong>
        </div>
        <button
          type="button"
          aria-label={collapsed ? "Expandir rotina" : "Minimizar rotina"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </header>

      {!collapsed && (
        <>
          <div className="nexus-routine-dock-progress-v456">
            <div>
              <span>
                Etapa {Math.min(active.current_step + 1, active.total_steps)} de{" "}
                {active.total_steps}
              </span>
              <b>{active.progress_percent}%</b>
            </div>
            <i>
              <em style={{ width: `${active.progress_percent}%` }} />
            </i>
          </div>

          {active.current && (
            <div className="nexus-routine-dock-next-v456">
              <small>Próxima tela</small>
              <strong>
                {active.current.label || nexusRouteLabel(active.current.href)}
              </strong>
              <span>{active.current.href}</span>
            </div>
          )}

          <footer>
            {active.current && routePath(active.current.href) !== routePath(pathname) && (
              <Link className="button gold compact-button" href={active.current.href}>
                Abrir próxima <ArrowRight size={12} />
              </Link>
            )}

            <button
              className="button ghost compact-button"
              type="button"
              disabled={loading}
              onClick={() => void skip()}
            >
              {loading ? (
                <LoaderCircle className="spin" size={12} />
              ) : (
                <FastForward size={12} />
              )}
              Pular
            </button>

            <button
              className="button ghost compact-button"
              type="button"
              disabled={loading}
              onClick={() => void cancel()}
            >
              <Square size={11} /> Encerrar
            </button>

            <Link className="nexus-routine-manage-v456" href="/nexus/rotinas">
              Gerenciar
            </Link>
          </footer>
        </>
      )}
    </aside>
  );
}
