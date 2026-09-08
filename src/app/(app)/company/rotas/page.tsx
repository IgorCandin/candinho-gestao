import CommercialRoutesPage from "../../vendas/rotas/page";

export default function CompanyRoutesPage({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  return <CommercialRoutesPage searchParams={searchParams} companyMode />;
}
