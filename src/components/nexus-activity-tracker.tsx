"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function viewport() {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth <= 720) return "mobile";
  if (window.innerWidth <= 1100) return "tablet";
  return "desktop";
}

function sessionId() {
  if (typeof window === "undefined") return "";

  const key = "candinho:nexus-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const next =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

async function send(payload: Record<string, unknown>) {
  try {
    await fetch("/api/nexus/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Telemetria nunca interrompe a operação.
  }
}

export function NexusActivityTracker({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const currentRouteRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !pathname) return;

    const previous = currentRouteRef.current;
    const now = Date.now();

    if (previous && previous !== pathname) {
      void send({
        route: previous,
        target_route: pathname,
        action_kind: "route_exit",
        action_key: "route_exit",
        session_id: sessionId(),
        metadata: {
          viewport: viewport(),
          duration_ms: Math.max(0, now - startedAtRef.current),
          source: "route_change",
        },
      });
    }

    currentRouteRef.current = pathname;
    startedAtRef.current = now;

    void send({
      route: pathname,
      previous_route: previous,
      action_kind: "page_view",
      action_key: "page_view",
      session_id: sessionId(),
      metadata: { viewport: viewport() },
    });
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor) {
        try {
          const url = new URL(anchor.href, window.location.href);
          if (url.origin === window.location.origin && url.pathname.startsWith("/")) {
            void send({
              route: window.location.pathname,
              target_route: url.pathname,
              action_kind: "navigation_click",
              action_key: url.pathname,
              session_id: sessionId(),
              metadata: {
                viewport: viewport(),
                source: "internal_link",
              },
            });
          }
        } catch {
          // Link inválido não gera evento.
        }
      }

      const button = target.closest(
        "button[data-nexus-action]",
      ) as HTMLButtonElement | null;

      if (button?.dataset.nexusAction) {
        void send({
          route: window.location.pathname,
          action_kind: "action_click",
          action_key: button.dataset.nexusAction.slice(0, 120),
          session_id: sessionId(),
          metadata: {
            viewport: viewport(),
            source: "explicit_action",
            component: button.dataset.nexusComponent?.slice(0, 120),
          },
        });
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      const key = form?.dataset.nexusForm;
      if (!key) return;

      void send({
        route: window.location.pathname,
        action_kind: "form_submit",
        action_key: key.slice(0, 120),
        session_id: sessionId(),
        metadata: {
          viewport: viewport(),
          source: "explicit_form",
        },
      });
    };

    const onPageHide = () => {
      const route = currentRouteRef.current;
      if (!route) return;

      void send({
        route,
        action_kind: "route_exit",
        action_key: "route_exit",
        session_id: sessionId(),
        metadata: {
          viewport: viewport(),
          duration_ms: Math.max(0, Date.now() - startedAtRef.current),
          source: "page_hide",
        },
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled]);

  return null;
}
