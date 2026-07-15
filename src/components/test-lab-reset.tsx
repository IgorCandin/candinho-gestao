"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TestLabOperation } from "@/lib/types";

export function TestLabReset({ operation }: { operation: TestLabOperation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    if (!window.confirm("Resetar a Área de Teste? Todas as vendas, pedidos e movimentações fictícias desta operação serão apagadas e os 3 produtos de teste voltarão ao estoque inicial.")) return;
    setLoading(true); setMessage(null);
    try {
      const { error } = await createClient().rpc("test_lab_reset", { p_operation: operation });
      if (error) throw error;
      setMessage("Área de Teste restaurada para o estado inicial.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível resetar a área de teste.");
    } finally { setLoading(false); }
  }

  return <div className="test-lab-reset-wrap"><button className="button danger" type="button" disabled={loading} onClick={reset}>{loading?<LoaderCircle className="spin" size={16}/>:<RotateCcw size={16}/>}Resetar ambiente</button>{message&&<small>{message}</small>}</div>;
}
