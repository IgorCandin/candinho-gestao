import { NewLeadForm } from "@/components/new-lead-form";
import { PageHeader } from "@/components/page-header";
import { getCustomerOptions, getProductOptions } from "@/lib/data";

export default async function CompanyNewLeadPage() {
  const [customers, products] = await Promise.all([getCustomerOptions(), getProductOptions()]);
  return <><PageHeader eyebrow="Company · Comercial" title="Novo lead" description="Registre o interesse e retorne diretamente para a fila comercial da Company."/><NewLeadForm customers={customers} products={products} companyMode/></>;
}
