import { redirect } from "next/navigation";
import { FitnessSaleForm } from "@/components/fitness-sale-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessStock } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/vendas");const stock=await getFitnessStock();return <><PageHeader eyebrow="Candinho Fitness" title="Nova venda" description="Reserve a peça ao salvar e baixe o estoque somente na entrega."/><FitnessSaleForm stock={stock}/></>}
