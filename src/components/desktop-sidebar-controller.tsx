"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "candinho:desktop-sidebar-collapsed";

const DESKTOP_QUERY = "(min-width: 821px)";

export function DesktopSidebarController({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] =
    useState(false);

  const [hydrated, setHydrated] =
    useState(false);

  const [isDesktop, setIsDesktop] =
    useState(false);

  const [hasShell, setHasShell] =
    useState(false);

  const [footerTarget, setFooterTarget] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const syncViewport = () => {
      setIsDesktop(media.matches);
    };

    syncViewport();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncViewport);
    } else {
      media.addListener(syncViewport);
    }

    try {
      setCollapsed(
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === "1",
      );
    } finally {
      setHydrated(true);
    }

    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", syncViewport);
      } else {
        media.removeListener(syncViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const syncShell = () => {
      const shell = document.querySelector<HTMLElement>(
        ".app-shell",
      );

      setHasShell(Boolean(shell));

      if (!shell) {
        setFooterTarget(null);
        return;
      }

      shell.classList.toggle(
        "sidebar-collapsed",
        collapsed,
      );

      setFooterTarget(
        shell.querySelector<HTMLElement>(
          ".sidebar-footer",
        ),
      );
    };

    const frame = window.requestAnimationFrame(syncShell);
    const timer = window.setTimeout(syncShell, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [collapsed, hydrated, isDesktop, pathname]);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          next ? "1" : "0",
        );
      } catch {
        // Falha de storage não pode quebrar a navegação.
      }

      return next;
    });
  }

  const hidden =
    pathname === "/dashboard" ||
    pathname === "/promocoes" ||
    pathname.startsWith("/promocoes/");

  const toggleButton = (
    inline: boolean,
  ) => (
    <button
      className={`desktop-sidebar-toggle ${
        collapsed
          ? "is-collapsed"
          : ""
      } ${
        inline
          ? "sidebar-inline-toggle"
          : ""
      }`}
      type="button"
      aria-label={
        collapsed
          ? "Abrir menu lateral"
          : "Fechar menu lateral"
      }
      title={
        collapsed
          ? "Abrir menu lateral"
          : "Fechar menu lateral"
      }
      aria-pressed={collapsed}
      onClick={toggle}
    >
      {collapsed ? (
        <PanelLeftOpen size={18} />
      ) : (
        <PanelLeftClose size={18} />
      )}
    </button>
  );

  return (
    <>
      {children}

      {!hidden &&
        hydrated &&
        isDesktop &&
        hasShell &&
        (collapsed
          ? toggleButton(false)
          : footerTarget
            ? createPortal(
                toggleButton(true),
                footerTarget,
              )
            : null)}
    </>
  );
}
