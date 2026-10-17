import Link from "next/link";
import { Bot, Route, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { NexusCommandCenter } from "@/components/nexus-command-center";
import { NexusOperatingChat } from "@/components/nexus-operating-chat";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getCustomerOptions } from "@/lib/data";
import { getNexusBrief } from "@/lib/nexus-operating-context";

export default async function SupplementsNexusPage({companyMode=false}:{companyMode?:boolean}={}) {
  const access = await getCurrentUserAccess();

  if (!(access.role === "admin" || access.canWriteSupplements)) {
    redirect(companyMode ? "/company/inicio" : "/suplementos");
  }

  const [customers, brief] = await Promise.all([
    getCustomerOptions(),
    getNexusBrief({ refresh: true, signalLimit: 160 }),
  ]);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Nexus IA"
        description="Uma camada operacional acima do ERP: cruza módulos, organiza prioridades, aprende a rotina e prepara ações seguras antes da execução."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href={companyMode ? "/company/suplementos/nexus/habitos" : "/suplementos/nexus/habitos"}>
              <Route size={14} /> Hábitos aprendidos
            </Link>
            <span className="badge green">
              <Bot size={14} /> Copiloto interno
            </span>
          </div>
        }
      />

      <div className="nexus-operating-page">
        <NexusCommandCenter initialBrief={brief} companyMode={companyMode} />

        <div className="nexus-operating-divider">
          <span><Bot size={15} /> Pergunte ao Nexus</span>
          <small>
            <ShieldCheck size={12} /> O Nexus pode preparar ações, mas execução
            operacional exige preview e confirmação.
          </small>
        </div>

        <NexusOperatingChat customers={customers} companyMode={companyMode} />
      </div>
    </>
  );
}
