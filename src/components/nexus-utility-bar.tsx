"use client";

import Link from "next/link";
import {
  Bug,
  ChevronDown,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function closeMobileMenu() {
  document
    .querySelector<HTMLDetailsElement>("details.mobile-menu")
    ?.removeAttribute("open");
}

function openReporter() {
  document
    .querySelector<HTMLButtonElement>(
      'button[aria-label="Registrar quebra na UX ou função"]',
    )
    ?.click();

  closeMobileMenu();
}

export function NexusUtilityBar({
  enabled = true,
}: {
  enabled?: boolean;
  canUseNexus?: boolean;
}) {
  const [desktopHost, setDesktopHost] =
    useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] =
    useState<HTMLElement | null>(null);

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

  function tools(mobile = false) {
    const itemClass = mobile
      ? "v4511-tool-item v4511-tool-item-mobile"
      : "v4511-tool-item";

    return (
      <>
        <Link
          className={`${itemClass} primary`}
          href="/central/meu-dia"
          onClick={mobile ? closeMobileMenu : undefined}
        >
          <Gauge size={16} />
          <span>
            <strong>Meu Dia</strong>
            <small>Nexus, comando, rotinas e prioridades</small>
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
            <small>Saúde e consistência do ERP</small>
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
            <small>Registrar uma quebra para revisar</small>
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
            <ChevronDown size={14} />
          </span>
        </summary>

        <div className="v4511-tools-panel">
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
            <ChevronDown size={16} />
          </span>
        </summary>

        <div className="v4511-mobile-tools-panel">
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
