import { redirect } from "next/navigation";
import { CompanyNewCustomerForm } from "@/components/company-new-customer-form";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyNewCustomerPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || (!access.canWriteSupplements && !access.canWriteFitness)) redirect("/company/clientes");
  return <div className="company-workspace-v2"><header className="company-workspace-head"><div><span>COMPANY · CRM GLOBAL</span><h1>Novo cliente</h1><p>Um único cadastro Company. O histórico define automaticamente se a pessoa comprou Suplementos, Fitness ou os dois.</p></div></header><CompanyNewCustomerForm canWriteSupplements={access.canWriteSupplements} canWriteFitness={access.canWriteFitness}/></div>;
}
