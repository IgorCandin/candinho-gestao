"use client";

import { Keyboard, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { NexusPersonalShortcut, NexusPersonalWorkspace } from "@/lib/nexus-personal-types";

async function request(body: Record<string, unknown>) {
  const response = await fetch("/api/nexus/personal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await response.json()) as { id?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar o atalho.");
  return payload;
}

export function AddCurrentPageShortcut() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const save = async () => {
    setLoading(true); setMessage("");
    try {
      const label = document.title.replace(/\s*[|–-]\s*Candinho.*$/i, "") || pathname;
      const pinned = await request({ action: "pin", href: pathname, label, context_route: "*", source: "manual" });
      if (!pinned.id) throw new Error("O atalho não retornou uma identificação.");
      await request({ action: "slot", id: pinned.id, slot: Number(slot) });
      window.dispatchEvent(new Event("nexus:shortcuts-changed")); setOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setLoading(false); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)}><Plus size={15}/> Adicionar atalho</button>
    {open && typeof document !== "undefined" ? createPortal(<div className="shortcut-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="shortcut-modal" role="dialog" aria-modal="true" aria-label="Adicionar atalho"><button className="shortcut-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18}/></button><Keyboard size={22}/><span>ATALHO DA PÁGINA ATUAL</span><h2>Escolha a posição</h2><p>O mesmo atalho aparecerá aqui e no Nexus.</p><label><span>Alt +</span><select value={slot} onChange={(event) => setSlot(event.target.value)}>{[1,2,3,4].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>{message ? <small>{message}</small> : null}<button className="button company-blue" type="button" disabled={loading} onClick={() => void save()}>{loading ? <LoaderCircle className="spin"/> : null}Salvar atalho</button></section></div>, document.body) : null}
  </>;
}

export function ShortcutManagement() {
  const [rows, setRows] = useState<NexusPersonalShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/nexus/personal?route=/company/atalhos", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as NexusPersonalWorkspace & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar atalhos.");
      if (active) setRows(payload.pinned);
    }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Falha ao carregar atalhos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const remove = async (id: string) => { try { await request({ action: "unpin", id }); window.dispatchEvent(new Event("nexus:shortcuts-changed")); setRows((current) => current.filter((row) => row.id !== id)); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível remover."); } };
  return <section className="shortcut-management panel"><header><Keyboard/><div><span>GESTÃO · ATALHOS</span><h1>Atalhos do teclado</h1><p>Esta é a mesma lista usada pelo Nexus. Os quatro primeiros correspondem a Alt+1 até Alt+4.</p></div></header>{loading ? <p><LoaderCircle className="spin"/> Carregando atalhos do Nexus…</p> : <div>{rows.map((row,index) => <article key={row.id}><kbd>{index < 4 ? `Alt + ${index + 1}` : "Sem tecla"}</kbd><span><strong>{row.label}</strong><small>{row.href}</small></span><button type="button" onClick={() => void remove(row.id)} aria-label={`Remover ${row.label}`}><Trash2 size={17}/></button></article>)}</div>}{!loading && rows.length === 0 ? <p>Nenhum atalho cadastrado no Nexus.</p> : null}{message ? <p className="form-error visible">{message}</p> : null}</section>;
}
