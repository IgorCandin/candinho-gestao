import PostSaleDetailPage from "../../../../pos-venda/[id]/page";

export default function CompanyPostSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PostSaleDetailPage params={params} companyMode />;
}
export const dynamic = "force-dynamic";
