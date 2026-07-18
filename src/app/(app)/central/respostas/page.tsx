import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { CentralQuickRepliesManager } from "@/components/central-quick-replies-manager";
import { PageHeader } from "@/components/page-header";
import { getAllCentralQuickReplies } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralQuickRepliesPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canWriteSupplements || access.canWriteFitness || access.canWriteMarketing)) redirect("/central");
  const replies = await getAllCentralQuickReplies();
  return <>
    <PageHeader eyebrow="Candinho Central" title="Respostas rápidas" description="Textos prontos para carregar no atendimento. Nada é enviado automaticamente: você continua revisando antes de responder." />
    <div className="central-info-banner"><MessageSquareText size={19}/><span><strong>{replies.filter((item) => item.active).length} resposta(s) ativa(s)</strong><small>Respostas da Company aparecem em todas as operações; respostas específicas aparecem somente no escopo correspondente.</small></span></div>
    <CentralQuickRepliesManager initialReplies={replies}/>
  </>;
}
