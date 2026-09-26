import { CommercialRoutesPage } from "@/components/commercial-routes-page";

export default function CompanyRoutesPage({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  return <CommercialRoutesPage searchParams={searchParams} companyMode />;
}
