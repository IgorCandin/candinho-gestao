"use client";

import { Fragment, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./company-office-scene.css";

export type OfficeSignal = { label: string; count: number | null; href: string; kind?: "attention" | "opportunity" | "agenda"; description?: string };
export type OfficeRoom = { name: string; color: string; signals: OfficeSignal[]; unmonitored?: string[] };
function roomKind(name: string) { return name.startsWith("Company") ? "crm" : name === "Suplementos" ? "supp" : name === "Fitness" ? "fitness" : "bank"; }
const people = { crm: "Lia", supp: "Theo", fitness: "Bia", bank: "Davi" };
const signalKind = { attention: "Atenção", opportunity: "Oportunidade", agenda: "Agenda" };

export function CompanyOfficeScene({ rooms, consulted }: { rooms: OfficeRoom[]; consulted: string }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [refreshing, refresh] = useTransition();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringFocus = useRef(false);
  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);
  const router = useRouter();
  function cancelDismiss() { if (dismissTimer.current) clearTimeout(dismissTimer.current); }
  function preview(name: string) { cancelDismiss(); if (!pinned) setSelection(name); }
  function dismiss() { cancelDismiss(); dismissTimer.current = setTimeout(() => { if (!pinned) setSelection(null); }, 180); }
  function close() { cancelDismiss(); setSelection(null); setPinned(false); restoringFocus.current = true; trigger.current?.focus(); restoringFocus.current = false; }
  const activeSignals = rooms.flatMap(room => room.signals).filter(signal => (signal.count ?? 0) > 0);
  const unavailable = rooms.flatMap(room => room.signals).filter(signal => signal.count === null).length;
  return <main className="company-office-live" onKeyDown={event => { if (event.key === "Escape" && selection) { event.preventDefault(); close(); } }}>
    <div className="co-shell">
      <header className="co-header"><div><Link href="/company/gestao">Voltar à Gestão</Link><h1>Sala do dono</h1><p>A empresa inteira no seu campo de visão.</p></div><button className="co-refresh" disabled={refreshing} onClick={() => refresh(() => router.refresh())}>{refreshing ? "Atualizando…" : "Atualizar pendências"}</button></header>
      {rooms.length ? <section className="co-world" aria-label="Escritório das operações autorizadas">
        <div className="co-overview"><p><strong>{activeSignals.length} filas com avisos</strong> nas operações do seu acesso{unavailable ? ` · ${unavailable} consultas indisponíveis` : ""}</p><p className="co-help">Passe o mouse ou use Tab nos personagens. Clique para fixar o aviso e role para explorar.</p></div>
        <div className="co-building" data-small={rooms.length <= 2}>{rooms.map((room, index) => {
          const kind = roomKind(room.name);
          const unknown = room.signals.some(signal => signal.count === null);
          const signals = room.signals.filter(signal => signal.count === null || signal.count > 0);
          const categories = signals.filter(signal => signal.count !== null).length;
          const bubble = unknown ? `${categories} avisos · conferir ?` : categories ? `${categories} ${categories === 1 ? "aviso" : "avisos"}` : "Sem avisos consultados";
          const expanded = selection === room.name;
          const panelId = `office-room-${kind}`;
          return <Fragment key={room.name}>{index === 2 ? <div className="co-hall" aria-hidden="true"><span>Sala do dono</span></div> : null}
            <div className={`co-room ${kind === "fitness" ? "co-fitness" : kind === "bank" ? "co-bank" : ""}`} data-kind={kind} data-selected={expanded} onMouseLeave={dismiss} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dismiss(); }}>
              <span className="co-name">{room.name}</span><div className="co-rug" aria-hidden="true"/><div className="co-desk" aria-hidden="true"/>{kind === "fitness" ? <div className="co-rack" aria-hidden="true"/> : kind === "bank" ? <div className="co-safe" aria-hidden="true"/> : <div className="co-shelf" aria-hidden="true"/>}{kind === "supp" ? <div className="co-box" aria-hidden="true"/> : <div className="co-plant" aria-hidden="true"/>}
              <button type="button" className="co-agent" style={{ "--shirt": room.color } as CSSProperties} aria-label={`${people[kind]}, ${room.name}: ${bubble}. Abrir pendências`} aria-controls={panelId} aria-expanded={expanded} onMouseEnter={() => preview(room.name)} onFocus={event => { trigger.current = event.currentTarget; if (!restoringFocus.current) preview(room.name); }} onClick={event => { cancelDismiss(); trigger.current = event.currentTarget; setSelection(room.name); setPinned(!(expanded && pinned)); }}>
                <span className="co-bubble" aria-hidden="true">{bubble}</span><i className="co-head" aria-hidden="true"/><i className="co-shirt" aria-hidden="true"/><span className="co-agent-label" aria-hidden="true">{people[kind]}</span>
              </button>
              <section id={panelId} className="co-notice" aria-label={`Pendências de ${room.name}`} hidden={!expanded} onMouseEnter={cancelDismiss} onFocus={cancelDismiss}>
                <div className="co-panel-top"><div><h2>{room.name}</h2><small>{people[kind]} · {pinned ? "Aviso fixado" : "Clique no personagem para fixar"}</small></div><button type="button" className="co-close" aria-label="Fechar painel de pendências" onClick={close}>×</button></div>
                <div className="co-notice-scroll" tabIndex={0} aria-label="Lista de avisos com rolagem">
                  {signals.map(signal => <article className="co-task" key={signal.label} data-signal={signal.kind ?? "attention"}>
                    <span className="co-priority">{signalKind[signal.kind ?? "attention"]} · {signal.count === null ? "Consulta indisponível · tente atualizar" : `${signal.count} registro(s) para conferir`}</span>
                    <h3>{signal.label}</h3>{signal.description ? <p>{signal.description}</p> : null}<Link prefetch={false} href={signal.href}>Abrir fila para resolver</Link>
                  </article>)}
                  {!signals.length ? <p>Sem pendências nos indicadores consultados desta sala.</p> : null}
                  <details className="co-history"><summary>Cobertura desta sala</summary><p>{room.signals.length} indicadores consultados. As contagens são por fila; um registro pode aparecer em mais de uma.</p>{room.unmonitored?.length ? <><p>Ainda sem monitoramento:</p><ul>{room.unmonitored.map(item => <li key={item}>{item}</li>)}</ul></> : null}<p>Abra a origem para executar a ação e atualize ao voltar. Nenhuma resolução é simulada aqui.</p></details>
                </div>
              </section>
            </div></Fragment>;
        })}</div>
        <div className="co-status" aria-live="polite">{refreshing ? "Consultando novamente…" : `Consulta: ${consulted}.`}<small>Balões contam tipos de aviso, não pessoas nem peças. Atenção, oportunidade e agenda são exibidas separadamente.</small></div>
      </section> : <p className="co-empty">Nenhuma operação disponível para seu acesso.</p>}
      <details className="co-coverage"><summary>O que esta visão ainda não acompanha?</summary><p>Esta casa reúne as filas integradas abaixo. Ausência de aviso não garante que toda a operação esteja em dia.</p>{rooms.map(room => <div key={room.name}><h2>{room.name}</h2><p>Monitorado: {room.signals.map(signal => signal.label).join("; ")}.</p>{room.unmonitored?.length ? <p>Sem monitoramento: {room.unmonitored.join("; ")}.</p> : null}</div>)}<p>Central, Marketing e Physique ainda não têm indicadores integrados nesta casa. As permissões de cada operação continuam valendo.</p></details>
      <footer className="co-footer">Os personagens sinalizam filas do ERP. Eles não executam ações automaticamente.</footer>
      <div className="co-scene-links"><Link href="/company/mapa">Acompanhar roteiro da migração</Link><Link href="/company/compras">Compras e reposição</Link></div>
    </div>
  </main>;
}
