"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, PlayCircle } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

type AuditState = "pending" | "reviewing" | "approved" | "issue";
export type MigrationAuditRow = { key: string; operation: "supplements" | "fitness"; area: string; description: string; legacyHref: string; companyHref: string };
export type SavedAudit = { check_key: string; state: AuditState; notes: string | null };

const stateCopy: Record<AuditState, string> = { pending: "A conferir", reviewing: "Em conferência", approved: "OK", issue: "Falta migrar" };
const localStateKey = "candinho-company-migration-audit";
const localStateEvent = "candinho:migration-audit-changed";
function localSnapshot() {
  try { return window.localStorage.getItem(localStateKey) ?? "[]"; } catch { return "[]"; }
}
function parseLocal(snapshot: string): SavedAudit[] {
  try {
    const entries: unknown = JSON.parse(snapshot);
    return Array.isArray(entries) ? entries.filter((item): item is SavedAudit => Boolean(item && typeof item.check_key === "string" && Object.hasOwn(stateCopy, item.state))) : [];
  } catch { return []; }
}
function subscribeLocal(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(localStateEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(localStateEvent, notify);
  };
}
function writeLocal(entries: SavedAudit[]) {
  window.localStorage.setItem(localStateKey, JSON.stringify(entries));
  window.dispatchEvent(new Event(localStateEvent));
}

export function MigrationAuditBoard({ rows, saved }: { rows: MigrationAuditRow[]; saved: SavedAudit[] }) {
  const [remoteValues, setValues] = useState(() => new Map(saved.map((item) => [item.check_key, item])));
  const snapshot = useSyncExternalStore(subscribeLocal, localSnapshot, () => "[]");
  const values = useMemo(() => new Map([...remoteValues, ...parseLocal(snapshot).map((item) => [item.check_key, item] as const)]), [remoteValues, snapshot]);
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const operationLabel = rows[0]?.operation === "fitness" ? "Fitness" : "Suplementos";
  const supplements = rows;
  const summary = useMemo(() => ({ approved: supplements.filter((row) => values.get(row.key)?.state === "approved").length, issue: supplements.filter((row) => values.get(row.key)?.state === "issue").length, total: supplements.length }), [supplements, values]);
  const next = supplements.find((row) => values.get(row.key)?.state !== "approved") ?? null;

  function saveLocal(nextValue: SavedAudit) {
    // Read the latest shared cache, not this board's stale React state.
    // Saving Fitness must not overwrite pending Suplementos confirmations.
    const entries = new Map(parseLocal(localSnapshot()).map((item) => [item.check_key, item]));
    entries.set(nextValue.check_key, nextValue);
    writeLocal([...entries.values()]);
  }

  async function save(row: MigrationAuditRow, state: AuditState) {
    setSaving(row.key);
    setFeedback(null);
    const existing = values.get(row.key);
    const optimistic = { check_key: row.key, state, notes: existing?.notes ?? null };
    setValues((current) => new Map(current).set(row.key, optimistic));
    let error: unknown;
    try {
      ({ error } = await createClient().from("migration_audit_checks").upsert({ check_key: row.key, operation: row.operation, area: row.area, legacy_href: row.legacyHref, company_href: row.companyHref, state, notes: existing?.notes ?? null, updated_at: new Date().toISOString() }));
    } catch (cause) { error = cause; }
    if (error) {
      try {
        saveLocal(optimistic);
        setFeedback(`${row.area}: ${stateCopy[state]} salvo neste aparelho. Não foi possível sincronizar com o banco agora.`);
      } catch {
        setFeedback(`${row.area}: não foi possível salvar no banco nem neste aparelho. Tente novamente antes de sair.`);
      }
    } else {
      try { writeLocal(parseLocal(localSnapshot()).filter((item) => item.check_key !== row.key)); } catch { /* Sem impacto na confirmação remota. */ }
      setFeedback(`${row.area}: ${stateCopy[state]}.`);
    }
    setSaving(null);
  }

  return <section className="migration-audit-board">
    <header><span>ROTEIRO GUIADO · {operationLabel.toUpperCase()}</span><h2>Auditar aba por aba até não sobrar nada no ERP antigo</h2><p>Abra a área antiga, compare com a substituta Company e marque o resultado. O próximo bloco é calculado automaticamente.</p></header>
    <div className="migration-audit-summary"><strong>{summary.approved}/{summary.total} em OK</strong><span>{summary.issue ? `${summary.issue} ponto(s) ainda para migrar` : "Nenhuma pendência marcada"}</span>{next ? <Link href={`#${next.key}`}><PlayCircle size={16}/> Próximo: {next.area}</Link> : <span className="migration-audit-finished"><CheckCircle2 size={16}/> {operationLabel}: conferências OK; falta homologação final</span>}</div>
    {feedback ? <p className="company-care-feedback" role="status">{feedback}</p> : null}
    <div className="migration-audit-list">{rows.map((row) => { const current = values.get(row.key); const state = current?.state ?? "pending"; return <article id={row.key} key={row.key} className={`migration-audit-row ${state}`}><div><span className="migration-audit-operation">{row.operation === "supplements" ? "SUPLEMENTOS" : "FITNESS"}</span><h3>{row.area}</h3><p>{row.description}</p></div><div className="migration-audit-links"><Link href={row.legacyHref} target="_blank"><ExternalLink size={15}/> ERP antigo</Link><Link href={row.companyHref} target="_blank"><ExternalLink size={15}/> Company</Link></div><div className="migration-audit-actions"><span>{stateCopy[state]}</span><button type="button" disabled={saving === row.key} onClick={() => save(row, "reviewing")}>Conferir</button><button type="button" disabled={saving === row.key} onClick={() => save(row, "approved")}>{saving === row.key ? <LoaderCircle className="spin" size={15}/> : <CheckCircle2 size={15}/>} OK</button><button type="button" disabled={saving === row.key} onClick={() => save(row, "issue")}><CircleAlert size={15}/> Falta</button></div></article>; })}</div>
  </section>;
}
