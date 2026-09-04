"use client";

import Link from "next/link";
import { Boxes, CalendarDays, CircleDollarSign, ContactRound, PackageSearch, ShoppingBag } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

const ACTIONS = [
  { href: "/company/vender", title: "Vender agora", note: "Recompras, leads quentes e oportunidades", icon: ShoppingBag },
  { href: "/company/concluir", title: "Concluir vendas", note: "Recebimentos, entregas e pendências", icon: CircleDollarSign },
  { href: "/company/acompanhar", title: "Atender e acompanhar", note: "Pós-venda e retornos combinados", icon: ContactRound },
  { href: "/company/produtos", title: "Produtos", note: "Disponibilidade, preços e catálogo", icon: PackageSearch },
  { href: "/company/compras", title: "Comprar e repor", note: "Grupos equivalentes e pedidos", icon: Boxes },
  { href: "/company/dia", title: "Organizar o dia", note: "Agenda e prioridades da empresa", icon: CalendarDays },
];

type MotionStyle = CSSProperties & Record<`--${string}`, string | number>;

export function CompanyActionGrid() {
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
    </>
  );
}
