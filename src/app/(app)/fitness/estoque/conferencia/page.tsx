import { PageHeader } from "@/components/page-header";
import { FitnessStockConferenceForm } from "@/components/fitness-stock-conference-form";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function FitnessStockConferencePage() {
  const [access, stock] = await Promise.all([getCurrentUserAccess(), getFitnessStock()]);
  if (!access.canWriteFitness || access.role === "sales") redirect("/fitness/estoque");
  return <><PageHeader eyebrow="Candinho Fitness · Operacional" title="Conferência de estoque" description="Compare o físico com o sistema e registre somente as diferenças." /><FitnessStockConferenceForm stock={stock} /></>;
}
