"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuditState = "pending" | "reviewing" | "approved" | "issue";
export type MigrationAuditRow = { key: string; operation: "supplements" | "fitness"; area: string; description: string; legacyHref: string; companyHref: string };
export type SavedAudit = { check_key: string; state: AuditState; notes: string | null };

const stateCopy: Record<AuditState, string> = { pending: "A conferir", reviewing: "Em conferência", approved: "OK", issue: "Falta migrar" };

export function MigrationAuditBoard({ rows, saved }: { rows: MigrationAuditRow[]; saved: SavedAudit[] }) {
  const [values, setValues] = useState(() => new Map(saved.map((item) => [item.check_key, item])));
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const supplements = rows.filter((row) => row.operation === "supplements");
  const summary = useMemo(() => ({ approved: supplements.filter((row) => values.get(row.key)?.state === "approved").length, issue: supplements.filter((row) => values.get(row.key)?.state === "issue").length, total: supplements.length }), [supplements, values]);
  const next = supplements.find((row) => values.get(row.key)?.state !== "approved") ?? null;

  async function save(row: MigrationAuditRow, state: AuditState) {
    setSaving(row.key);
    setFeedback(null);
    const existing = values.get(row.key);
    const optimistic = { check_key: row.key, state, notes: existing?.notes ?? null };
    setValues((current) => new Map(current).set(row.key, optimistic));
    const { error } = await createClient().from("migration_audit_checks").upsert({ check_key: row.key, operation: row.operation, area: row.area, legacy_href: row.legacyHref, company_href: row.companyHref, state, notes: existing?.notes ?? null, updated_at: new Date().toISOString() });
    if (error) {
      setValues((current) => { const nextValues = new Map(current); if (existing) nextValues.set(row.key, existing); else nextValues.delete(row.key); return nextValues; });
      setFeedback(`Não foi possível salvar “${row.area}”: ${error.message}`);
    } else {
      setFeedback(`${row.area}: ${stateCopy[state]}.`);
    }
    setSaving(null);
  }

  return <section className="migration-audit-board">
    <header><span>ROTEIRO GUIADO · SUPLEMENTOS</span><h2>Auditar aba por aba até não sobrar nada no ERP antigo</h2><p>Abra a área antiga, compare com a substituta Company e marque o resultado. O próximo bloco é calculado automaticamente.</p></header>
    <div className="migration-audit-summary"><strong>{summary.approved}/{summary.total} em OK</strong><span>{summary.issue ? `${summary.issue} ponto(s) ainda para migrar` : "Nenhuma pendência marcada"}</span>{next ? <Link href={`#${next.key}`}><PlayCircle size={16}/> Próximo: {next.area}</Link> : <span className="migration-audit-finished"><CheckCircle2 size={16}/> Suplementos pronto para inativação</span>}</div>
    {feedback ? <p className="company-care-feedback" role="status">{feedback}</p> : null}
    <div className="migration-audit-list">{rows.map((row) => { const current = values.get(row.key); const state = current?.state ?? "pending"; return <article id={row.key} key={row.key} className={`migration-audit-row ${state}`}><div><span className="migration-audit-operation">{row.operation === "supplements" ? "SUPLEMENTOS" : "FITNESS"}</span><h3>{row.area}</h3><p>{row.description}</p></div><div className="migration-audit-links"><Link href={row.legacyHref} target="_blank"><ExternalLink size={15}/> ERP antigo</Link><Link href={row.companyHref} target="_blank"><ExternalLink size={15}/> Company</Link></div><div className="migration-audit-actions"><span>{stateCopy[state]}</span><button type="button" disabled={saving === row.key} onClick={() => save(row, "reviewing")}>Conferir</button><button type="button" disabled={saving === row.key} onClick={() => save(row, "approved")}>{saving === row.key ? <LoaderCircle className="spin" size={15}/> : <CheckCircle2 size={15}/>} OK</button><button type="button" disabled={saving === row.key} onClick={() => save(row, "issue")}><CircleAlert size={15}/> Falta</button></div></article>; })}</div>
  </section>;
}
