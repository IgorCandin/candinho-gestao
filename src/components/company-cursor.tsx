"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function cursorPalette(pathname: string) {
  if (pathname.startsWith("/fitness") || pathname.startsWith("/catalogo/fitness")) return { accent: "#ec6fa9", glow: "rgba(236,111,169,.22)" };
  if (pathname.startsWith("/suplementos") || pathname.startsWith("/catalogo/suplementos") || ["/clientes", "/produtos", "/estoque", "/vendas", "/agenda", "/leads"].some((route) => pathname.startsWith(route))) return { accent: "#d8a32f", glow: "rgba(216,163,47,.22)" };
  if (pathname.startsWith("/bank")) return { accent: "#65b889", glow: "rgba(101,184,137,.2)" };
  return { accent: "#aeb6c2", glow: "rgba(174,182,194,.18)" };
}

export function CompanyCursor() {
  const pathname = usePathname();
  const palette = cursorPalette(pathname);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layer = layerRef.current;
    if (!enabled || !layer || typeof layer.showPopover !== "function") return;
    // A manual, non-interactive top-layer surface also stays above native dialogs.
    function raiseCursor() {
      if (!layer?.isConnected) return;
      if (layer.matches(":popover-open")) layer.hidePopover();
      layer.showPopover();
    }
    raiseCursor();
    const dialogs = new MutationObserver(records => {
      if (records.some(record => record.target instanceof HTMLDialogElement)) raiseCursor();
    });
    dialogs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let frame = 0;

    function animateRing() {
      ringX += (targetX - ringX) * .16;
      ringY += (targetY - ringY) * .16;
      ringRef.current?.style.setProperty("transform", `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`);
      frame = window.requestAnimationFrame(animateRing);
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { hide(); return; }
      document.body.classList.add("company-custom-cursor-active");
      targetX = event.clientX;
      targetY = event.clientY;
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`);
      ringRef.current?.classList.remove("is-hidden");
      dotRef.current?.classList.remove("is-hidden");
      const interactive = (event.target as Element | null)?.closest("a, button, input, select, textarea, summary, [role='button']");
      ringRef.current?.classList.toggle("is-interactive", Boolean(interactive));
      const operation = (event.target as Element | null)?.closest(".operation-supplements, .operation-fitness, [data-operation='supplements'], [data-operation='fitness']");
      const supplements = operation?.classList.contains("operation-supplements") || operation?.getAttribute("data-operation") === "supplements";
      const fitness = operation?.classList.contains("operation-fitness") || operation?.getAttribute("data-operation") === "fitness";
      const accent = supplements ? "#d8a32f" : fitness ? "#ec6fa9" : palette.accent;
      const glow = supplements ? "rgba(216,163,47,.22)" : fitness ? "rgba(236,111,169,.22)" : palette.glow;
      ringRef.current?.style.setProperty("--cursor-accent", accent);
      ringRef.current?.style.setProperty("--cursor-glow", glow);
      dotRef.current?.style.setProperty("--cursor-accent", accent);
      dotRef.current?.style.setProperty("--cursor-glow", glow);
    }
    function hide() {
      document.body.classList.remove("company-custom-cursor-active");
      ringRef.current?.classList.add("is-hidden");
      dotRef.current?.classList.add("is-hidden");
    }

    frame = window.requestAnimationFrame(animateRing);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", hide);
      window.cancelAnimationFrame(frame);
      dialogs.disconnect();
      if (layer.matches(":popover-open")) layer.hidePopover();
      document.body.classList.remove("company-custom-cursor-active");
    };
  }, [palette.accent, palette.glow, pathname]);

  return (
    <div className="company-cursor-layer" popover="manual" ref={layerRef} aria-hidden="true">
      <div className="company-cursor-ring is-hidden" ref={ringRef} aria-hidden="true" style={{ "--cursor-accent": palette.accent, "--cursor-glow": palette.glow } as React.CSSProperties}/>
      <div className="company-cursor-dot is-hidden" ref={dotRef} aria-hidden="true" style={{ "--cursor-accent": palette.accent, "--cursor-glow": palette.glow } as React.CSSProperties}/>
    </div>
  );
}
