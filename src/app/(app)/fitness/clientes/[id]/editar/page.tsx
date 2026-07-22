import { notFound } from "next/navigation";
import { FitnessCustomerForm } from "@/components/fitness-customer-form";
import { PageHeader } from "@/components/page-header";
import { getFitnessCustomer } from "@/lib/data";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;const customer=await getFitnessCustomer(id);if(!customer)notFound();return <><PageHeader eyebrow="Candinho Fitness · Clientes" title={`Editar ${customer.name}`} description="Atualize dados de contato e relacionamento."/><FitnessCustomerForm customer={customer}/></>}
