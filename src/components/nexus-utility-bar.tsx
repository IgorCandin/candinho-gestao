"use client";

import Link from "next/link";
import {
  Bot,
  Bug,
  ChevronDown,
  Command,
  Gauge,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { NexusActiveRoutine } from "@/lib/nexus-routine-types";
import { nexusRouteLabel } from "@/lib/nexus-route-labels";

function clickHidden(selector: string) {
  document.querySelector<HTMLButtonElement>(selector)?.click();
}

function closeMobileMenu() {
  document
    .querySelector<HTMLDetailsElement>("details.mobile-menu")
    ?.removeAttribute("open");
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
  const [desktopHost, setDesktopHost] =
    useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] =
    useState<HTMLElement | null>(null);

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
      // Ferramentas globais nunca devem bloquear o ERP.
    }
  }, [enabled]);

  useEffect(() => {
    void loadRoutine();
    window.addEventListener("nexus:routine-changed", loadRoutine);

    return () => {
      window.removeEventListener("nexus:routine-changed", loadRoutine);
    };
  }, [loadRoutine]);

  useEffect(() => {
    if (!enabled) return;

    let desktop: HTMLDivElement | null = null;
    let mobile: HTMLDivElement | null = null;

    function attach() {
      if (!desktop) {
        const sidebarFooter =
          document.querySelector<HTMLElement>(".sidebar-footer");

        if (sidebarFooter?.parentElement) {
          desktop = document.createElement("div");
          desktop.className =
            "v4511-tools-host v4511-tools-host-desktop";
          desktop.dataset.v4511Tools = "desktop";

          sidebarFooter.parentElement.insertBefore(
            desktop,
            sidebarFooter,
          );

          setDesktopHost(desktop);
        }
      }

      if (!mobile) {
        const mobilePanel =
          document.querySelector<HTMLElement>(".mobile-menu-panel");

        if (mobilePanel) {
          mobile = document.createElement("div");
          mobile.className =
            "v4511-tools-host v4511-tools-host-mobile";
          mobile.dataset.v4511Tools = "mobile";

          const signout = mobilePanel.querySelector("form");
          mobilePanel.insertBefore(mobile, signout ?? null);

          setMobileHost(mobile);
        }
      }

      return Boolean(desktop && mobile);
    }

    attach();

    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      desktop?.remove();
      mobile?.remove();
      setDesktopHost(null);
      setMobileHost(null);
    };
  }, [enabled]);

  if (!enabled) return null;

  function openCommand() {
    window.dispatchEvent(new Event("nexus:command-open"));
    closeMobileMenu();
  }

  function openNexus() {
    clickHidden(".nexus-dock-trigger");
    closeMobileMenu();
  }

  function openReporter() {
    clickHidden(
      'button[aria-label="Registrar quebra na UX ou função"]',
    );
    closeMobileMenu();
  }

  function tools(mobile = false) {
    const itemClass = mobile
      ? "v4511-tool-item v4511-tool-item-mobile"
      : "v4511-tool-item";

    return (
      <>
        <Link
          className={`${itemClass} primary`}
          href="/nexus/foco"
          onClick={mobile ? closeMobileMenu : undefined}
        >
          <Gauge size={16} />
          <span>
            <strong>Meu Dia</strong>
            <small>Prioridades pessoais</small>
          </span>
        </Link>

        {canUseNexus && (
          <button
            className={itemClass}
            type="button"
            onClick={openNexus}
          >
            <Bot size={16} />
            <span>
              <strong>Nexus</strong>
              <small>Assistente operacional</small>
            </span>
          </button>
        )}

        <button
          className={itemClass}
          type="button"
          onClick={openCommand}
        >
          <Command size={16} />
          <span>
            <strong>Comando</strong>
            <small>Busca e navegação rápida</small>
          </span>
          {!mobile && <kbd>Ctrl K</kbd>}
        </button>

        <Link
          className={itemClass}
          href="/nexus/rotinas"
          onClick={mobile ? closeMobileMenu : undefined}
        >
          <Workflow size={16} />
          <span>
            <strong>Rotinas</strong>
            <small>Fluxos guiados</small>
          </span>
        </Link>

        <Link
          className={itemClass}
          href="/nexus/qualidade"
          onClick={mobile ? closeMobileMenu : undefined}
        >
          <ShieldCheck size={16} />
          <span>
            <strong>Qualidade</strong>
            <small>UX Doctor</small>
          </span>
        </Link>

        <button
          className={`${itemClass} danger`}
          type="button"
          onClick={openReporter}
        >
          <Bug size={16} />
          <span>
            <strong>Relatar problema</strong>
            <small>Registrar uma quebra</small>
          </span>
        </button>
      </>
    );
  }

  const desktopPortal =
    desktopHost &&
    createPortal(
      <details className="v4511-tools-details">
        <summary>
          <span className="v4511-tools-summary-main">
            <Sparkles size={15} />
            <strong>Ferramentas</strong>
          </span>

          <span className="v4511-tools-summary-side">
            {activeRoutine?.current && (
              <small>{activeRoutine.progress_percent}%</small>
            )}
            <ChevronDown size={14} />
          </span>
        </summary>

        <div className="v4511-tools-panel">
          {activeRoutine?.current && (
            <Link
              className="v4511-active-routine"
              href={activeRoutine.current.href}
            >
              <Workflow size={15} />
              <span>
                <strong>
                  Rotina · {activeRoutine.progress_percent}%
                </strong>
                <small>
                  {activeRoutine.current.label ||
                    nexusRouteLabel(activeRoutine.current.href)}
                </small>
              </span>
            </Link>
          )}

          {tools(false)}
        </div>
      </details>,
      desktopHost,
    );

  const mobilePortal =
    mobileHost &&
    createPortal(
      <details className="v4511-mobile-tools">
        <summary>
          <span>
            <Sparkles size={18} />
            Ferramentas
          </span>

          <span className="v4511-mobile-tools-side">
            {activeRoutine?.current && (
              <small>{activeRoutine.progress_percent}%</small>
            )}
            <ChevronDown size={16} />
          </span>
        </summary>

        <div className="v4511-mobile-tools-panel">
          {activeRoutine?.current && (
            <Link
              className="v4511-active-routine mobile"
              href={activeRoutine.current.href}
              onClick={closeMobileMenu}
            >
              <Workflow size={17} />
              <span>
                <strong>
                  Rotina ativa · {activeRoutine.progress_percent}%
                </strong>
                <small>
                  {activeRoutine.current.label ||
                    nexusRouteLabel(activeRoutine.current.href)}
                </small>
              </span>
            </Link>
          )}

          {tools(true)}
        </div>
      </details>,
      mobileHost,
    );

  return (
    <>
      {desktopPortal}
      {mobilePortal}
    </>
  );
}
