import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessStockConferenceForm } from "@/components/fitness-stock-conference-form";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function CompanyFitnessConferencePage() {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canWriteFitness || access.role === "sales") redirect("/company/estoque?operacao=fitness");
  const stock = await getFitnessStock();
  return <><PageHeader eyebrow="Company · Estoque Fitness" title="Conferência física" description="Mesma rotina auditável da Fitness, sem sair da Company." action={<Link href="/company/estoque?operacao=fitness">Voltar ao estoque</Link>}/><FitnessStockConferenceForm stock={stock}/></>;
}
