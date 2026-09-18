import FitnessNewSalePage from "../../../../fitness/vendas/nova/page";

export default function CompanyFitnessNewSalePage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  return <FitnessNewSalePage companyMode searchParams={searchParams} />;
}
