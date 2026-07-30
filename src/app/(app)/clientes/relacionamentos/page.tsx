import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Handshake,
  Link2,
  Network,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

type GraphRelationship = {
  id: string;
  customer_id: string;
  customer_name: string;
  related_customer_id: string;
  related_name: string;
  relation_type: string;
  relation_label?: string | null;
  notes?: string | null;
};

type GraphAffiliation = {
  id: string;
  customer_id: string;
  customer_name: string;
  partner_id: string;
  partner_name: string;
  partner_type?: string | null;
  relation_type: string;
  relation_label?: string | null;
  counts_for_partnership?: boolean;
  auto_attribute_sales?: boolean;
  is_primary?: boolean;
  priority?: number;
};

const RELATION_LABELS: Record<string, string> = {
  spouse: "Cônjuge",
  mother: "Mãe de",
  father: "Pai de",
  parent: "Pai/Mãe de",
  child: "Filho(a) de",
  sibling: "Irmão/irmã de",
  friend: "Amigo(a) de",
  colleague: "Colega de",
  trainer: "Professor(a)/treinador(a) de",
  student: "Aluno(a) de",
  referred_by: "Foi indicado(a) por",
  referred: "Indicou",
  family: "Familiar de",
  other: "Outro vínculo",
};

const PARTNER_LABELS: Record<string, string> = {
  student_of_partner: "Aluno(a)",
  client_of_partner: "Cliente da parceria",
  referred_by_partner: "Indicado(a)",
  team_of_partner: "Equipe / funcionário(a)",
  family_of_partner: "Familiar",
  other: "Outro vínculo",
};

function relationLabel(row: GraphRelationship) {
  return row.relation_label || RELATION_LABELS[row.relation_type] || row.relation_type;
}

function partnerRelationLabel(row: GraphAffiliation) {
  return row.relation_label || PARTNER_LABELS[row.relation_type] || row.relation_type;
}

export default async function CustomerRelationshipsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_nexus_relationship_graph_v1", {
    p_limit: 500,
  });

  if (error) throw error;

  const source =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  const relationships = Array.isArray(source.relationships)
    ? (source.relationships as GraphRelationship[])
    : [];
  const affiliations = Array.isArray(source.partner_affiliations)
    ? (source.partner_affiliations as GraphAffiliation[])
    : [];

  const people = new Set<string>();
  for (const row of relationships) {
    people.add(row.customer_id);
    people.add(row.related_customer_id);
  }
  for (const row of affiliations) people.add(row.customer_id);

  const automatic = affiliations.filter(
    (row) => row.counts_for_partnership && row.auto_attribute_sales,
  );

  const byPartner = new Map<
    string,
    { partnerId: string; partnerName: string; partnerType: string | null; rows: GraphAffiliation[] }
  >();

  for (const row of affiliations) {
    const current = byPartner.get(row.partner_id) ?? {
      partnerId: row.partner_id,
      partnerName: row.partner_name,
      partnerType: row.partner_type ?? null,
      rows: [],
    };
    current.rows.push(row);
    byPartner.set(row.partner_id, current);
  }

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="CRM · Rede"
        title="Relacionamentos"
        description="Mapa explícito de pessoas, indicações e vínculos com parceiros. Uma pessoa pode participar de vários relacionamentos ao mesmo tempo."
        action={
          <div className="page-header-actions">
            <Link className="button gold" href="/clientes/novo">
              <Plus size={16} />
              Novo cliente com vínculo
            </Link>
            <Link className="button ghost" href="/clientes">
              <ArrowLeft size={16} />
              CRM
            </Link>
          </div>
        }
      />

      <section className="nexus-relationship-overview-stats">
        <article>
          <UsersRound size={18} />
          <span>Pessoas conectadas</span>
          <strong>{people.size}</strong>
          <small>com ao menos um vínculo cadastrado</small>
        </article>
        <article>
          <Link2 size={18} />
          <span>Relações entre clientes</span>
          <strong>{relationships.length}</strong>
          <small>família, amizade, indicação, treino...</small>
        </article>
        <article>
          <Handshake size={18} />
          <span>Vínculos com parceiros</span>
          <strong>{affiliations.length}</strong>
          <small>{byPartner.size} parceiro(s) conectado(s)</small>
        </article>
        <article>
          <ShieldCheck size={18} />
          <span>Parceria automática</span>
          <strong>{automatic.length}</strong>
          <small>venda futura já herda o parceiro</small>
        </article>
      </section>

      <div className="nexus-relationship-overview-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2><Network size={18} /> Rede entre pessoas</h2>
              <p>Somente vínculos cadastrados explicitamente aparecem como fato para o Nexus.</p>
            </div>
          </div>

          <div className="panel-body nexus-relationship-list">
            {relationships.length ? (
              relationships.map((row) => (
                <div className="nexus-relationship-overview-row" key={row.id}>
                  <Link href={`/clientes/${row.customer_id}`}>{row.customer_name}</Link>
                  <span>{relationLabel(row)}</span>
                  <Link href={`/clientes/${row.related_customer_id}`}>{row.related_name}</Link>
                  {row.notes && <small>{row.notes}</small>}
                </div>
              ))
            ) : (
              <div className="empty compact">
                <UsersRound size={25} />
                <strong>Ainda não existem relações entre clientes</strong>
                Abra uma ficha de cliente ou cadastre um novo cliente com vínculos.
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2><Handshake size={18} /> Redes de parceria</h2>
              <p>Quem pertence a cada parceiro e quais vendas podem ser atribuídas automaticamente.</p>
            </div>
          </div>

          <div className="panel-body nexus-partner-network-list">
            {[...byPartner.values()].length ? (
              [...byPartner.values()].map((group) => (
                <section className="nexus-partner-network" key={group.partnerId}>
                  <header>
                    <div>
                      <strong>{group.partnerName}</strong>
                      <small>{group.partnerType || "Parceiro"}</small>
                    </div>
                    <b>{group.rows.length}</b>
                  </header>

                  <div>
                    {group.rows.map((row) => (
                      <Link href={`/clientes/${row.customer_id}`} key={row.id}>
                        <span>
                          <strong>{row.customer_name}</strong>
                          <small>{partnerRelationLabel(row)}</small>
                        </span>
                        <em className={row.auto_attribute_sales ? "active" : ""}>
                          {row.auto_attribute_sales ? "Auto" : "Manual"}
                        </em>
                      </Link>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="empty compact">
                <Handshake size={25} />
                <strong>Ainda não existem clientes vinculados a parceiros</strong>
                Na ficha do cliente, defina por exemplo “Aluno(a)” e ative atribuição automática.
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="panel nexus-relationship-nexus-note">
        <div className="panel-body">
          <Bot size={20} />
          <div>
            <strong>Como o Nexus usa esta rede</strong>
            <p>
              O Nexus pode responder sobre relações cadastradas, alunos de parceiros e indicações.
              Ele não transforma semelhança de nome, telefone ou comportamento em parentesco.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
