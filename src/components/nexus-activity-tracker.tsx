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
    // Telemetria nunca deve interromper o trabalho da operação.
  }
}

export function NexusActivityTracker({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const previousRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !pathname) return;

    const previous = previousRef.current;
    previousRef.current = pathname;

    void send({
      route: pathname,
      previous_route: previous,
      action_kind: "page_view",
      session_id: sessionId(),
      metadata: { viewport: viewport() },
    });
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (!url.pathname.startsWith("/")) return;

        void send({
          route: window.location.pathname,
          target_route: url.pathname,
          action_kind: "navigation_click",
          session_id: sessionId(),
          metadata: {
            viewport: viewport(),
            source: "internal_link",
          },
        });
      } catch {
        // Ignora links não navegáveis.
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

  return null;
}
