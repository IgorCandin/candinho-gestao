"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Handshake,
  Link2,
  LoaderCircle,
  Search,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CustomerLinkRow = {
  link_id: string;
  customer_id: string;
  customer_name: string;
  link_group: "partner" | "related" | string;
  relation_type: string;
  relation_label: string | null;
  target_id: string;
  target_name: string;
  target_kind: string;
  counts_for_partnership: boolean | null;
  auto_attribute_sales: boolean | null;
  is_primary: boolean | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PendingPartnerLinkRow = {
  customer_id: string;
  customer_name: string;
  customer_city: string | null;
  partner_id: string;
  partner_name: string;
  partner_type: string | null;
  sale_count: number;
  first_sale_at: string | null;
  last_sale_at: string | null;
  total_sales_value: number;
  evidence_type: string;
  recommended_action: string;
};

const PARTNER_RELATIONS = [
  ["student_of_partner", "Aluno(a)"],
  ["client_of_partner", "Cliente da parceria"],
  ["referred_by_partner", "Indicado(a)"],
  ["team_of_partner", "Equipe / funcionário(a)"],
  ["family_of_partner", "Familiar"],
  ["other", "Outro vínculo"],
] as const;

const RELATION_LABELS: Record<string, string> = {
  spouse: "Cônjuge",
  mother: "Mãe de",
  father: "Pai de",
  parent: "Pai/Mãe de",
  child: "Filho(a) de",
  sibling: "Irmão/irmã de",
  friend: "Amigo(a) de",
  colleague: "Colega de",
  referred_by: "Foi indicado(a) por",
  referred: "Indicou",
  family: "Familiar de",
  trainer: "Professor(a)/treinador(a) de (legado)",
  student: "Aluno(a) de (legado)",
  other: "Outro vínculo",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function dateOnly(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function linkLabel(row: CustomerLinkRow) {
  if (row.relation_label) return row.relation_label;
  if (row.link_group === "partner") {
    return (
      PARTNER_RELATIONS.find(([value]) => value === row.relation_type)?.[1] ??
      row.relation_type
    );
  }
  return RELATION_LABELS[row.relation_type] ?? row.relation_type;
}

export function CustomerLinksWorkspace({
  links,
  pending,
}: {
  links: CustomerLinkRow[];
  pending: PendingPartnerLinkRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "partner" | "related">(
    pending.length ? "pending" : "partner",
  );
  const [query, setQuery] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [relationType, setRelationType] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [autoAttribute, setAutoAttribute] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const partnerLinks = useMemo(
    () => links.filter((row) => row.active && row.link_group === "partner"),
    [links],
  );
  const relatedLinks = useMemo(
    () => links.filter((row) => row.active && row.link_group === "related"),
    [links],
  );

  const filteredPending = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return pending;
    return pending.filter((row) =>
      [row.customer_name, row.customer_city, row.partner_name, row.partner_type]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [pending, query]);

  const filteredLinks = useMemo(() => {
    const source = tab === "partner" ? partnerLinks : relatedLinks;
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return source;
    return source.filter((row) =>
      [row.customer_name, row.target_name, linkLabel(row), row.notes]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [partnerLinks, relatedLinks, query, tab]);

  function startReview(row: PendingPartnerLinkRow) {
    setEditingKey(`${row.customer_id}:${row.partner_id}`);
    setRelationType("");
    setCustomLabel("");
    setAutoAttribute(true);
    setMessage(null);
  }

  async function createPartnerLink(row: PendingPartnerLinkRow) {
    if (!relationType || saving) return;
    const key = `${row.customer_id}:${row.partner_id}`;
    setSaving(key);
    setMessage(null);

    try {
      const response = await fetch(`/api/customers/${row.customer_id}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "partner",
          partner_id: row.partner_id,
          relation_type: relationType,
          relation_label: relationType === "other" ? customLabel.trim() || null : null,
          counts_for_partnership: true,
          auto_attribute_sales: autoAttribute,
          is_primary: true,
          priority: 200,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível criar o vínculo.");
      }

      setEditingKey(null);
      setMessage("Vínculo confirmado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível criar o vínculo.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function review(
    row: PendingPartnerLinkRow,
    action: "ignore" | "snooze",
  ) {
    const key = `${row.customer_id}:${row.partner_id}`;
    if (saving) return;
    setSaving(key);
    setMessage(null);

    try {
      const response = await fetch("/api/customers/link-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: row.customer_id,
          partner_id: row.partner_id,
          action,
          days: 30,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível revisar a sugestão.");
      }

      setEditingKey(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível revisar a sugestão.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2><Link2 size={18} /> Vínculos</h2>
          <p>
            Um único lugar para pendências, parceria e relações entre pessoas.
            O Nexus apresenta evidências; o tipo do vínculo só vira fato após sua confirmação.
          </p>
        </div>
      </div>

      <div className="panel-body" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            className={`button compact-button ${tab === "pending" ? "gold" : "ghost"}`}
            type="button"
            onClick={() => setTab("pending")}
          >
            <Clock3 size={14} /> Pendentes ({pending.length})
          </button>
          <button
            className={`button compact-button ${tab === "partner" ? "gold" : "ghost"}`}
            type="button"
            onClick={() => setTab("partner")}
          >
            <Handshake size={14} /> Parcerias ({partnerLinks.length})
          </button>
          <button
            className={`button compact-button ${tab === "related" ? "gold" : "ghost"}`}
            type="button"
            onClick={() => setTab("related")}
          >
            <UsersRound size={14} /> Relacionados ({relatedLinks.length})
          </button>
        </div>

        <label className="inventory-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, parceiro ou vínculo..."
          />
        </label>

        {tab === "pending" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredPending.map((row) => {
              const key = `${row.customer_id}:${row.partner_id}`;
              const editing = editingKey === key;

              return (
                <article
                  key={key}
                  style={{
                    padding: 12,
                    border: "1px solid rgba(217,164,65,.2)",
                    borderRadius: 13,
                    background: "rgba(217,164,65,.025)",
                    display: "grid",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <Link
                        className="table-link"
                        href={`/clientes/${row.customer_id}`}
                        style={{ fontWeight: 850, fontSize: 11 }}
                      >
                        {row.customer_name}
                      </Link>
                      <small style={{ display: "block", color: "var(--muted)", marginTop: 3 }}>
                        {row.customer_city || "Cidade não informada"}
                      </small>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ display: "block", fontSize: 10 }}>
                        {row.partner_name}
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        {row.partner_type || "Parceiro"}
                      </small>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                      gap: 7,
                    }}
                  >
                    <div style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 9 }}>
                      <small style={{ color: "var(--muted)" }}>EVIDÊNCIA</small>
                      <strong style={{ display: "block", fontSize: 9, marginTop: 3 }}>
                        {row.sale_count} venda(s) atribuída(s)
                      </strong>
                    </div>
                    <div style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 9 }}>
                      <small style={{ color: "var(--muted)" }}>ÚLTIMA VENDA</small>
                      <strong style={{ display: "block", fontSize: 9, marginTop: 3 }}>
                        {dateOnly(row.last_sale_at)}
                      </strong>
                    </div>
                    <div style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 9 }}>
                      <small style={{ color: "var(--muted)" }}>VALOR ASSOCIADO</small>
                      <strong style={{ display: "block", fontSize: 9, marginTop: 3 }}>
                        {money(row.total_sales_value)}
                      </strong>
                    </div>
                  </div>

                  {editing ? (
                    <div
                      style={{
                        padding: 10,
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 9 }}>
                        Qual é o vínculo real com {row.partner_name}?
                      </strong>
                      <select
                        className="select"
                        value={relationType}
                        onChange={(event) => setRelationType(event.target.value)}
                      >
                        <option value="">Selecione o vínculo</option>
                        {PARTNER_RELATIONS.map(([value, label]) => (
                          <option value={value} key={value}>{label}</option>
                        ))}
                      </select>
                      {relationType === "other" && (
                        <input
                          className="input"
                          value={customLabel}
                          onChange={(event) => setCustomLabel(event.target.value)}
                          placeholder="Nome do vínculo"
                        />
                      )}
                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          fontSize: 8,
                          color: "var(--muted)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={autoAttribute}
                          onChange={(event) => setAutoAttribute(event.target.checked)}
                        />
                        <span>
                          <strong style={{ display: "block", color: "var(--text)" }}>
                            Atribuir próximas vendas automaticamente
                          </strong>
                          Evita marcar a parceria manualmente nas próximas vendas.
                        </span>
                      </label>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          className="button ghost compact-button"
                          type="button"
                          onClick={() => setEditingKey(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          className="button gold compact-button"
                          type="button"
                          disabled={!relationType || saving === key}
                          onClick={() => void createPartnerLink(row)}
                        >
                          {saving === key ? <LoaderCircle className="spin" size={13} /> : <CheckCircle2 size={13} />}
                          Confirmar vínculo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button
                        className="button ghost compact-button"
                        type="button"
                        disabled={saving === key}
                        onClick={() => void review(row, "ignore")}
                      >
                        <XCircle size={13} /> Não é vínculo
                      </button>
                      <button
                        className="button ghost compact-button"
                        type="button"
                        disabled={saving === key}
                        onClick={() => void review(row, "snooze")}
                      >
                        <Clock3 size={13} /> Rever em 30 dias
                      </button>
                      <button
                        className="button gold compact-button"
                        type="button"
                        onClick={() => startReview(row)}
                      >
                        <UserRoundCheck size={13} /> Confirmar vínculo
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

            {!filteredPending.length && (
              <div className="empty compact">
                <CheckCircle2 size={25} />
                <strong>Nenhum vínculo pendente</strong>
                As evidências atuais já foram tratadas.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {filteredLinks.map((row) => (
              <article
                key={row.link_id}
                style={{
                  padding: 11,
                  border: "1px solid var(--line)",
                  borderRadius: 11,
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <Link className="table-link" href={`/clientes/${row.customer_id}`}>
                  {row.customer_name}
                </Link>
                <span className="badge gray">{linkLabel(row)}</span>
                {row.target_kind === "customer" ? (
                  <Link
                    className="table-link"
                    href={`/clientes/${row.target_id}`}
                    style={{ textAlign: "right" }}
                  >
                    {row.target_name}
                  </Link>
                ) : (
                  <span style={{ textAlign: "right", fontSize: 9 }}>
                    <strong>{row.target_name}</strong>
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {row.auto_attribute_sales ? "Atribuição automática" : "Atribuição manual"}
                      {row.is_primary ? " · principal" : ""}
                    </small>
                  </span>
                )}
              </article>
            ))}

            {!filteredLinks.length && (
              <div className="empty compact">
                <Link2 size={25} />
                <strong>Nenhum vínculo neste filtro</strong>
                Ajuste a busca ou cadastre um vínculo pela ficha do cliente.
              </div>
            )}
          </div>
        )}

        {message && <p className="form-message">{message}</p>}
      </div>
    </article>
  );
}
