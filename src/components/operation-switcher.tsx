"use client";

import Link from "next/link";
import { Dumbbell, Home, Landmark, LayoutGrid, Store, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type Operation = "company" | "bank" | "atletas";

const subscribeToClient = () => () => undefined;

const destinations = [
  { id: "vitrine", href: "/catalogo", label: "Vitrine", note: "Catálogo público", icon: Store },
  { id: "company", href: "/company/inicio", label: "Company", note: "ERP 2.0", icon: Home },
  { id: "bank", href: "/bank/inicio", label: "Bank", note: "Financeiro", icon: Landmark },
  { id: "atletas", href: "/atletas/inicio", label: "Atletas", note: "Treinos e fichas", icon: Dumbbell },
  { id: "legacy", href: "/dashboard", label: "Operações 1.0", note: "ERP antigo", icon: LayoutGrid },
] as const;

export function OperationSwitcher({ current, compact = false }: { current: Operation; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const dialog = open ? <div className="operation-switcher-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section className="operation-switcher-dialog" role="dialog" aria-modal="true" aria-label="Áreas da Candinho">
      <header><div><small>ERP CANDINHO</small><h2>Para onde vamos?</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X/></button></header>
      <div className="operation-switcher-grid">{destinations.filter((item) => item.id !== current).map(({ href, label, note, icon: Icon }) => <Link href={href} key={href} onClick={() => setOpen(false)}><Icon/><span><strong>{label}</strong><small>{note}</small></span></Link>)}</div>
    </section>
  </div> : null;
  return <>
    <button className={compact ? "operation-switcher-trigger compact" : "operation-switcher-trigger"} type="button" onClick={() => setOpen(true)}>
      <LayoutGrid size={15}/><span>{compact ? "Navegar" : "Áreas da Candinho"}</span>
    </button>
    {mounted && dialog ? createPortal(dialog, document.body) : null}
  </>;
}
