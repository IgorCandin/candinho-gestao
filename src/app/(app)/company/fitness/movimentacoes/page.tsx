import MovementsPage from "@/app/(app)/fitness/movimentacoes/page";
export const dynamic = "force-dynamic";
export default function Page({searchParams}:{searchParams:Promise<{page?:string;q?:string;type?:string}>}){return <MovementsPage searchParams={searchParams} companyMode/>;}
