import { redirect } from "next/navigation";
import { FitnessConsignmentForm } from "@/components/fitness-consignment-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessCustomers,getFitnessStock } from "@/lib/data";

export default async function Page(){
 const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness");
 const[stock,customers]=await Promise.all([getFitnessStock(),getFitnessCustomers()]);
 return <><PageHeader eyebrow="Candinho Fitness · Consignações" title="Nova prova de peças" description="Separe as peças que a cliente vai experimentar. Elas ficam indisponíveis para novas vendas até o acerto."/><FitnessConsignmentForm stock={stock} customers={customers} responsible={access.name}/></>
}
