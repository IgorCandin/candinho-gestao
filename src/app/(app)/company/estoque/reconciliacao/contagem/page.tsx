import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import CountPage from "@/app/(app)/estoque/reconciliacao/contagem/page";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{local?:string}>}){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || !(access.role==="admin" || access.canAccessSupplements)) redirect("/company/inicio");
  return <CountPage searchParams={searchParams} companyMode/>;
}
