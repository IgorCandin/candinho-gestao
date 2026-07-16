import Link from "next/link";
import { notFound } from "next/navigation";
import { FitnessStockActions } from "@/components/fitness-stock-actions";
import { PageHeader } from "@/components/page-header";
import { getFitnessStock } from "@/lib/data";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;const variant=(await getFitnessStock()).find((row)=>row.variant_id===id);if(!variant)notFound();return <><PageHeader eyebrow="Candinho Fitness · Estoque" title={`${variant.product_name} · ${variant.size} · ${variant.color}`} description={`Físico ${variant.physical_quantity} · Reservado ${variant.reserved_quantity} · Disponível ${variant.available_quantity}`} action={<Link className="button ghost" href="/fitness/estoque">Voltar ao estoque</Link>}/><FitnessStockActions variant={variant}/></>}
