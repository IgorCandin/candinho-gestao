import { notFound } from "next/navigation";
import { SaleDetailsView } from "@/components/sale-details-view";
import { getSaleDetails } from "@/lib/data";
export default async function PendingOrderDetailsPage({params}:{params:Promise<{id:string}>}){const{id}=await params;const sale=await getSaleDetails(id);if(!sale)notFound();return <SaleDetailsView sale={sale} eyebrow="Pedido pendente" backHref="/pedidos-pendentes" backLabel="Voltar aos pedidos"/>;}
