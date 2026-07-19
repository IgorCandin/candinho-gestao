import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Mail, MessageCircle, Search, UserRound } from "lucide-react";
import { CentralConversationActions } from "@/components/central-conversation-actions";
import { CentralConversationAssignment } from "@/components/central-conversation-assignment";
import { CENTRAL_LABELS, CentralConversationLabel, labelName } from "@/components/central-conversation-label";
import { CentralConversationFollowupForm } from "@/components/central-conversation-followup-form";
import { CentralConversationReadMarker } from "@/components/central-conversation-read-marker";
import { CentralInboxRealtime } from "@/components/central-inbox-realtime";
import { CentralReplyComposer } from "@/components/central-reply-composer";
import { PageHeader } from "@/components/page-header";
import { getCentralConversationDetails, getCentralInboxSnapshot, getCentralQuickReplies, getCentralTeamMembers } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const providerMeta: Record<string, { label: string; icon: typeof MessageCircle }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  instagram: { label: "Instagram", icon: MessageCircle },
  facebook: { label: "Facebook", icon: MessageCircle },
};

const scopeLabel: Record<string, string> = { company: "Company", supplements: "Suplementos", fitness: "Fitness", marketing: "Marketing" };

type Params = { provider?: string; status?: string; conversa?: string; q?: string; scope?: string; label?: string };

export default async function CentralInboxPage({ searchParams }: { searchParams: Promise<Params> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");

  const params = await searchParams;
  const allItemsRaw = await getCentralInboxSnapshot(params.provider, params.status, 200);
  const supabase = await createClient();

  const conversationIds = allItemsRaw.map((item) => item.conversation_id);
  const labelsById = new Map<string, string | null>();
  if (conversationIds.length) {
    const labels = await supabase.from("central_conversations").select("id,label_key").in("id", conversationIds);
    (labels.data ?? []).forEach((row) => labelsById.set(String(row.id), row.label_key ? String(row.label_key) : null));
  }

  const allItems = allItemsRaw.map((item) => ({ ...item, label_key: labelsById.get(item.conversation_id) ?? null }));
  const q = (params.q ?? "").trim().toLowerCase();
  const items = allItems.filter((item) => {
    const matchesQuery = !q || [item.contact_name, item.phone, item.instagram_username, item.last_message_body].some((value) => value?.toLowerCase().includes(q));
    const matchesScope = !params.scope || item.operation_scope === params.scope;
    const matchesLabel = !params.label || item.label_key === params.label;
    return matchesQuery && matchesScope && matchesLabel;
  });

  const selectedId = params.conversa || items[0]?.conversation_id || null;
  const details = selectedId ? await getCentralConversationDetails(selectedId) : null;
  const selectedScope = details?.conversation?.operation_scope ?? "company";
  const [team, quickReplies] = details?.conversation ? await Promise.all([getCentralTeamMembers(selectedScope), getCentralQuickReplies(selectedScope)]) : [[], []];

  let messages: Array<{
    id: string; direction: string; message_type: string; body: string | null;
    media_external_url: string | null; media_storage_path: string | null; media_mime_type: string | null;
    media_filename: string | null; delivery_status: string | null; sent_at: string; media_url: string | null;
  }> = [];

  if (selectedId) {
    const result = await supabase
      .from("central_messages")
      .select("id,direction,message_type,body,media_external_url,media_storage_path,media_mime_type,media_filename,delivery_status,sent_at")
      .eq("conversation_id", selectedId)
      .order("sent_at", { ascending: true })
      .limit(200);

    const rows = result.data ?? [];
    const paths = rows.map((row) => row.media_storage_path).filter((path): path is string => Boolean(path));
    const signedByPath = new Map<string, string>();
    if (paths.length) {
      const signed = await supabase.storage.from("central-media").createSignedUrls(paths, 3600);
      signed.data?.forEach((item, index) => {
        if (item.signedUrl && paths[index]) signedByPath.set(paths[index], item.signedUrl);
      });
    }
    messages = rows.map((row) => ({
      ...row,
      media_url: row.media_storage_path ? signedByPath.get(row.media_storage_path) ?? null : row.media_external_url,
    }));
  }

  const selectedLabel = selectedId ? labelsById.get(selectedId) ?? null : null;

  return <>
    <PageHeader eyebrow="Candinho Central" title="Atendimento" description="WhatsApp, Instagram e Facebook em uma única fila, agora com atualização ao vivo, etiquetas e mídia." />

    <div className="central-inbox-toolbar">
      <form method="get" className="central-inbox-filter-form">
        <label className="central-inbox-search"><Search size={15}/><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar contato ou mensagem..."/></label>
        <select name="provider" defaultValue={params.provider ?? ""}><option value="">Todos os canais</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select>
        <select name="scope" defaultValue={params.scope ?? ""}><option value="">Todas as operações</option><option value="company">Company</option><option value="supplements">Suplementos</option><option value="fitness">Fitness</option><option value="marketing">Marketing</option></select>
        <select name="status" defaultValue={params.status ?? ""}><option value="">Todos os status</option><option value="open">Abertas</option><option value="pending">Pendentes</option><option value="closed">Concluídas</option></select>
        <select name="label" defaultValue={params.label ?? ""}>{CENTRAL_LABELS.map((item) => <option key={item.key || "all"} value={item.key}>{item.key ? item.label : "Todas as etiquetas"}</option>)}</select>
        <button className="button ghost compact-button" type="submit">Filtrar</button>
      </form>
      <span className="central-inbox-toolbar-meta"><CentralInboxRealtime /> {items.length} de {allItems.length} conversa(s) · <Link href="/central/respostas">Respostas rápidas</Link></span>
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
          if (params.label) query.set("label", params.label);
          if (params.q) query.set("q", params.q);
          query.set("conversa", item.conversation_id);
          return <Link href={`/central/inbox?${query.toString()}`} className={`central-conversation-row ${selectedId === item.conversation_id ? "active" : ""}`} key={item.conversation_id}>
            <span className={`central-provider-icon ${item.provider}`}><Icon size={17}/></span>
            <span className="central-conversation-copy">
              <strong>{item.contact_name}</strong>
              <small>{item.last_message_body ?? `[${item.last_message_type ?? "mensagem"}]`}</small>
              <em>{meta.label} · {scopeLabel[item.operation_scope] ?? item.operation_scope} · {item.status === "pending" ? "Pendente" : item.status === "closed" ? "Concluída" : "Aberta"}</em>
              {item.label_key && <i className={`central-label-badge label-${item.label_key}`}>{labelName(item.label_key)}</i>}
            </span>
            <span className="central-conversation-meta"><small>{formatDateTime(item.last_message_at)}</small>{item.unread_count > 0 && <b>{item.unread_count}</b>}</span>
          </Link>;
        })}
      </aside>

      <article className="panel central-chat-panel">
        {!details?.conversation ? <div className="empty"><MessageCircle size={28}/><strong>Selecione uma conversa</strong>O histórico e o contexto do cliente aparecerão aqui.</div> : <>
          <CentralConversationReadMarker conversationId={details.conversation.conversation_id} unreadCount={details.conversation.unread_count}/>
          <div className="central-chat-head">
            <div><strong>{details.conversation.contact_name}</strong><span>{providerMeta[details.conversation.provider]?.label ?? details.conversation.provider} · {scopeLabel[details.conversation.operation_scope] ?? details.conversation.operation_scope} · {details.conversation.status}</span></div>
            <div className="central-chat-head-actions">
              <CentralConversationLabel conversationId={details.conversation.conversation_id} value={selectedLabel}/>
              <CentralConversationAssignment conversationId={details.conversation.conversation_id} currentAssignedTo={details.conversation.assigned_to} team={team}/>
              <CentralConversationActions conversationId={details.conversation.conversation_id} status={details.conversation.status}/>
            </div>
          </div>

          <div className="central-chat-body">
            {messages.length === 0 ? <div className="empty">Sem mensagens registradas.</div> : messages.map((message) => <div className={`central-message ${message.direction}`} key={message.id}>
              {message.media_url && message.media_mime_type?.startsWith("image/") && <a href={message.media_url} target="_blank" rel="noreferrer" className="central-message-media"><img src={message.media_url} alt={message.media_filename ?? "Imagem recebida"} /></a>}
              {message.media_url && message.media_mime_type?.startsWith("video/") && <video className="central-message-media-video" src={message.media_url} controls preload="metadata" />}
              {message.media_url && !message.media_mime_type?.startsWith("image/") && !message.media_mime_type?.startsWith("video/") && <a href={message.media_url} target="_blank" rel="noreferrer" className="central-message-file"><FileText size={16}/>{message.media_filename ?? "Abrir anexo"}</a>}
              {message.body && <span>{message.body}</span>}
              {!message.body && !message.media_url && <span>[{message.message_type}]</span>}
              <small>{formatDateTime(message.sent_at)}{message.delivery_status ? ` · ${message.delivery_status}` : ""}</small>
            </div>)}
          </div>

          <CentralReplyComposer conversationId={details.conversation.conversation_id} provider={details.conversation.provider} quickReplies={quickReplies}/>

          <div className="central-customer-context central-customer-context-v2">
            <div><small>Contato</small><strong>{details.contact?.display_name ?? details.conversation.contact_name}</strong></div>
            <div><small>Telefone</small><strong>{details.contact?.phone ?? "—"}</strong></div>
            <div><small>E-mail</small><strong>{details.contact?.email ?? "—"}</strong></div>
            <div><small>Instagram</small><strong>{details.contact?.instagram_username ? `@${details.contact.instagram_username}` : "—"}</strong></div>
            <div><small>Vínculos</small><strong>{[details.contact?.supplements_customer_id ? "Suplementos" : null, details.contact?.fitness_customer_id ? "Fitness" : null].filter(Boolean).join(" + ") || "Ainda não vinculado"}</strong></div>
            {details.contact?.notes && <div className="central-context-notes"><small>Observação</small><strong>{details.contact.notes}</strong></div>}
            {details.contact?.id && <div className="central-context-actions"><Link className="button ghost compact-button" href={`/central/clientes/${details.contact.id}`}><UserRound size={14}/>Abrir contato</Link><CentralConversationFollowupForm conversationId={details.conversation.conversation_id}/>{details.contact.email && <span><Mail size={13}/>{details.contact.email}</span>}</div>}
          </div>
        </>}
      </article>
    </section>
  </>;
}
