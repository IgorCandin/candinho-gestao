import Link from "next/link";
import { ArrowLeft, Bot, Command } from "lucide-react";
import { redirect } from "next/navigation";
import { NexusUnifiedQueue } from "@/components/nexus-unified-queue";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusUnifiedQueue,
  type NexusUnifiedQueueSnapshot,
} from "@/lib/nexus-unified-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NexusUnifiedQueuePage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("nexus_unified_queue_v1", {
    p_limit: 120,
  });

  const snapshot =
    (data as NexusUnifiedQueueSnapshot | null) ?? emptyNexusUnifiedQueue();

  return (
    <>
      <PageHeader
        eyebrow="Candinho Company · Nexus"
        title="Fila Única"
        description="Uma ordem de execução por cima das filas oficiais. O dado continua pertencendo a Suplementos, Fitness, Bank ou Central."
        action={
          <div className="page-header-actions">
            <span className="badge green">
              <Bot size={14} /> Sem duplicar registros
            </span>
            <Link className="button ghost" href="/dashboard">
              <ArrowLeft size={14} /> Company
            </Link>
          </div>
        }
      />

      <div className="nexus-command-tip-v454">
        <Command size={15} />
        <span>
          Aperte <strong>Ctrl+K</strong> em qualquer tela para pedir “abrir
          entradas”, “nova venda”, “o que faço agora?” ou preparar uma tarefa.
        </span>
      </div>

      <NexusUnifiedQueue initialSnapshot={snapshot} />
    </>
  );
}
