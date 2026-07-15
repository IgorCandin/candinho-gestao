import { redirect } from "next/navigation";
import { FitnessPurchaseOrderForm } from "@/components/fitness-purchase-order-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessStock,getFitnessSuppliers } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/pedidos");const [stock,suppliers]=await Promise.all([getFitnessStock(),getFitnessSuppliers()]);return <><PageHeader eyebrow="Candinho Fitness" title="Novo pedido" description="Inclua várias peças, tamanhos e cores do mesmo fornecedor."/><FitnessPurchaseOrderForm stock={stock} suppliers={suppliers} responsible={access.name}/></>}
