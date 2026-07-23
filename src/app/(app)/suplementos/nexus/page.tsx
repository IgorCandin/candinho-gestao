import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SupplementNexusChat } from "@/components/supplement-nexus-chat";
import { getCurrentUserAccess, getCustomerOptions } from "@/lib/data";

export default async function SupplementsNexusPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canWriteSupplements)) redirect("/suplementos");
  const customers = await getCustomerOptions();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Candinho Suplementos"
        title="Nexus IA"
        description="Converse com o Nexus usando o catálogo, o estoque disponível e, quando você escolher uma cliente, o contexto real do CRM."
        action={<span className="badge green"><Bot size={14} /> Assistente interno</span>}
      />
      <SupplementNexusChat customers={customers} />
    </>
  );
}
