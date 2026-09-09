import FitnessQuoteDetailPage from "../../../../fitness/orcamentos/[id]/page";

export default function CompanyFitnessQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <FitnessQuoteDetailPage params={params} companyMode />;
}
