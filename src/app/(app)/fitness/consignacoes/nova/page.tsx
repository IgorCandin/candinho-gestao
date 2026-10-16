import { redirect } from "next/navigation";
import { FitnessConsignmentForm } from "@/components/fitness-consignment-form";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getFitnessStock,
} from "@/lib/data";
import { getFitnessCompanyCustomerDirectory } from "@/lib/fitness-customer-directory-data";

export default async function Page({companyMode=false}:{companyMode?:boolean}={}) {
  const access = await getCurrentUserAccess();

  if (!access.canWriteFitness) {
    redirect(companyMode ? "/company/inicio" : "/fitness");
  }

  const [stock, customers] = await Promise.all([
    getFitnessStock(),
    getFitnessCompanyCustomerDirectory(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Consignações"
        title="Nova prova de peças"
        description="A cliente pode vir da base de Suplementos ou da Fitness; os dados compartilhados aparecem automaticamente."
      />

      <FitnessConsignmentForm
        stock={stock}
        customers={customers}
        responsible={access.name}
        companyMode={companyMode}
      />
    </>
  );
}
