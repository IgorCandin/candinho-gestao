import NewSalePage from "../../../../vendas/nova/page";

export default function CompanyNewSupplementSalePage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  return <NewSalePage searchParams={searchParams} companyMode />;
}
