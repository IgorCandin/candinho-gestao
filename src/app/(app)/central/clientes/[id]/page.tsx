import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleUserRound, ExternalLink, AtSign, MessageCircle, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralContactDetails } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const providerLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", manual: "Manual" };

export default async function CentralContactPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const { id } = await params;
  const data = await getCentralContactDetails(id);
  if (!data.contact) notFound();
  const contact = data.contact;

  return <>
    <PageHeader eyebrow="Candinho Central" title={contact.display_name} description="Visão unificada do contato, identidades externas, vínculos e histórico de conversas." action={<Link className="button ghost" href="/central/clientes"><ArrowLeft size={16}/>Voltar</Link>}/>

    <section className="central-contact-detail-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>Identidade</h2><p>Dados principais usados pelo Central.</p></div><CircleUserRound size={20}/></div>
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
        <div className="panel-head"><div><h2>Vínculos operacionais</h2><p>Os cadastros originais continuam independentes.</p></div><ExternalLink size={20}/></div>
        <div className="panel-body central-contact-link-cards">
          {contact.supplements_customer_id ? <Link href={`/clientes/${contact.supplements_customer_id}`}><strong>Cliente de Suplementos</strong><span>Abrir ficha completa</span></Link> : <div><strong>Suplementos</strong><span>Ainda não vinculado</span></div>}
          {contact.fitness_customer_id ? <Link href="/fitness/clientes"><strong>Cliente Fitness</strong><span>Vínculo identificado</span></Link> : <div><strong>Fitness</strong><span>Ainda não vinculado</span></div>}
        </div>
      </article>
    </section>

    <article className="panel">
      <div className="panel-head"><div><h2>Identidades de canal</h2><p>Contas externas reconhecidas pelo webhook.</p></div><AtSign size={20}/></div>
      {data.identities.length === 0 ? <div className="empty"><MessageCircle size={24}/><strong>Nenhuma identidade externa ainda</strong>Ela aparecerá quando esse contato conversar por um canal conectado.</div> : <div className="central-identity-list">{data.identities.map((identity) => <div key={identity.id}><span>{providerLabel[identity.provider] ?? identity.provider}</span><strong>{identity.display_name ?? identity.username ?? identity.external_id}</strong><small>{identity.account_external_id || "Conta padrão"}</small></div>)}</div>}
    </article>

    <article className="panel">
      <div className="panel-head"><div><h2>Conversas</h2><p>Histórico de atendimentos vinculados ao contato.</p></div><MessagesSquare size={20}/></div>
      {data.conversations.length === 0 ? <div className="empty"><MessagesSquare size={24}/><strong>Nenhuma conversa registrada</strong>O cadastro já pode ser usado; as conversas entram quando os canais estiverem conectados.</div> : <div className="central-contact-conversations">{data.conversations.map((conversation) => <Link href={`/central/inbox?conversa=${conversation.conversation_id}`} key={conversation.conversation_id}><div><strong>{providerLabel[conversation.provider] ?? conversation.provider}</strong><span>{conversation.last_message_body ?? "Mensagem sem texto"}</span></div><small>{formatDateTime(conversation.last_message_at)}</small></Link>)}</div>}
    </article>
  </>;
}
