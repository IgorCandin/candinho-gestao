"use client";

import { Fragment, useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./company-office-scene.css";

export type OfficeSignal = { label: string; count: number | null; href: string };
export type OfficeRoom = { name: string; color: string; signals: OfficeSignal[] };

function roomKind(name: string) { return name.startsWith("Company") ? "crm" : name === "Suplementos" ? "supp" : name === "Fitness" ? "fitness" : "bank"; }
const people = { crm: "Lia", supp: "Theo", fitness: "Bia", bank: "Davi" };

export function CompanyOfficeScene({ rooms, consulted }: { rooms: OfficeRoom[]; consulted: string }) {
  const [selection, setSelection] = useState(rooms[0]?.name ?? "");
  const [open, setOpen] = useState(true);
  const [refreshing, refresh] = useTransition();
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const selected = rooms.find(room => room.name === selection) ?? rooms[0];
  function choose(room: OfficeRoom, button: HTMLButtonElement) {
    trigger.current = button;
    setSelection(room.name); setOpen(true);
    if (window.matchMedia("(max-width:720px)").matches) requestAnimationFrame(() => panel.current?.scrollIntoView({ block: "nearest", behavior: "auto" }));
  }
  function close() { setOpen(false); trigger.current?.focus(); }
  return <main className="company-office-live" onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); close(); } }}><div className="co-shell">
    <header><Link href="/company/gestao">Voltar à Gestão</Link><h1>Escritório de operações</h1><p>Seu ponto de encontro com as pendências da Company.</p><button className="co-refresh" disabled={refreshing} onClick={() => refresh(() => router.refresh())}>{refreshing ? "Atualizando…" : "Atualizar pendências"}</button></header>
    {rooms.length ? <div className="co-body"><section className="co-world" aria-label="Escritório das operações autorizadas">
      <h2>Qual sala precisa de você?</h2><p className="co-help">Selecione um personagem para abrir as pendências reais.</p>
      <nav className="co-nav" aria-label="Escolher sala">{rooms.map(room => <button key={room.name} type="button" aria-pressed={selected?.name === room.name} onClick={event => choose(room, event.currentTarget)}>{room.name}</button>)}</nav>
      <div className="co-building" data-small={rooms.length <= 2}>{rooms.map((room, index) => {
        const kind = roomKind(room.name);
        const unknown = room.signals.some(signal => signal.count === null);
        const categories = room.signals.filter(signal => (signal.count ?? 0) > 0).length;
        const bubble = unknown ? "Conferir ?" : categories ? `${categories} ${categories === 1 ? "aviso" : "avisos"}` : "Tudo certo";
        return <Fragment key={room.name}>{index === 2 ? <div className="co-hall" aria-hidden="true">CANDINHO COMPANY</div> : null}<div className={`co-room ${kind === "fitness" ? "co-fitness" : kind === "bank" ? "co-bank" : ""}`} data-kind={kind} data-selected={selected?.name === room.name}>
          <span className="co-name">{room.name}</span><div className="co-rug" aria-hidden="true"/><div className="co-desk" aria-hidden="true"/>{kind === "fitness" ? <div className="co-rack" aria-hidden="true"/> : kind === "bank" ? <div className="co-safe" aria-hidden="true"/> : <div className="co-shelf" aria-hidden="true"/>}{kind === "supp" ? <div className="co-box" aria-hidden="true"/> : <div className="co-plant" aria-hidden="true"/>}
          <button type="button" className="co-agent" style={{ "--shirt": room.color } as CSSProperties} aria-label={`${people[kind]}, ${room.name}: ${bubble}. Abrir pendências`} aria-controls="office-live-panel" aria-expanded={open && selected?.name === room.name} onClick={event => choose(room, event.currentTarget)}><span className="co-bubble" aria-hidden="true">{bubble}</span><i className="co-head" aria-hidden="true"/><i className="co-shirt" aria-hidden="true"/><span className="co-agent-label" aria-hidden="true">{people[kind]}</span></button>
        </div></Fragment>;
      })}</div>
      <div className="co-status" aria-live="polite">{refreshing ? "Consultando novamente…" : `Consulta: ${consulted}.`}<small>Balões contam tipos de aviso, não pessoas nem peças. Resolva na origem e atualize para conferir.</small></div>
    </section><aside ref={panel} id="office-live-panel" className="co-panel" aria-label="Pendências da sala" hidden={!open}>
      {selected ? <><div className="co-panel-top"><div><h2>{selected.name}</h2><small>{people[roomKind(selected.name)]} · sinalizador da sala</small></div><button type="button" className="co-close" aria-label="Fechar painel de pendências" onClick={close}>×</button></div>
        {selected.signals.filter(signal => signal.count === null || signal.count > 0).map(signal => <article className="co-task" key={signal.label}><span className="co-priority">{signal.count === null ? "Consulta indisponível · tente atualizar" : `${signal.count} ${selected.name === "Bank" ? "compromisso(s)" : "registro(s)"} para conferir`}</span><h3>{signal.label}</h3><p>{selected.name.startsWith("Company") ? "Contagem por cadastro e operação; uma pessoa pode existir nas duas bases. A fila abre a lista de clientes." : selected.name === "Bank" ? "Agenda do mês atual; consulte a conta antes de qualquer pagamento." : "Vendas não canceladas aguardando entrega, não quantidade de peças."}</p><Link href={signal.href}>Abrir fila para resolver</Link></article>)}
        {selected.signals.every(signal => signal.count === 0) ? <p>Sem pendências nos indicadores consultados desta sala.</p> : null}
        <details className="co-history"><summary>O que este personagem faz?</summary><p>Sinaliza as filas consultadas. Não altera cadastros, compras ou pagamentos. Os históricos permanecem nas telas de origem.</p></details></> : null}
    </aside></div> : <p className="co-empty">Nenhuma operação disponível para seu acesso.</p>}
    <footer className="co-footer">Personagens representam filas, não agentes de IA em execução. Este escritório ainda não cobre todas as pendências do ERP.</footer>
    <div className="co-scene-links"><Link href="/company/mapa">Acompanhar roteiro da migração</Link><Link href="/company/compras">Compras e reposição</Link></div>
  </div></main>;
}
