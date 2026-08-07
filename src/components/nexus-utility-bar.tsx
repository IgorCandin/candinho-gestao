"use client";

import Link from "next/link";
import {
  Bot,
  Bug,
  ChevronDown,
  Command,
  Gauge,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { NexusActiveRoutine } from "@/lib/nexus-routine-types";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

function clickHidden(selector: string) {
  document.querySelector<HTMLButtonElement>(selector)?.click();
}

export function NexusUtilityBar({
  enabled = true,
  canUseNexus = true,
}: {
  enabled?: boolean;
  canUseNexus?: boolean;
}) {
  const [activeRoutine, setActiveRoutine] =
    useState<NexusActiveRoutine | null>(null);

  const loadRoutine = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch("/api/nexus/routines?mode=active", {
        cache: "no-store",
      });

      if (!response.ok) return;
      setActiveRoutine(
        (await response.json()) as NexusActiveRoutine | null,
      );
    } catch {
      // A barra nunca pode bloquear a navegação.
    }
  }, [enabled]);

  useEffect(() => {
    void loadRoutine();
    window.addEventListener("nexus:routine-changed", loadRoutine);

    return () => {
      window.removeEventListener("nexus:routine-changed", loadRoutine);
    };
  }, [loadRoutine]);

  if (!enabled) return null;

  function openCommand() {
    window.dispatchEvent(new Event("nexus:command-open"));
  }

  function openNexus() {
    clickHidden(".nexus-dock-trigger");
  }

  function openReporter() {
    clickHidden(
      'button[aria-label="Registrar quebra na UX ou função"]',
    );
  }

  const tools = (
    <>
      <Link className="v458-utility-link primary" href="/nexus/foco">
        <Gauge size={14} />
        <span>Meu Dia</span>
      </Link>

      {canUseNexus && (
        <button
          className="v458-utility-link"
          type="button"
          onClick={openNexus}
        >
          <Bot size={14} />
          <span>Nexus</span>
        </button>
      )}

      <button
        className="v458-utility-link"
        type="button"
        onClick={openCommand}
      >
        <Command size={14} />
        <span>Comando</span>
        <kbd>Ctrl K</kbd>
      </button>

      <Link className="v458-utility-link" href="/nexus/rotinas">
        <Workflow size={14} />
        <span>Rotinas</span>
      </Link>

      <Link className="v458-utility-link" href="/nexus/qualidade">
        <ShieldCheck size={14} />
        <span>Qualidade</span>
      </Link>

      <button
        className="v458-utility-link danger"
        type="button"
        onClick={openReporter}
      >
        <Bug size={14} />
        <span>Relatar problema</span>
      </button>

      {activeRoutine?.current && (
        <Link
          className="v458-utility-link routine"
          href={activeRoutine.current.href}
          title={activeRoutine.title}
        >
          <Workflow size={14} />
          <span>
            Rotina · {activeRoutine.progress_percent}%
          </span>
          <small>
            {activeRoutine.current.label ||
              nexusRouteLabel(activeRoutine.current.href)}
          </small>
        </Link>
      )}
    </>
  );

  return (
    <div className="v458-utility-bar-wrap">
      <nav
        className="v458-utility-bar v458-utility-desktop"
        aria-label="Ferramentas rápidas"
      >
        <span className="v458-utility-title">Ferramentas</span>
        {tools}
      </nav>

      <details className="v458-utility-mobile">
        <summary>
          <span>
            <Bot size={14} />
            Ferramentas
          </span>
          <ChevronDown size={14} />
        </summary>
        <nav aria-label="Ferramentas rápidas">
          {tools}
        </nav>
      </details>
    </div>
  );
}
