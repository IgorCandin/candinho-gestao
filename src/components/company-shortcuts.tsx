"use client";

import { Keyboard, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Shortcut = { key: string; href: string; label: string };
const STORAGE_KEY = "candinho-company-shortcuts-v1";
const DEFAULTS: Shortcut[] = [{ key: "4", href: "/bank", label: "Candinho Bank" }];

function readShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return Array.isArray(parsed) ? parsed : DEFAULTS;
  } catch { return DEFAULTS; }
}

function writeShortcuts(rows: Shortcut[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event("candinho-shortcuts-change"));
}

export function CompanyShortcutListener() {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!event.altKey || event.ctrlKey || event.metaKey || target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const row = readShortcuts().find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (!row) return;
      event.preventDefault();
      router.push(row.href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}

export function AddCurrentPageShortcut() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("4");
  const save = () => {
    const clean = key.trim().slice(-1).toUpperCase();
    if (!/^[A-Z0-9]$/.test(clean)) return;
    const label = document.title.replace(/\s*[|–-]\s*Candinho.*$/i, "") || pathname;
    writeShortcuts([...readShortcuts().filter((row) => row.key !== clean), { key: clean, href: pathname, label }]);
    setOpen(false);
  };
  return <>
    <button type="button" onClick={() => setOpen(true)}><Plus size={15}/> Adicionar atalho</button>
    {open ? <div className="shortcut-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="shortcut-modal" role="dialog" aria-modal="true" aria-label="Adicionar atalho">
        <button className="shortcut-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18}/></button>
        <Keyboard size={22}/><span>ATALHO DA PÁGINA ATUAL</span><h2>Escolha uma tecla</h2><p>Este atalho abrirá <strong>{pathname}</strong> neste navegador.</p>
        <label><span>Alt +</span><input value={key} maxLength={1} onChange={(event) => setKey(event.target.value.replace(/[^a-z0-9]/gi, ""))} autoFocus/></label>
        <button className="button company-blue" type="button" onClick={save}>Salvar atalho</button>
      </section>
    </div> : null}
  </>;
}

export function ShortcutManagement() {
  const [rows, setRows] = useState<Shortcut[]>(DEFAULTS);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setRows(readShortcuts()));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const remove = (key: string) => { const next = rows.filter((row) => row.key !== key); setRows(next); writeShortcuts(next); };
  return <section className="shortcut-management panel"><header><Keyboard/><div><span>GESTÃO · ATALHOS</span><h1>Atalhos do teclado</h1><p>Cadastre novas páginas pelo perfil de cada operação.</p></div></header>
    <div>{rows.map((row) => <article key={row.key}><kbd>Alt + {row.key}</kbd><span><strong>{row.label}</strong><small>{row.href}</small></span><button type="button" onClick={() => remove(row.key)} aria-label={`Remover Alt + ${row.key}`}><Trash2 size={17}/></button></article>)}</div>
    {rows.length === 0 ? <p>Nenhum atalho cadastrado. Abra uma página e use “Adicionar atalho” no perfil.</p> : null}
  </section>;
}
