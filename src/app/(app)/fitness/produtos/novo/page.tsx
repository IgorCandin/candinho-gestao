import { redirect } from "next/navigation";
import { FitnessProductForm } from "@/components/fitness-product-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessSuppliers } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/produtos");const suppliers=await getFitnessSuppliers();return <><PageHeader eyebrow="Candinho Fitness" title="Novo produto" description="Cadastre o modelo e suas variações de tamanho e cor."/><FitnessProductForm suppliers={suppliers}/></>}
