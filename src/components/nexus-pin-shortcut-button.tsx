"use client";

import { LoaderCircle, Pin, PinOff } from "lucide-react";
import { useState } from "react";
import { nexusOperationForHref } from "@/lib/nexus-shortcut-utils";

export function NexusPinShortcutButton({
  href,
  label,
  contextRoute = "*",
  source = "manual",
  initialShortcutId = null,
  compact = true,
  onChanged,
}: {
  href: string;
  label: string;
  contextRoute?: string;
  source?: "manual" | "learned" | "workflow" | "command";
  initialShortcutId?: string | null;
  compact?: boolean;
  onChanged?: (id: string | null) => void;
}) {
  const [shortcutId, setShortcutId] = useState<string | null>(
    initialShortcutId,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          shortcutId
            ? { action: "unpin", id: shortcutId }
            : {
                action: "pin",
                href,
                label,
                operation_scope: nexusOperationForHref(href),
                context_route: contextRoute,
                source,
              },
        ),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível alterar o atalho.");
      }

      const nextId = shortcutId ? null : payload.id ?? null;
      setShortcutId(nextId);
      onChanged?.(nextId);
      window.dispatchEvent(new Event("nexus:shortcuts-changed"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível alterar o atalho.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="nexus-pin-wrap-v455">
      <button
        className={`button ghost ${compact ? "compact-button" : ""} nexus-pin-button-v455 ${shortcutId ? "pinned" : ""}`}
        type="button"
        data-nexus-action={shortcutId ? "unpin_shortcut" : "pin_shortcut"}
        data-nexus-component="nexus_personal"
        disabled={loading}
        onClick={() => void toggle()}
        title={shortcutId ? "Remover dos meus atalhos" : "Fixar nos meus atalhos"}
      >
        {loading ? (
          <LoaderCircle className="spin" size={12} />
        ) : shortcutId ? (
          <PinOff size={12} />
        ) : (
          <Pin size={12} />
        )}
        {shortcutId ? "Fixado" : "Fixar"}
      </button>
      {error && <small className="nexus-pin-error-v455">{error}</small>}
    </span>
  );
}
