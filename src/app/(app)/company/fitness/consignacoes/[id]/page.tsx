import ConsignmentPage from "@/app/(app)/fitness/consignacoes/[id]/page";
export const dynamic = "force-dynamic";
export default function Page({params}:{params:Promise<{id:string}>}){return <ConsignmentPage params={params} companyMode/>;}
