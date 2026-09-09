import QuoteDetailsPage from "../../../orcamentos/[id]/page";

export default function CompanyQuoteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <QuoteDetailsPage params={params} companyMode />;
}
