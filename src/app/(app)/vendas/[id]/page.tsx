import { notFound } from "next/navigation";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { SaleDetailsView } from "@/components/sale-details-view";
import { getEntitySwipeNavigation, getSaleDetails } from "@/lib/data";
export default async function SaleDetailsPage({params}:{params:Promise<{id:string}>}){const{id}=await params;const[sale,swipe]=await Promise.all([getSaleDetails(id),getEntitySwipeNavigation("sale",id)]);if(!sale)notFound();return <><EntitySwipeNavigator previous={swipe.previous} next={swipe.next}/><SaleDetailsView sale={sale} backHref="/vendas" backLabel="Voltar às vendas"/></>;}
