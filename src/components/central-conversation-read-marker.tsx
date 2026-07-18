"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralConversationReadMarker({ conversationId, unreadCount }: { conversationId: string; unreadCount: number }) {
  useEffect(() => {
    if (!conversationId || unreadCount <= 0) return;
    const supabase = createClient();
    void supabase.rpc("central_mark_conversation_read", { p_conversation_id: conversationId });
  }, [conversationId, unreadCount]);
  return null;
}
