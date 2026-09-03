"use client";

import Link from "next/link";
import { Boxes, CalendarDays, CircleDollarSign, ContactRound, ShoppingBag, Truck } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef } from "react";

const ACTIONS = [
  { href: "/company/vender", title: "Vender agora", note: "Recompras, leads quentes e oportunidades", icon: ShoppingBag },
  { href: "/company/receber", title: "Receber dinheiro", note: "Cobranças, vencimentos e acordos", icon: CircleDollarSign },
  { href: "/company/acompanhar", title: "Atender e acompanhar", note: "Pós-venda e retornos combinados", icon: ContactRound },
  { href: "/company/entregar", title: "Entregar", note: "Pedidos, retiradas e rotas", icon: Truck },
  { href: "/company/compras", title: "Comprar e repor", note: "Grupos equivalentes e pedidos", icon: Boxes },
  { href: "/company/dia", title: "Organizar o dia", note: "Agenda e prioridades da empresa", icon: CalendarDays },
];

type MotionStyle = CSSProperties & Record<`--${string}`, string | number>;

export function CompanyActionGrid() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supportsMotion = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!supportsMotion) return;

    let frame = 0;
    let x = -100;
    let y = -100;
    function paintCursor() {
      cursorRef.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`);
      cursorDotRef.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`);
      frame = 0;
    }
    function onPointerMove(event: PointerEvent) {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintCursor);
      cursorRef.current?.classList.remove("is-hidden");
      const interactive = (event.target as Element | null)?.closest("a, button, .company-action-card");
      cursorRef.current?.classList.toggle("is-interactive", Boolean(interactive));
    }
    function onPointerLeave() { cursorRef.current?.classList.add("is-hidden"); }
    function onPointerEnter() { cursorRef.current?.classList.remove("is-hidden"); }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    document.documentElement.addEventListener("mouseenter", onPointerEnter);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      document.documentElement.removeEventListener("mouseenter", onPointerEnter);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function moveCard(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType === "touch") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - .5) * 8;
    const rotateX = (.5 - (y / rect.height)) * 7;
    card.style.setProperty("--card-rx", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--card-ry", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--pointer-x", `${x.toFixed(0)}px`);
    card.style.setProperty("--pointer-y", `${y.toFixed(0)}px`);
  }

  function resetCard(event: { currentTarget: HTMLAnchorElement }) {
    event.currentTarget.style.setProperty("--card-rx", "0deg");
    event.currentTarget.style.setProperty("--card-ry", "0deg");
  }

  return (
    <>
      <section className="company-action-grid">
        {ACTIONS.map(({ href, title, note, icon: Icon }, index) => (
          <Link
            href={href}
            className={index === 0 ? "company-action-card primary" : "company-action-card"}
            key={href}
            style={{ "--company-index": index } as MotionStyle}
            onPointerMove={moveCard}
            onPointerLeave={resetCard}
            onBlur={resetCard}
            onAnimationEnd={(event) => event.currentTarget.classList.add("motion-ready")}
          >
            <span><Icon size={24} /></span>
            <div><small>0{index + 1}</small><h2>{title}</h2><p>{note}</p></div>
            <b>↗</b>
          </Link>
        ))}
      </section>
      <div className="company-cursor-ring is-hidden" ref={cursorRef} aria-hidden="true" />
      <div className="company-cursor-dot" ref={cursorDotRef} aria-hidden="true" style={{ transform: "translate3d(-100px, -100px, 0)" }} />
    </>
  );
}
