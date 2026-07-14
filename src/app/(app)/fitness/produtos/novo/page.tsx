import { redirect } from "next/navigation";
import { FitnessProductForm } from "@/components/fitness-product-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/produtos");return <><PageHeader eyebrow="Candinho Fitness" title="Nova peça" description="Cadastre o modelo e suas variações de tamanho e cor."/><FitnessProductForm/></>}
