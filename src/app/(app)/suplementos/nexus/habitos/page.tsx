import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { redirect } from "next/navigation";
import { NexusHabitsPanel } from "@/components/nexus-habits-panel";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusDailySnapshot,
  type NexusDailySnapshot,
} from "@/lib/nexus-daily-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NexusHabitsPage() {
  const access = await getCurrentUserAccess();

  if (!(access.role === "admin" || access.canWriteSupplements)) {
    redirect("/suplementos");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("nexus_daily_snapshot_v1", {
    p_route: "/suplementos",
  });

  const snapshot =
    (data as NexusDailySnapshot | null) ??
    emptyNexusDailySnapshot("/suplementos");

  return (
    <>
      <PageHeader
        eyebrow="Nexus IA · Aprendizado local"
        title="Como o Nexus aprendeu sua rotina"
        description="Padrões de navegação usados para ordenar atalhos e detectar fluxos repetitivos. Não é leitura de conteúdo pessoal."
        action={
          <Link className="button ghost" href="/suplementos/nexus">
            <ArrowLeft size={15} /> Voltar ao Nexus
          </Link>
        }
      />

      <div className="nexus-habits-intro-v453">
        <Bot size={19} />
        <span>
          O objetivo não é vigiar uso: é descobrir onde você está gastando
          clique repetido para o ERP começar a encurtar o caminho sozinho.
        </span>
      </div>

      <NexusHabitsPanel snapshot={snapshot} />
    </>
  );
}
