"use client";

import { Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CentralContact, CentralInboxItem } from "@/lib/central-data";
import { createClient } from "@/lib/supabase/client";

export function CentralMediaLinkForm({ assetId, currentContactId, currentConversationId, contacts, conversations }: {
  assetId: string;
  currentContactId: string | null;
  currentConversationId: string | null;
  contacts: CentralContact[];
  conversations: CentralInboxItem[];
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState(currentContactId ?? "");
  const [conversationId, setConversationId] = useState(currentConversationId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const filteredConversations = useMemo(() => conversations.filter((item) => !contactId || item.contact_id === contactId), [conversations, contactId]);

  async function save() {
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_link_media_asset", {
        p_asset_id: assetId,
        p_contact_id: contactId || null,
        p_conversation_id: conversationId || null,
      });
      if (error) throw error;
      setMessage("Vínculo atualizado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o vínculo.");
    } finally { setLoading(false); }
  }

  return <div className="central-media-link-form">
    <label><span>Contato</span><select className="select" value={contactId} onChange={(event) => { setContactId(event.target.value); setConversationId(""); }}><option value="">Sem contato</option>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.display_name}</option>)}</select></label>
    <label><span>Conversa</span><select className="select" value={conversationId} onChange={(event) => setConversationId(event.target.value)}><option value="">Sem conversa</option>{filteredConversations.map((item) => <option value={item.conversation_id} key={item.conversation_id}>{item.provider} · {item.contact_name}</option>)}</select></label>
    <button className="button ghost" type="button" onClick={save} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Link2 size={15}/>}Salvar vínculo</button>
    {message && <small>{message}</small>}
  </div>;
}
