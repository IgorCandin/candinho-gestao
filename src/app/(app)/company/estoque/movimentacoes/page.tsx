import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import MovementsPage from "@/app/(app)/movimentacoes/page";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{page?:string;q?:string;type?:string}>}){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner" || !(access.role==="admin" || access.canAccessSupplements)) redirect("/company/inicio");
  return <MovementsPage searchParams={searchParams} companyMode/>;
}
