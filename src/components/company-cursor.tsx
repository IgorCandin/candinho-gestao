"use client";

import { useEffect, useRef } from "react";

export function CompanyCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!enabled) return;
    document.body.classList.add("company-custom-cursor-active");

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
      targetX = event.clientX;
      targetY = event.clientY;
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`);
      ringRef.current?.classList.remove("is-hidden");
      dotRef.current?.classList.remove("is-hidden");
      const interactive = (event.target as Element | null)?.closest("a, button, input, select, textarea, summary, [role='button']");
      ringRef.current?.classList.toggle("is-interactive", Boolean(interactive));
    }
    function hide() {
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
      document.body.classList.remove("company-custom-cursor-active");
    };
  }, []);

  return (
    <>
      <div className="company-cursor-ring is-hidden" ref={ringRef} aria-hidden="true" />
      <div className="company-cursor-dot is-hidden" ref={dotRef} aria-hidden="true" />
    </>
  );
}
