import FitnessSaleDetailPage from "../../../../fitness/vendas/[id]/page";

export default function CompanyFitnessSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <FitnessSaleDetailPage params={params} companyMode />;
}

export const dynamic = "force-dynamic";
