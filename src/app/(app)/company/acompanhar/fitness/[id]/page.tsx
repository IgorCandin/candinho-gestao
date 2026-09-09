import FitnessPostSaleDetailPage from "../../../../fitness/pos-venda/[id]/page";

export default function CompanyFitnessPostSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <FitnessPostSaleDetailPage params={params} companyMode />;
}
export const dynamic = "force-dynamic";
