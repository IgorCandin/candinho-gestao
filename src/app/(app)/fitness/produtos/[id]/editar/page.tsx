import { notFound, redirect } from "next/navigation";
import { FitnessProductForm } from "@/components/fitness-product-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getFitnessProduct, getFitnessSuppliers } from "@/lib/data";
export default async function Page({params}:{params:Promise<{id:string}>}){const access=await getCurrentUserAccess();if(!access.canWriteFitness)redirect("/fitness/produtos");const{id}=await params;const[data,suppliers]=await Promise.all([getFitnessProduct(id),getFitnessSuppliers()]);if(!data)notFound();return <><PageHeader eyebrow="Candinho Fitness · Catálogo" title={`Editar ${data.product.name}`} description="Atualize cadastro, preços, fornecedores e variações."/><FitnessProductForm product={data.product} variants={data.variants} suppliers={suppliers}/></>}
