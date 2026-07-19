import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessPdfBuilder } from "@/components/fitness-pdf-builder";
import { getCurrentUserAccess,getFitnessStock } from "@/lib/data";

export default async function Page(){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");const stock=await getFitnessStock();
 return <><PageHeader eyebrow="Candinho Fitness · Materiais" title="PDFs e catálogo" description="Gere um catálogo automático ou selecione exatamente as peças que quer apresentar para a cliente."/><FitnessPdfBuilder stock={stock}/></>
}
