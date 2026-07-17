"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type NavTarget = { href: string; label?: string } | null;

export function EntitySwipeNavigator({ previous, next }: { previous: NavTarget; next: NavTarget }) {
  const router = useRouter();

  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;
    let blocked = false;
    const shouldBlock = (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target : null;
      return Boolean(el?.closest("input, textarea, select, button, a, [contenteditable='true'], .table-wrap, .product-gallery-controls, .mobile-menu"));
    };
    const onStart = (event: TouchEvent) => {
      blocked = shouldBlock(event.target);
      if (blocked || event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };
    const onEnd = (event: TouchEvent) => {
      if (blocked || startX == null || startY == null || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      startX = null; startY = null;
      if (Math.abs(dx) < 75 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      if (dx < 0 && next) router.push(next.href);
      if (dx > 0 && previous) router.push(previous.href);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [next, previous, router]);

  if (!previous && !next) return null;
  return (
    <div className="entity-swipe-zone">
      <button type="button" disabled={!previous} onClick={() => previous && router.push(previous.href)} aria-label="Registro anterior"><ChevronLeft size={17}/><span>Anterior</span></button>
      <div><strong>Swipe lateral ativo</strong><span>Deslize a página para trocar de registro sem voltar à lista.</span></div>
      <button type="button" disabled={!next} onClick={() => next && router.push(next.href)} aria-label="Próximo registro"><span>Próximo</span><ChevronRight size={17}/></button>
    </div>
  );
}
