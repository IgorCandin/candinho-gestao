import FitnessProductPage from "../../../../fitness/produtos/[id]/page";

export default function CompanyFitnessProductPage({ params }: { params: Promise<{ id: string }> }) {
  return <FitnessProductPage params={params} companyMode />;
}

export const dynamic = "force-dynamic";
