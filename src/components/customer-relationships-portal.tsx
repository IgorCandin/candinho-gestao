"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Bot,
  Handshake,
  Link2,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CustomerNetwork } from "@/lib/nexus-operating-types";

type CustomerOption = {
  id: string;
  name: string;
  city?: string | null;
  phone?: string | null;
};

type PartnerOption = {
  id: string;
  name: string;
  partner_type?: string | null;
  city?: string | null;
};

type Payload = {
  network: CustomerNetwork;
  customers: CustomerOption[];
  partners: PartnerOption[];
  error?: string;
};

const RELATIONS = [
  ["spouse", "Cônjuge"],
  ["mother", "Mãe de"],
  ["father", "Pai de"],
  ["parent", "Pai/Mãe de"],
  ["child", "Filho(a) de"],
  ["sibling", "Irmão/irmã de"],
  ["friend", "Amigo(a) de"],
  ["colleague", "Colega de"],
  ["referred_by", "Foi indicado(a) por"],
  ["referred", "Indicou"],
  ["family", "Familiar de"],
  ["other", "Outro vínculo"],
] as const;

const LEGACY_RELATIONS: Record<string, string> = {
  trainer: "Professor(a)/treinador(a) de (legado)",
  student: "Aluno(a) de (legado)",
};

const PARTNER_RELATIONS = [
  ["student_of_partner", "Aluno(a)"],
  ["client_of_partner", "Cliente da parceria"],
  ["referred_by_partner", "Indicado(a)"],
  ["team_of_partner", "Equipe / funcionário(a)"],
  ["family_of_partner", "Familiar"],
  ["other", "Outro vínculo"],
] as const;

function relationLabel(type: string, custom?: string | null) {
  if (custom) return custom;
  return (
    RELATIONS.find(([key]) => key === type)?.[1] ??
    LEGACY_RELATIONS[type] ??
    type.replaceAll("_", " ")
  );
}

function partnerRelationLabel(type: string, custom?: string | null) {
  if (custom) return custom;
  return (
    PARTNER_RELATIONS.find(([key]) => key === type)?.[1] ??
    type.replaceAll("_", " ")
  );
}

export function CustomerRelationshipsPortal({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const customerId = useMemo(() => {
    const match = pathname?.match(
      /^\/clientes\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i,
    );
    return match?.[1] ?? null;
  }, [pathname]);

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"partner" | "related">("partner");

  const [relatedCustomerId, setRelatedCustomerId] = useState("");
  const [relationType, setRelationType] = useState("spouse");
  const [relationCustomLabel, setRelationCustomLabel] = useState("");
  const [relationNotes, setRelationNotes] = useState("");

  const [partnerId, setPartnerId] = useState("");
  const [partnerRelation, setPartnerRelation] = useState("student_of_partner");
  const [partnerCustomLabel, setPartnerCustomLabel] = useState("");
  const [autoPartner, setAutoPartner] = useState(true);
  const [primaryPartner, setPrimaryPartner] = useState(true);

  useEffect(() => {
    setTarget(null);
    setData(null);
    setMessage(null);

    if (!enabled || !customerId) return;

    const anchor = document.createElement("div");
    anchor.className = "customer-relationships-portal-anchor";

    const profile = document.querySelector(".customer-profile-grid");
    const radar = document.querySelector(".customer-radar-strip");

    if (profile?.parentElement) {
      profile.parentElement.insertBefore(anchor, profile.nextSibling);
    } else if (radar?.parentElement) {
      radar.parentElement.insertBefore(anchor, radar.nextSibling);
    } else {
      document.querySelector("main")?.appendChild(anchor);
    }

    setTarget(anchor);

    return () => anchor.remove();
  }, [customerId, enabled]);

  useEffect(() => {
    if (!customerId || !target) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, target]);

  async function load() {
    if (!customerId) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/customers/${customerId}/relationships`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar vínculos.");
      }
      setData(payload);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível carregar vínculos.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveRelationship() {
    if (!customerId || !relatedCustomerId) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "customer",
          related_customer_id: relatedCustomerId,
          relation_type: relationType,
          relation_label: relationCustomLabel.trim() || null,
          notes: relationNotes.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        network?: CustomerNetwork;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar o vínculo.");
      }

      if (data && payload.network) setData({ ...data, network: payload.network });
      setRelatedCustomerId("");
      setRelationCustomLabel("");
      setRelationNotes("");
      setMessage("Vínculo relacionado salvo.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o vínculo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function savePartner() {
    if (!customerId || !partnerId) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "partner",
          partner_id: partnerId,
          relation_type: partnerRelation,
          relation_label: partnerCustomLabel.trim() || null,
          counts_for_partnership: true,
          auto_attribute_sales: autoPartner,
          is_primary: primaryPartner,
          priority: primaryPartner ? 200 : 100,
        }),
      });
      const payload = (await response.json()) as {
        network?: CustomerNetwork;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar a parceria.");
      }

      if (data && payload.network) setData({ ...data, network: payload.network });
      setPartnerId("");
      setPartnerCustomLabel("");
      setMessage(
        autoPartner
          ? "Vínculo de parceria salvo. As próximas vendas podem ser atribuídas automaticamente."
          : "Vínculo de parceria salvo.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar a parceria.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: "customer" | "partner", id: string) {
    if (!customerId) return;
    if (
      !window.confirm(
        "Remover este vínculo do cadastro? O histórico de vendas não será apagado.",
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/relationships`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const payload = (await response.json()) as {
        network?: CustomerNetwork;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível remover o vínculo.");
      }
      if (data && payload.network) setData({ ...data, network: payload.network });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível remover o vínculo.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!enabled || !customerId || !target) return null;

  const content = (
    <section className="customer-network-section">
      <header className="customer-network-head">
        <div>
          <span className="eyebrow">CRM · Nexus</span>
          <h2>Vínculos do cliente</h2>
          <p>
            Um único bloco para parceria e pessoas relacionadas. “Aluno(a)” fica apenas
            em Parceria; relações pessoais ficam em Relacionado.
          </p>
        </div>
        <span className="badge green">
          <UsersRound size={13} /> Grafo CRM
        </span>
      </header>

      {loading ? (
        <article className="panel">
          <div className="empty compact">
            <LoaderCircle className="spin" size={24} /> Carregando vínculos...
          </div>
        </article>
      ) : data ? (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                {mode === "partner" ? <Handshake size={18} /> : <Link2 size={18} />}
                {mode === "partner" ? " Parceria" : " Relacionado"}
              </h2>
              <p>
                {mode === "partner"
                  ? "Academia, ponto parceiro, indicação e outros vínculos comerciais."
                  : "Família, amizade, indicação e outras relações entre pessoas."}
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className={`button compact-button ${mode === "partner" ? "gold" : "ghost"}`}
                type="button"
                onClick={() => setMode("partner")}
              >
                <Handshake size={13} /> Parceria
              </button>
              <button
                className={`button compact-button ${mode === "related" ? "gold" : "ghost"}`}
                type="button"
                onClick={() => setMode("related")}
              >
                <UsersRound size={13} /> Relacionado
              </button>
            </div>
          </div>

          {mode === "partner" ? (
            <div className="panel-body customer-network-list">
              {data.network.autoPartner && (
                <div className="customer-auto-partner-banner">
                  <Bot size={16} />
                  <div>
                    <strong>Parceria automática atual</strong>
                    <span>
                      {data.network.autoPartner.partner_name} ·{" "}
                      {partnerRelationLabel(
                        data.network.autoPartner.relation_type,
                        data.network.autoPartner.relation_label,
                      )}
                    </span>
                  </div>
                </div>
              )}

              {data.network.affiliations.length ? (
                data.network.affiliations.map((affiliation) => (
                  <div className="customer-network-row" key={affiliation.id}>
                    <div>
                      <strong>{affiliation.partnerName}</strong>
                      <span>
                        {partnerRelationLabel(
                          affiliation.relationType,
                          affiliation.relationLabel,
                        )}
                      </span>
                      <small>
                        {affiliation.countsForPartnership
                          ? "Conta para parceria"
                          : "Só contexto"}
                        {affiliation.autoAttributeSales
                          ? " · atribuição automática"
                          : ""}
                        {affiliation.isPrimary ? " · principal" : ""}
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      disabled={saving}
                      onClick={() => void remove("partner", affiliation.id)}
                      aria-label="Remover vínculo de parceria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <Handshake size={24} />
                  <strong>Nenhuma parceria vinculada</strong>
                  Sem vínculo, a venda não será atribuída automaticamente.
                </div>
              )}

              <div className="customer-network-add">
                <select
                  className="select"
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                >
                  <option value="">Selecione o parceiro</option>
                  {data.partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} · {partner.partner_type ?? "Parceiro"}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  value={partnerRelation}
                  onChange={(event) => setPartnerRelation(event.target.value)}
                >
                  {PARTNER_RELATIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {partnerRelation === "other" && (
                  <input
                    className="input"
                    value={partnerCustomLabel}
                    onChange={(event) => setPartnerCustomLabel(event.target.value)}
                    placeholder="Nome do vínculo"
                  />
                )}

                <label className="customer-network-check">
                  <input
                    type="checkbox"
                    checked={autoPartner}
                    onChange={(event) => setAutoPartner(event.target.checked)}
                  />
                  <span>
                    <strong>Atribuir vendas automaticamente</strong>
                    <small>
                      Ao criar uma nova venda/orçamento deste cliente, o parceiro é
                      aplicado no banco.
                    </small>
                  </span>
                </label>

                <label className="customer-network-check">
                  <input
                    type="checkbox"
                    checked={primaryPartner}
                    onChange={(event) => setPrimaryPartner(event.target.checked)}
                  />
                  <span>
                    <strong>Vínculo principal</strong>
                    <small>
                      Se houver mais de uma parceria automática, esta tem preferência.
                    </small>
                  </span>
                </label>

                <button
                  className="button gold compact-button"
                  type="button"
                  disabled={saving || !partnerId}
                  onClick={() => void savePartner()}
                >
                  <Plus size={14} /> Vincular parceria
                </button>
              </div>
            </div>
          ) : (
            <div className="panel-body customer-network-list">
              {data.network.relationships.length ? (
                data.network.relationships.map((relation) => (
                  <div
                    className="customer-network-row"
                    key={`${relation.id}-${relation.direction}`}
                  >
                    <div>
                      <strong>{relation.relatedName}</strong>
                      <span>
                        {relationLabel(
                          relation.relationType,
                          relation.relationLabel,
                        )}
                      </span>
                      {relation.notes && <small>{relation.notes}</small>}
                    </div>

                    <div className="customer-network-row-actions">
                      <Link
                        className="button ghost compact-button"
                        href={`/clientes/${relation.relatedCustomerId}`}
                      >
                        Abrir
                      </Link>
                      <button
                        className="icon-button"
                        type="button"
                        disabled={saving}
                        onClick={() => void remove("customer", relation.id)}
                        aria-label="Remover vínculo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <UsersRound size={24} />
                  <strong>Nenhuma pessoa vinculada</strong>
                  Cadastre apenas relações que você realmente conhece.
                </div>
              )}

              <div className="customer-network-add">
                <select
                  className="select"
                  value={relatedCustomerId}
                  onChange={(event) => setRelatedCustomerId(event.target.value)}
                >
                  <option value="">Selecione a pessoa</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.city ? ` · ${customer.city}` : ""}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  value={relationType}
                  onChange={(event) => setRelationType(event.target.value)}
                >
                  {RELATIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {relationType === "other" && (
                  <input
                    className="input"
                    value={relationCustomLabel}
                    onChange={(event) => setRelationCustomLabel(event.target.value)}
                    placeholder="Nome do vínculo"
                  />
                )}

                <input
                  className="input"
                  value={relationNotes}
                  onChange={(event) => setRelationNotes(event.target.value)}
                  placeholder="Observação opcional"
                />

                <button
                  className="button gold compact-button"
                  type="button"
                  disabled={saving || !relatedCustomerId}
                  onClick={() => void saveRelationship()}
                >
                  <Plus size={14} /> Adicionar relacionado
                </button>
              </div>
            </div>
          )}
        </article>
      ) : null}

      <div className="customer-network-safety">
        <ShieldCheck size={15} />
        <span>
          <strong>Regra do Nexus:</strong> ele pode sugerir que um vínculo merece
          revisão, mas nunca inventa “é esposo”, “é mãe”, “é aluno” etc. A relação só
          vira fato quando alguém cadastra.
        </span>
      </div>

      {message && <p className="form-message">{message}</p>}
    </section>
  );

  return createPortal(content, target);
}
