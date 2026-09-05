import { notFound } from "next/navigation";
import { FitnessSupplierForm } from "@/components/fitness-supplier-form";
import { PageHeader } from "@/components/page-header";
import { getFitnessSupplier } from "@/lib/data";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;const supplier=await getFitnessSupplier(id);if(!supplier)notFound();return <><PageHeader eyebrow="Company · Fitness" title={`Editar ${supplier.name}`} description="Atualize contatos, site e observações."/><FitnessSupplierForm supplier={supplier} returnBase="/company/fornecedores/fitness"/></>}
