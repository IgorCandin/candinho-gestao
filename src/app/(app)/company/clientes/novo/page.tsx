import { redirect } from "next/navigation";
import { CompanyNewCustomerForm } from "@/components/company-new-customer-form";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyNewCustomerPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || (!access.canWriteSupplements && !access.canWriteFitness)) redirect("/company/clientes");
  return <div className="company-workspace-v2"><header className="company-workspace-head"><div><span>COMPANY · CRM GLOBAL</span><h1>Novo cliente</h1><p>Cadastre uma vez e escolha em quais operações a pessoa será atendida.</p></div></header><CompanyNewCustomerForm canWriteSupplements={access.canWriteSupplements} canWriteFitness={access.canWriteFitness}/></div>;
}
