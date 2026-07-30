"use client";

import Link from "next/link";
import {
  Handshake,
  Link2,
  Plus,
  Save,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CustomerOption } from "@/lib/types";

type PartnerOption = {
  id: string;
  name: string;
  partner_type: string | null;
  city: string | null;
};

type RelationshipDraft = {
  key: string;
  related_customer_id: string;
  relation_type: string;
  relation_label: string | null;
};

type PartnerDraft = {
  key: string;
  partner_id: string;
  relation_type: string;
  relation_label: string | null;
  counts_for_partnership: boolean;
  auto_attribute_sales: boolean;
  is_primary: boolean;
  priority: number;
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
  ["trainer", "Professor(a)/treinador(a) de"],
  ["student", "Aluno(a) de"],
  ["referred_by", "Foi indicado(a) por"],
  ["referred", "Indicou"],
  ["family", "Familiar de"],
  ["other", "Outro"],
] as const;

const PARTNER_RELATIONS = [
  ["student_of_partner", "Aluno(a)"],
  ["client_of_partner", "Cliente da parceria"],
  ["referred_by_partner", "Indicado(a)"],
  ["team_of_partner", "Equipe / funcionário(a)"],
  ["family_of_partner", "Familiar"],
  ["other", "Outro"],
] as const;

const key = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function NewCustomerForm({
  customers,
  partners,
}: {
  customers: CustomerOption[];
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [relatedCustomerId, setRelatedCustomerId] = useState("");
  const [relationType, setRelationType] = useState("spouse");
  const [relationCustom, setRelationCustom] = useState("");
  const [relationships, setRelationships] = useState<RelationshipDraft[]>([]);

  const [partnerId, setPartnerId] = useState("");
  const [partnerRelation, setPartnerRelation] = useState("student_of_partner");
  const [partnerCustom, setPartnerCustom] = useState("");
  const [partnerDrafts, setPartnerDrafts] = useState<PartnerDraft[]>([]);

  const customerName = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  );
  const partnerName = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner.name])),
    [partners],
  );

  function addRelationship() {
    if (!relatedCustomerId) return;
    const exists = relationships.some(
      (item) =>
        item.related_customer_id === relatedCustomerId &&
        item.relation_type === relationType,
    );
    if (exists) return;

    setRelationships((current) => [
      ...current,
      {
        key: key(),
        related_customer_id: relatedCustomerId,
        relation_type: relationType,
        relation_label: relationType === "other" ? relationCustom.trim() || null : null,
      },
    ]);
    setRelatedCustomerId("");
    setRelationCustom("");
  }

  function addPartner() {
    if (!partnerId) return;
    const exists = partnerDrafts.some(
      (item) => item.partner_id === partnerId && item.relation_type === partnerRelation,
    );
    if (exists) return;

    setPartnerDrafts((current) => [
      ...current.map((item) => ({ ...item, is_primary: false })),
      {
        key: key(),
        partner_id: partnerId,
        relation_type: partnerRelation,
        relation_label:
          partnerRelation === "other" ? partnerCustom.trim() || null : null,
        counts_for_partnership: true,
        auto_attribute_sales: true,
        // O vínculo adicionado por último vira o principal; os anteriores são mantidos como contexto.
        is_primary: true,
        priority: 200,
      },
    ]);
    setPartnerId("");
    setPartnerCustom("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_customer", {
        p_name: name,
        p_phone: phone || null,
        p_city: city || null,
        p_reference: reference || null,
        p_notes: notes || null,
      });

      if (error) throw error;

      const customerId = String(data ?? "");
      if (!customerId) throw new Error("Cliente criado sem identificador.");

      if (relationships.length || partnerDrafts.length) {
        const relationResponse = await fetch(
          `/api/customers/${customerId}/relationships`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "bulk",
              relationships: relationships.map((item) => ({
                related_customer_id: item.related_customer_id,
                relation_type: item.relation_type,
                relation_label: item.relation_label,
              })),
              affiliations: partnerDrafts.map((item) => ({
                partner_id: item.partner_id,
                relation_type: item.relation_type,
                relation_label: item.relation_label,
                counts_for_partnership: item.counts_for_partnership,
                auto_attribute_sales: item.auto_attribute_sales,
                is_primary: item.is_primary,
                priority: item.priority,
              })),
            }),
          },
        );

        if (!relationResponse.ok) {
          router.push(`/clientes/${customerId}?relacao=review`);
          router.refresh();
          return;
        }
      }

      router.push(`/clientes/${customerId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="customer-create-layout-v2" onSubmit={submit}>
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Dados básicos</h2>
            <p>O mínimo necessário para iniciar CRM, lead, orçamento e pós-venda.</p>
          </div>
          <UserRoundPlus size={20} />
        </div>

        <div className="panel-body form-grid-two">
          <label className="field">
            <span>Nome</span>
            <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Telefone</span>
            <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field">
            <span>Cidade</span>
            <input className="input" value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className="field">
            <span>Referência</span>
            <input className="input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Academia, indicação, bairro..." />
          </label>
          <label className="field field-span-two">
            <span>Observações</span>
            <textarea className="textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>
      </article>

      <article className="panel customer-create-network-card">
        <div className="panel-head">
          <div>
            <h2><UsersRound size={18} /> Relacionamentos</h2>
            <p>Opcional. Uma pessoa pode ter vários vínculos ao mesmo tempo; não precisa escolher só um.</p>
          </div>
        </div>

        <div className="panel-body customer-create-network-body">
          <div className="customer-create-network-block">
            <div><Link2 size={16} /><span><strong>Com outra pessoa</strong><small>Ex.: cônjuge, mãe, amigo, indicação.</small></span></div>
            <select className="select" value={relatedCustomerId} onChange={(event) => setRelatedCustomerId(event.target.value)}>
              <option value="">Selecione um cliente já cadastrado</option>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>{customer.name}{customer.city ? ` · ${customer.city}` : ""}</option>
              ))}
            </select>
            <select className="select" value={relationType} onChange={(event) => setRelationType(event.target.value)}>
              {RELATIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            {relationType === "other" && <input className="input" value={relationCustom} onChange={(event) => setRelationCustom(event.target.value)} placeholder="Nome do vínculo" />}
            <button className="button ghost compact-button" type="button" disabled={!relatedCustomerId} onClick={addRelationship}><Plus size={14} /> Adicionar</button>

            {relationships.map((item) => (
              <div className="customer-create-draft" key={item.key}>
                <span><strong>{customerName.get(item.related_customer_id) ?? "Cliente"}</strong><small>{RELATIONS.find(([value]) => value === item.relation_type)?.[1] ?? item.relation_label ?? item.relation_type}</small></span>
                <button className="icon-button" type="button" onClick={() => setRelationships((current) => current.filter((row) => row.key !== item.key))}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>

          <div className="customer-create-network-block partner">
            <div><Handshake size={16} /><span><strong>Com uma parceria</strong><small>Ex.: aluno(a) da Pâmela. Isso pode eliminar a marcação manual na venda.</small></span></div>
            <select className="select" value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
              <option value="">Selecione o parceiro</option>
              {partners.map((partner) => (
                <option value={partner.id} key={partner.id}>{partner.name} · {partner.partner_type}</option>
              ))}
            </select>
            <select className="select" value={partnerRelation} onChange={(event) => setPartnerRelation(event.target.value)}>
              {PARTNER_RELATIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            {partnerRelation === "other" && <input className="input" value={partnerCustom} onChange={(event) => setPartnerCustom(event.target.value)} placeholder="Nome do vínculo" />}
            <button className="button ghost compact-button" type="button" disabled={!partnerId} onClick={addPartner}><Plus size={14} /> Vincular e automatizar</button>

            {partnerDrafts.map((item) => (
              <div className="customer-create-draft partner" key={item.key}>
                <span><strong>{partnerName.get(item.partner_id) ?? "Parceiro"}</strong><small>Conta na parceria · atribuição automática</small></span>
                <button className="icon-button" type="button" onClick={() => setPartnerDrafts((current) => current.filter((row) => row.key !== item.key))}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </article>

      <div className="form-footer">
        <Link className="button ghost" href="/clientes">Cancelar</Link>
        <button className="button gold" disabled={loading}>
          <Save size={17} /> {loading ? "Salvando..." : "Salvar cliente"}
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
