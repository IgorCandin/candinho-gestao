import FitnessNewSalePage from "../../../../fitness/vendas/nova/page";

export default function CompanyFitnessNewSalePage({ searchParams }: { searchParams: Promise<{ interest?: string; cliente?: string; variante?: string }> }) {
  return <FitnessNewSalePage companyMode searchParams={searchParams} />;
}
