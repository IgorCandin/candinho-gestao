import NewSalePage from "../../../../vendas/nova/page";

export default function CompanyNewSupplementSalePage({ searchParams }: { searchParams: Promise<{ quote?: string; cliente?: string; produto?: string; lead?: string }> }) {
  return <NewSalePage searchParams={searchParams} companyMode />;
}
