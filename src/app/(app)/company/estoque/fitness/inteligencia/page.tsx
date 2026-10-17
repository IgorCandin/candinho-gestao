import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import IntelligencePage from "@/app/(app)/fitness/estoque/inteligencia/page";
export const dynamic = "force-dynamic";
export default async function Page(){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || !(access.role==="admin" || access.canAccessFitness)) redirect("/company/inicio");
  return <IntelligencePage companyMode/>;
}
