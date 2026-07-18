"use client";

import { LoaderCircle, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CentralTeamMember } from "@/lib/central-data";

export function CentralConversationAssignment({ conversationId, currentAssignedTo, team }: { conversationId: string; currentAssignedTo: string | null; team: CentralTeamMember[] }) {
  const router = useRouter();
  const [value, setValue] = useState(currentAssignedTo ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(nextValue: string) {
    setValue(nextValue);
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("central_assign_conversation", {
        p_conversation_id: conversationId,
        p_assigned_to: nextValue || null,
      });
      if (error) throw error;
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar o responsável.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="central-assignment-control">
    <UserCheck size={15}/>
    <select value={value} onChange={(event) => save(event.target.value)} disabled={loading} aria-label="Responsável pelo atendimento">
      <option value="">Sem responsável</option>
      {team.map((member) => <option value={member.id} key={member.id}>{member.full_name || member.email || "Usuário"}</option>)}
    </select>
    {loading && <LoaderCircle className="spin" size={14}/>} 
    {message && <small>{message}</small>}
  </div>;
}
