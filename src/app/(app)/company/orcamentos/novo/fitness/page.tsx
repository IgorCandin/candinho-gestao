import FitnessNewQuotePage from "../../../../fitness/orcamentos/novo/page";

export default function CompanyFitnessNewQuotePage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  return <FitnessNewQuotePage searchParams={searchParams} companyMode />;
}
