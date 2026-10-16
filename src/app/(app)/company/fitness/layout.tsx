import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyFitnessLayout({children}:{children:React.ReactNode}) {
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || !(access.role==="admin" || access.canAccessFitness)) redirect("/company/inicio");
  return children;
}
