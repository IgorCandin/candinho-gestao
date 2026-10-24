import { redirect } from "next/navigation";
import { CompanyNewCustomerForm } from "@/components/company-new-customer-form";
import { getCurrentUserAccess, getCustomerOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyNewCustomerPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || (!access.canWriteSupplements && !access.canWriteFitness)) redirect("/company/clientes");
  const [customers, partners] = access.canWriteSupplements ? await Promise.all([
    getCustomerOptions(),
    createClient().then(async (supabase) => {
      const { data, error } = await supabase.from("partners").select("id,name,partner_type,city").eq("active", true).neq("partner_type", "supplier").order("name");
      if (error) throw error;
      return data ?? [];
    }),
  ]) : [[], []];
  return <div className="company-workspace-v2"><header className="company-workspace-head"><div><span>COMPANY · CRM GLOBAL</span><h1>Novo cliente</h1><p>Um único cadastro Company. O histórico define automaticamente se a pessoa comprou Suplementos, Fitness ou os dois.</p></div></header><CompanyNewCustomerForm canWriteSupplements={access.canWriteSupplements} canWriteFitness={access.canWriteFitness} customers={customers} partners={partners}/></div>;
}
