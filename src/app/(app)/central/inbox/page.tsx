import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, Search, UserRound } from "lucide-react";
import { CentralConversationActions } from "@/components/central-conversation-actions";
import { PageHeader } from "@/components/page-header";
import { getCentralConversationDetails, getCentralInboxSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const providerMeta: Record<string, { label: string; icon: typeof MessageCircle }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  instagram: { label: "Instagram", icon: MessageCircle },
  facebook: { label: "Facebook", icon: MessageCircle },
};

const scopeLabel: Record<string, string> = { company: "Company", supplements: "Suplementos", fitness: "Fitness", marketing: "Marketing" };

export default async function CentralInboxPage({ searchParams }: { searchParams: Promise<{ provider?: string; status?: string; conversa?: string; q?: string; scope?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const params = await searchParams;
  const allItems = await getCentralInboxSnapshot(params.provider, params.status, 200);
  const q = (params.q ?? "").trim().toLowerCase();
  const items = allItems.filter((item) => {
    const matchesQuery = !q || [item.contact_name, item.phone, item.instagram_username, item.last_message_body].some((value) => value?.toLowerCase().includes(q));
    const matchesScope = !params.scope || item.operation_scope === params.scope;
    return matchesQuery && matchesScope;
  });
  const selectedId = params.conversa || items[0]?.conversation_id || null;
  const details = selectedId ? await getCentralConversationDetails(selectedId) : null;

  return <>
    <PageHeader eyebrow="Candinho Central" title="Atendimento" description="WhatsApp, Instagram e Facebook em uma única fila, com contexto do cliente e apoio do Nexus." />

    <div className="central-inbox-toolbar">
      <form method="get" className="central-inbox-filter-form">
        <label className="central-inbox-search"><Search size={15}/><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar contato ou mensagem..."/></label>
        <select name="provider" defaultValue={params.provider ?? ""}><option value="">Todos os canais</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select>
        <select name="scope" defaultValue={params.scope ?? ""}><option value="">Todas as operações</option><option value="company">Company</option><option value="supplements">Suplementos</option><option value="fitness">Fitness</option><option value="marketing">Marketing</option></select>
        <select name="status" defaultValue={params.status ?? ""}><option value="">Todos os status</option><option value="open">Abertas</option><option value="pending">Pendentes</option><option value="closed">Concluídas</option></select>
        <button className="button ghost compact-button" type="submit">Filtrar</button>
      </form>
      <span>{items.length} de {allItems.length} conversa(s)</span>
    </div>

    <section className="central-inbox-layout">
      <aside className="central-conversation-list panel">
        {items.length === 0 ? <div className="empty"><MessageCircle size={25}/><strong>Nenhuma conversa encontrada</strong>{allItems.length === 0 ? "Assim que a Meta for conectada, as mensagens aparecerão aqui." : "Altere os filtros para visualizar outras conversas."}</div> : items.map((item) => {
          const meta = providerMeta[item.provider] ?? providerMeta.whatsapp;
          const Icon = meta.icon;
          const query = new URLSearchParams();
          if (params.provider) query.set("provider", params.provider);
          if (params.status) query.set("status", params.status);
          if (params.scope) query.set("scope", params.scope);
          if (params.q) query.set("q", params.q);
          query.set("conversa", item.conversation_id);
          return <Link href={`/central/inbox?${query.toString()}`} className={`central-conversation-row ${selectedId === item.conversation_id ? "active" : ""}`} key={item.conversation_id}>
            <span className={`central-provider-icon ${item.provider}`}><Icon size={17}/></span>
            <span className="central-conversation-copy"><strong>{item.contact_name}</strong><small>{item.last_message_body ?? `[${item.last_message_type ?? "mensagem"}]`}</small><em>{meta.label} · {scopeLabel[item.operation_scope] ?? item.operation_scope} · {item.status === "pending" ? "Pendente" : item.status === "closed" ? "Concluída" : "Aberta"}</em></span>
            <span className="central-conversation-meta"><small>{formatDateTime(item.last_message_at)}</small>{item.unread_count > 0 && <b>{item.unread_count}</b>}</span>
          </Link>;
        })}
      </aside>

      <article className="panel central-chat-panel">
        {!details?.conversation ? <div className="empty"><MessageCircle size={28}/><strong>Selecione uma conversa</strong>O histórico e o contexto do cliente aparecerão aqui.</div> : <>
          <div className="central-chat-head">
            <div><strong>{details.conversation.contact_name}</strong><span>{providerMeta[details.conversation.provider]?.label ?? details.conversation.provider} · {scopeLabel[details.conversation.operation_scope] ?? details.conversation.operation_scope} · {details.conversation.status}</span></div>
            <CentralConversationActions conversationId={details.conversation.conversation_id} status={details.conversation.status}/>
          </div>
          <div className="central-chat-body">
            {details.messages.length === 0 ? <div className="empty">Sem mensagens registradas.</div> : details.messages.map((message) => <div className={`central-message ${message.direction}`} key={message.id}><span>{message.body ?? `[${message.message_type}]`}</span><small>{formatDateTime(message.sent_at)}{message.delivery_status ? ` · ${message.delivery_status}` : ""}</small></div>)}
          </div>
          <div className="central-customer-context central-customer-context-v2">
            <div><small>Contato</small><strong>{details.contact?.display_name ?? details.conversation.contact_name}</strong></div>
            <div><small>Telefone</small><strong>{details.contact?.phone ?? "—"}</strong></div>
            <div><small>E-mail</small><strong>{details.contact?.email ?? "—"}</strong></div>
            <div><small>Instagram</small><strong>{details.contact?.instagram_username ? `@${details.contact.instagram_username}` : "—"}</strong></div>
            <div><small>Vínculos</small><strong>{[details.contact?.supplements_customer_id ? "Suplementos" : null, details.contact?.fitness_customer_id ? "Fitness" : null].filter(Boolean).join(" + ") || "Ainda não vinculado"}</strong></div>
            {details.contact?.notes && <div className="central-context-notes"><small>Observação</small><strong>{details.contact.notes}</strong></div>}
            {details.contact?.id && <div className="central-context-actions"><Link className="button ghost compact-button" href={`/central/clientes/${details.contact.id}`}><UserRound size={14}/>Abrir contato</Link>{details.contact.email && <span><Mail size={13}/>{details.contact.email}</span>}</div>}
          </div>
        </>}
      </article>
    </section>
  </>;
}
