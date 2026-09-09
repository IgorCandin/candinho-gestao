import NewSalePage from "../../../../vendas/nova/page";

export default function CompanyNewSupplementQuotePage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  return <NewSalePage searchParams={searchParams} companyMode />;
}
