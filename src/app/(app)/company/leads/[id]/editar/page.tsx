import EditLeadPage from "../../../../leads/[id]/editar/page";

export default function CompanyEditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  return <EditLeadPage params={params} companyMode />;
}
