import { redirect } from "next/navigation";
import PartnerSetupPage from "@/app/(app)/parceiros/configuracao/page";
import { getCurrentUserAccess } from "@/lib/data";
export const dynamic="force-dynamic";
export default async function CompanyPartnerSetupPage(){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || !(access.role==="admin" || access.canAccessSupplements)) redirect("/company/inicio");
  return <PartnerSetupPage/>;
}
