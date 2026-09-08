import { notFound } from "next/navigation";
import { FitnessCustomerForm } from "@/components/fitness-customer-form";
import { PageHeader } from "@/components/page-header";
import { getFitnessCustomer } from "@/lib/data";

export default async function CompanyEditFitnessCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getFitnessCustomer(id);
  if (!customer) notFound();
  return <><PageHeader eyebrow="Company · Ficha de Clientes · Fitness" title={`Editar ${customer.name}`} description="Atualize o cadastro sem sair da Company."/><FitnessCustomerForm customer={customer} companyMode/></>;
}
