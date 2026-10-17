import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessConversionForm } from "@/components/fitness-conversion-form";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";

export const dynamic="force-dynamic";
export default async function FitnessConversionsPage(){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || access.role==="sales" || !access.canWriteFitness) redirect("/company/estoque?operacao=fitness");
  const stock=await getFitnessStock();
  return <><PageHeader title="Conversões Fitness" eyebrow="Company · Estoque" description="Transforme um conjunto em peças avulsas usando a mesma rotina de conversão existente. A saída e as entradas continuam registradas no histórico." action={<Link className="button ghost" href="/company/fitness/movimentacoes?type=conversion">Ver histórico de conversões</Link>}/><FitnessConversionForm stock={stock}/></>;
}
