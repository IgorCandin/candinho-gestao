import { redirect } from "next/navigation";
import { FitnessPurchaseOrderForm } from "@/components/fitness-purchase-order-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getFitnessStock, getFitnessSuppliers } from "@/lib/data";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/pedidos");const[stock,suppliers]=await Promise.all([getFitnessStock(),getFitnessSuppliers()]);return <><PageHeader eyebrow="Candinho Fitness · Compras" title="Novo pedido" description="Cadastre uma reposição e receba os itens total ou parcialmente quando chegarem."/><FitnessPurchaseOrderForm stock={stock} suppliers={suppliers} responsible={access.name}/></>}
