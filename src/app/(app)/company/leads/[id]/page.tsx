import LeadDetailsPage from "../../../leads/[id]/page";

export default function CompanyLeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetailsPage params={params} companyMode />;
}
