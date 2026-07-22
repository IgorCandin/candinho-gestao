import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductComboForm } from "@/components/product-combo-form";
import { getProductComboDetails, getProductOptions } from "@/lib/data";
export default async function EditComboPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const [combo,products]=await Promise.all([getProductComboDetails(id),getProductOptions()]);if(!combo)notFound();return <><PageHeader eyebrow="Catálogo · Combos" title={combo.name} description="Ajuste composição, preço e disponibilidade da oferta."/><ProductComboForm combo={combo} products={products}/></>}
