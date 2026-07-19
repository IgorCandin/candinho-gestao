"use client";

import { Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CentralContact } from "@/lib/central-data";
import { createClient } from "@/lib/supabase/client";

export function CentralMediaLinkForm({
  assetId,
  currentContactId,
  currentConversationId,
  contacts,
}: {
  assetId: string;
  currentContactId: string | null;
  currentConversationId: string | null;
  contacts: CentralContact[];
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState(currentContactId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();

      // A Inbox está pausada. Mantemos um vínculo histórico de conversa somente
      // enquanto o contato não for trocado; ao trocar o contato, removemos esse
      // vínculo antigo para evitar associação inconsistente.
      const preserveConversation =
        Boolean(currentConversationId) &&
        contactId === (currentContactId ?? "");

      const { error } = await supabase.rpc("central_link_media_asset", {
        p_asset_id: assetId,
        p_contact_id: contactId || null,
        p_conversation_id: preserveConversation ? currentConversationId : null,
      });

      if (error) throw error;

      setMessage(
        preserveConversation
          ? "Vínculo com o contato atualizado. O histórico antigo foi preservado."
          : "Vínculo com o contato atualizado.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o vínculo.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="central-media-link-form">
    <label>
      <span>Contato</span>
      <select className="select" value={contactId} onChange={(event) => setContactId(event.target.value)}>
        <option value="">Sem contato</option>
        {contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.display_name}</option>)}
      </select>
    </label>

    {currentConversationId && (
      <small style={{ color: "var(--muted)", lineHeight: 1.5 }}>
        Esta mídia possui um vínculo histórico com uma conversa antiga. Como a Inbox está pausada,
        ele é preservado enquanto o contato não for trocado.
      </small>
    )}

    <button className="button ghost" type="button" onClick={save} disabled={loading}>
      {loading ? <LoaderCircle className="spin" size={15}/> : <Link2 size={15}/>}
      Salvar vínculo
    </button>

    {message && <small>{message}</small>}
  </div>;
}
