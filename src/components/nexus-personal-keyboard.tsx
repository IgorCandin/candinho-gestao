"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { companyDestination } from "@/lib/company-destination";
import type {
  NexusPersonalShortcut,
  NexusPersonalWorkspace,
} from "@/lib/nexus-personal-types";

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;

  const tag = element.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    element.isContentEditable
  );
}

function navigationHref(pathname: string, href: string) {
  if (pathname !== "/company" && !pathname.startsWith("/company/")) return href;
  // Do not turn a saved lead-registration shortcut into a sale.
  if (/^\/(?:suplementos\/)?leads\/novo(?:[?#]|$)/.test(href)) return href;
  return companyDestination(href);
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
    // Atalho deve navegar mesmo se a telemetria falhar.
  }
}

export function NexusPersonalKeyboard({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState<NexusPersonalShortcut[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch(
        `/api/nexus/personal?route=${encodeURIComponent(pathname)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;

      const payload = (await response.json()) as NexusPersonalWorkspace;
      setShortcuts(payload.pinned.slice(0, 4));
    } catch {
      // Personalização nunca interrompe o ERP.
    }
  }, [enabled, pathname]);

  useEffect(() => {
    void load();
    window.addEventListener("nexus:shortcuts-changed", load);

    return () => {
      window.removeEventListener("nexus:shortcuts-changed", load);
    };
  }, [load]);

  useEffect(() => {
    if (!enabled) return;

    function onKey(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (isTypingTarget(event.target)) return;

      const slot = Number(event.key);
      if (!Number.isInteger(slot) || slot < 1 || slot > 4) return;

      const shortcut = shortcuts[slot - 1];
      if (!shortcut) return;

      event.preventDefault();
      void recordUse(shortcut.id);
      router.push(navigationHref(pathname, shortcut.href));
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, pathname, router, shortcuts]);

  return null;
}
