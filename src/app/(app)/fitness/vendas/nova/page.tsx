import { redirect } from "next/navigation";
import { FitnessSaleForm } from "@/components/fitness-sale-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessCustomers,getFitnessStock } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/vendas");const [stock,customers]=await Promise.all([getFitnessStock(),getFitnessCustomers()]);return <><PageHeader eyebrow="Candinho Fitness" title="Nova venda" description="Reserve ao salvar e baixe o estoque somente na entrega."/><FitnessSaleForm stock={stock} customers={customers} responsible={access.name}/></>}
