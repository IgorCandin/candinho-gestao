import ReconciliationPage from "@/app/(app)/estoque/reconciliacao/page";
export const dynamic="force-dynamic";
export default function Page({searchParams}:{searchParams:Promise<{status?:string}>}){return <ReconciliationPage searchParams={searchParams} companyMode/>;}
