"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function viewportClass() {
  if (typeof window === "undefined") return "unknown";
  if (window.innerWidth <= 720) return "mobile";
  if (window.innerWidth <= 1100) return "tablet";
  return "desktop";
}

function selectorHint(element: Element) {
  const html = element as HTMLElement;
  const tag = html.tagName?.toLowerCase() || "element";
  const id = html.id ? `#${html.id}` : "";
  const classes = Array.from(html.classList || [])
    .filter(Boolean)
    .slice(0, 3)
    .map((value) => `.${value}`)
    .join("");
  return `${tag}${id}${classes}`.slice(0, 120);
}

function sessionSeen(key: string) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSessionSeen(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Diagnóstico não deve interferir no ERP.
  }
}

async function sendSignal(
  pathname: string,
  signalType: "horizontal_overflow" | "fixed_clip" | "client_error",
  options: {
    overflowPx?: number | null;
    payload?: Record<string, unknown>;
    dedupeKey?: string;
  } = {},
) {
  if (typeof window === "undefined") return;

  const dedupe = [
    "candinho:ux-doctor",
    pathname,
    signalType,
    options.dedupeKey || "default",
    viewportClass(),
  ].join("|");

  if (sessionSeen(dedupe)) return;
  markSessionSeen(dedupe);

  try {
    await fetch("/api/nexus/ux-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        signal_type: signalType,
        route: pathname,
        viewport_class: viewportClass(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        overflow_px: options.overflowPx ?? null,
        payload: options.payload ?? {},
      }),
    });
  } catch {
    // A camada de diagnóstico nunca bloqueia a operação.
  }
}

function hasScrollableAncestor(element: Element) {
  let parent = element.parentElement;

  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowX = style.overflowX;
    if (
      overflowX === "auto" ||
      overflowX === "scroll" ||
      parent.scrollWidth > parent.clientWidth + 8
    ) {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

function inspectFixedClipping(pathname: string) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const elements = Array.from(document.body.querySelectorAll("*"))
    .filter((element) => {
      const html = element as HTMLElement;
      if (!html.offsetParent && window.getComputedStyle(html).position !== "fixed") {
        return false;
      }

      const style = window.getComputedStyle(html);
      if (style.visibility === "hidden" || Number(style.opacity || "1") <= 0.02) {
        return false;
      }

      return style.position === "fixed" || style.position === "sticky";
    })
    .slice(0, 500);

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.width > viewportWidth * 1.15 && rect.height > viewportHeight * 0.8) {
      continue;
    }
    if (hasScrollableAncestor(element)) continue;

    // Elementos inteiramente fora da viewport costumam estar em transição,
    // recolhidos ou simplesmente foram ultrapassados pelo scroll. Não são
    // quebra visual por si só.
    const intersectsViewport =
      rect.right > 0 &&
      rect.left < viewportWidth &&
      rect.bottom > 0 &&
      rect.top < viewportHeight;

    if (!intersectsViewport) continue;

    const horizontalOverflow = Math.max(
      0,
      -rect.left,
      rect.right - viewportWidth,
    );

    // Sticky acompanha o fluxo vertical da página. O V45.7 tratava qualquer
    // parte acima/abaixo da viewport como clipping e gerava falsos positivos
    // em sidebar, topbar, painel de venda e imagens de produto.
    const verticalOverflow =
      style.position === "fixed"
        ? Math.max(0, -rect.top, rect.bottom - viewportHeight)
        : 0;

    const overflow = Math.max(horizontalOverflow, verticalOverflow);

    if (overflow > 12) {
      const hint = selectorHint(element);
      void sendSignal(pathname, "fixed_clip", {
        overflowPx: Math.ceil(overflow),
        dedupeKey: hint,
        payload: {
          element: hint,
          position: style.position,
          horizontal_overflow: Math.ceil(horizontalOverflow),
          vertical_overflow: Math.ceil(verticalOverflow),
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        },
      });
      return;
    }
  }
}

function inspectLayout(pathname: string) {
  const root = document.documentElement;
  const body = document.body;
  const viewportWidth = window.innerWidth;
  const docWidth = Math.max(
    root.scrollWidth,
    root.offsetWidth,
    body?.scrollWidth ?? 0,
    body?.offsetWidth ?? 0,
  );

  const overflow = Math.max(0, Math.ceil(docWidth - viewportWidth));
  const visualScale = window.visualViewport?.scale ?? 1;
  const nonDefaultVisualScale = Math.abs(visualScale - 1) > 0.12;

  // Browser/pinch zoom altera a geometria observada. O objetivo do Doctor é
  // medir a interface em escala normal; caso contrário ele acaba atribuindo
  // ao ERP um overflow criado pelo próprio zoom do navegador.
  if (overflow > 8 && !nonDefaultVisualScale) {
    void sendSignal(pathname, "horizontal_overflow", {
      overflowPx: overflow,
      dedupeKey: `${Math.round(viewportWidth / 50) * 50}`,
      payload: {
        document_width: docWidth,
        viewport_width: viewportWidth,
        visual_viewport_width: window.visualViewport?.width ?? null,
        visual_viewport_scale: visualScale,
      },
    });
  }

  inspectFixedClipping(pathname);
}

export function NexusUxDoctorProbe({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname() || "/dashboard";

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let resizeTimer = 0;
    const timers = [
      window.setTimeout(() => inspectLayout(pathname), 550),
      window.setTimeout(() => inspectLayout(pathname), 1600),
    ];

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => inspectLayout(pathname), 450);
    };

    const onError = (event: ErrorEvent) => {
      const message = [event.message, event.filename, event.lineno]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 700);

      void sendSignal(pathname, "client_error", {
        dedupeKey: message.slice(0, 120),
        payload: {
          message,
          filename: event.filename || null,
          line: event.lineno || null,
          column: event.colno || null,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Promise rejeitada sem mensagem.";

      void sendSignal(pathname, "client_error", {
        dedupeKey: message.slice(0, 120),
        payload: {
          message: message.slice(0, 700),
          source: "unhandledrejection",
        },
      });
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [enabled, pathname]);

  return null;
}
