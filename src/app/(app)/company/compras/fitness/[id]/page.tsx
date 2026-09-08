import FitnessOrderDetailsPage from "../../../../fitness/pedidos/[id]/page";

export default function CompanyFitnessOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <FitnessOrderDetailsPage params={params} companyMode />;
}
