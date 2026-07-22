import { redirect } from "next/navigation";
import { FitnessQuoteForm } from "@/components/fitness-quote-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessCustomers,getFitnessStock } from "@/lib/data";

export default async function Page(){
 const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness");
 const[stock,customers]=await Promise.all([getFitnessStock(),getFitnessCustomers()]);
 return <><PageHeader eyebrow="Candinho Fitness · Comercial" title="Novo orçamento" description="Monte a proposta por peça, tamanho e cor. Depois gere o PDF ou converta diretamente em venda."/><FitnessQuoteForm stock={stock} customers={customers} responsible={access.name}/></>
}
