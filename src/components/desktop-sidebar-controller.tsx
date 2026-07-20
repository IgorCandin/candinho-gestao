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

  const [footerTarget, setFooterTarget] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === "1",
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    const apply = () => {
      const shell =
        document.querySelector(
          ".app-shell",
        );

      if (!shell) return;

      shell.classList.toggle(
        "sidebar-collapsed",
        collapsed,
      );
    };

    const frame =
      window.requestAnimationFrame(
        apply,
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [collapsed, pathname]);

  useEffect(() => {
    if (!hydrated) return;

    const resolveFooter = () => {
      setFooterTarget(
        document.querySelector(
          ".sidebar-footer",
        ) as HTMLElement | null,
      );
    };

    const frame =
      window.requestAnimationFrame(
        resolveFooter,
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [hydrated, pathname, collapsed]);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;

      window.localStorage.setItem(
        STORAGE_KEY,
        next ? "1" : "0",
      );

      return next;
    });
  }

  const hidden =
    pathname === "/dashboard";

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
