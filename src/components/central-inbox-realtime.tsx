"use client";

import { Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CentralInboxRealtime() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 180);
    };

    const channel = supabase
      .channel("central-inbox-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "central_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "central_conversations" }, refresh)
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span className={`central-live-status ${connected ? "connected" : "connecting"}`}>
      <Radio size={13} />
      {connected ? "Ao vivo" : "Conectando..."}
    </span>
  );
}
