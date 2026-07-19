import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleUserRound, ExternalLink, AtSign, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const providerLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  manual: "Manual",
};

export default async function CentralContactPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = await createClient();

  // A Inbox está pausada. A ficha do contato carrega somente identidade e vínculos
  // operacionais; não consulta mais central_inbox_overview nem histórico de mensagens.
  const [contactResult, identitiesResult] = await Promise.all([
    supabase
      .from("central_contacts")
      .select("id,operation_scope,display_name,phone,email,instagram_username,preferred_channel,notes,supplements_customer_id,fitness_customer_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("central_contact_identities")
      .select("id,provider,account_external_id,external_id,username,display_name")
      .eq("contact_id", id)
      .order("provider"),
  ]);

  if (contactResult.error) throw contactResult.error;
  if (identitiesResult.error) throw identitiesResult.error;
  if (!contactResult.data) notFound();

  const contact = contactResult.data;
  const identities = identitiesResult.data ?? [];

  return <>
    <PageHeader
      eyebrow="Candinho Central"
      title={contact.display_name}
      description="Visão unificada do contato, identidades externas e vínculos operacionais."
      action={<Link className="button ghost" href="/central/clientes"><ArrowLeft size={16}/>Voltar</Link>}
    />

    <section className="central-contact-detail-grid">
      <article className="panel">
        <div className="panel-head">
          <div><h2>Identidade</h2><p>Dados principais usados pela Central.</p></div>
          <CircleUserRound size={20}/>
        </div>
        <div className="panel-body central-contact-detail-list">
          <div><small>Telefone</small><strong>{contact.phone ?? "—"}</strong></div>
          <div><small>E-mail</small><strong>{contact.email ?? "—"}</strong></div>
          <div><small>Instagram</small><strong>{contact.instagram_username ? `@${contact.instagram_username}` : "—"}</strong></div>
          <div><small>Canal preferido</small><strong>{contact.preferred_channel ? providerLabel[contact.preferred_channel] ?? contact.preferred_channel : "—"}</strong></div>
          <div><small>Espaço</small><strong>{contact.operation_scope === "company" ? "Candinho Company" : contact.operation_scope === "supplements" ? "Suplementos" : contact.operation_scope === "fitness" ? "Fitness" : "Marketing"}</strong></div>
          <div className="central-contact-detail-notes"><small>Observações</small><strong>{contact.notes ?? "Nenhuma observação cadastrada."}</strong></div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div><h2>Vínculos operacionais</h2><p>Os cadastros originais continuam independentes.</p></div>
          <ExternalLink size={20}/>
        </div>
        <div className="panel-body central-contact-link-cards">
          {contact.supplements_customer_id
            ? <Link href={`/clientes/${contact.supplements_customer_id}`}><strong>Cliente de Suplementos</strong><span>Abrir ficha completa</span></Link>
            : <div><strong>Suplementos</strong><span>Ainda não vinculado</span></div>}
          {contact.fitness_customer_id
            ? <Link href="/fitness/clientes"><strong>Cliente Fitness</strong><span>Vínculo identificado</span></Link>
            : <div><strong>Fitness</strong><span>Ainda não vinculado</span></div>}
        </div>
      </article>
    </section>

    <article className="panel">
      <div className="panel-head">
        <div><h2>Identidades de canal</h2><p>Contas externas reconhecidas pelas integrações conectadas.</p></div>
        <AtSign size={20}/>
      </div>
      {identities.length === 0
        ? <div className="empty"><MessageCircle size={24}/><strong>Nenhuma identidade externa ainda</strong>Ela aparecerá quando esse contato for reconhecido por um canal conectado.</div>
        : <div className="central-identity-list">
            {identities.map((identity) => (
              <div key={identity.id}>
                <span>{providerLabel[identity.provider] ?? identity.provider}</span>
                <strong>{identity.display_name ?? identity.username ?? identity.external_id}</strong>
                <small>{identity.account_external_id || "Conta padrão"}</small>
              </div>
            ))}
          </div>}
    </article>

    <article className="panel" style={{ marginTop: 14 }}>
      <div className="panel-body" style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.6 }}>
        O histórico de atendimento da antiga Inbox está pausado. Os dados de identidade e os vínculos
        com Suplementos/Fitness continuam preservados normalmente.
      </div>
    </article>
  </>;
}
