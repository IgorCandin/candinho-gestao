"use client";

import {
  CheckCircle2,
  Clipboard,
  Clock3,
  LoaderCircle,
  Search,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type UxIssueRow = {
  id: string;
  category: string;
  category_label: string;
  severity: string;
  status: string;
  description: string;
  route: string | null;
  viewport_class: string | null;
  screen_width: number | null;
  screen_height: number | null;
  device_pixel_ratio: number | null;
  error_message: string | null;
  fingerprint: string | null;
  recent_actions: unknown;
  client_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  is_pending: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  triaged: "Triado",
  in_progress: "Em correção",
  resolved: "Resolvido",
  ignored: "Ignorado",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeClass(row: UxIssueRow) {
  if (row.severity === "critical" || row.severity === "high") return "red";
  if (row.status === "resolved") return "green";
  if (row.status === "in_progress" || row.status === "triaged") return "orange";
  return "gray";
}

export function UxIssueReportList({ rows }: { rows: UxIssueRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = useMemo(
    () =>
      [...new Set(rows.map((row) => row.category))]
        .map((value) => ({
          value,
          label: rows.find((row) => row.category === value)?.category_label ?? value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      const matchesStatus =
        status === "all"
          ? true
          : status === "pending"
            ? row.is_pending
            : row.status === status;
      const matchesCategory = category === "all" || row.category === category;
      const matchesQuery =
        !q ||
        [row.description, row.route, row.category_label, row.error_message]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(q));
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [rows, query, status, category]);

  async function updateStatus(id: string, nextStatus: string) {
    if (updating) return;
    setUpdating(id);
    try {
      const response = await fetch("/api/nexus/ux-report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar.");
      router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  async function copyPending() {
    const pending = rows.filter((row) => row.is_pending);
    const text = [
      "# Relatos UX/Função pendentes",
      "",
      ...pending.flatMap((row, index) => [
        `${index + 1}. [${row.category_label}] ${row.route ?? "Rota não identificada"}`,
        `   Status: ${STATUS_LABELS[row.status] ?? row.status} · Prioridade: ${row.severity}`,
        `   Relato: ${row.description}`,
        `   Dispositivo: ${row.viewport_class ?? "?"} ${row.screen_width ?? "?"}x${row.screen_height ?? "?"} DPR ${row.device_pixel_ratio ?? "?"}`,
        row.error_message ? `   Erro capturado: ${row.error_message}` : "",
        `   Registrado: ${dateTime(row.created_at)}`,
        `   ID: ${row.id}`,
        "",
      ].filter(Boolean)),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2><Wrench size={18} /> Fila de quebras</h2>
          <p>
            Relatos manuais com contexto técnico automático. Use “Copiar pendências”
            quando quiser trazer o pacote inteiro para análise.
          </p>
        </div>
        <button className="button ghost compact-button" type="button" onClick={() => void copyPending()}>
          <Clipboard size={14} /> {copied ? "Copiado" : "Copiar pendências"}
        </button>
      </div>

      <div
        className="panel-body"
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px,1fr) repeat(2,minmax(150px,190px))",
            gap: 8,
          }}
        >
          <label className="inventory-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar relato, rota ou erro..."
            />
          </label>

          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="pending">Pendentes</option>
            <option value="all">Todos</option>
            <option value="open">Abertos</option>
            <option value="triaged">Triados</option>
            <option value="in_progress">Em correção</option>
            <option value="resolved">Resolvidos</option>
            <option value="ignored">Ignorados</option>
          </select>

          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Todas as categorias</option>
            {categories.map((item) => (
              <option value={item.value} key={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <small style={{ color: "var(--muted)" }}>
          {filtered.length} relato(s) neste filtro.
        </small>

        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((row) => {
            const context = row.client_context ?? {};
            const scale = context.visual_viewport_scale;
            const innerWidth = context.inner_width;
            const innerHeight = context.inner_height;

            return (
              <article
                key={row.id}
                style={{
                  padding: 12,
                  border: "1px solid var(--line)",
                  borderRadius: 13,
                  background: "rgba(255,255,255,.012)",
                  display: "grid",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`badge ${badgeClass(row)}`}>{row.category_label}</span>
                      <span className="badge gray">{STATUS_LABELS[row.status] ?? row.status}</span>
                    </div>
                    <strong style={{ display: "block", marginTop: 7, fontSize: 11 }}>
                      {row.route ?? "Rota não identificada"}
                    </strong>
                  </div>

                  <small style={{ color: "var(--muted)", display: "flex", gap: 5, alignItems: "center" }}>
                    <Clock3 size={12} /> {dateTime(row.created_at)}
                  </small>
                </div>

                <p style={{ margin: 0, fontSize: 9.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                  {row.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    color: "var(--muted)",
                    fontSize: 7.5,
                  }}
                >
                  <span>{row.viewport_class ?? "?"}</span>
                  <span>{row.screen_width ?? "?"}×{row.screen_height ?? "?"}</span>
                  <span>DPR {row.device_pixel_ratio ?? "?"}</span>
                  {innerWidth ? <span>viewport {String(innerWidth)}×{String(innerHeight ?? "?")}</span> : null}
                  {scale ? <span>escala {String(scale)}</span> : null}
                </div>

                {row.error_message && (
                  <div
                    style={{
                      padding: 8,
                      border: "1px solid rgba(229,91,91,.18)",
                      borderRadius: 9,
                      color: "#ef9a9a",
                      fontSize: 7.5,
                      overflowWrap: "anywhere",
                    }}
                  >
                    Erro capturado: {row.error_message}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {row.status !== "in_progress" && row.status !== "resolved" && (
                    <button
                      className="button ghost compact-button"
                      type="button"
                      disabled={updating === row.id}
                      onClick={() => void updateStatus(row.id, "in_progress")}
                    >
                      {updating === row.id ? <LoaderCircle className="spin" size={13} /> : <Wrench size={13} />}
                      Em correção
                    </button>
                  )}
                  {row.status !== "resolved" && (
                    <button
                      className="button gold compact-button"
                      type="button"
                      disabled={updating === row.id}
                      onClick={() => void updateStatus(row.id, "resolved")}
                    >
                      {updating === row.id ? <LoaderCircle className="spin" size={13} /> : <CheckCircle2 size={13} />}
                      Resolvido
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!filtered.length && (
            <div className="empty compact">
              <CheckCircle2 size={25} />
              <strong>Nenhum relato neste filtro</strong>
              Continue usando o ERP normalmente.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
