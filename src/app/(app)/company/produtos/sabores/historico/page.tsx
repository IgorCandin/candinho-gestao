import HistoricalFlavorPage from "@/app/(app)/produtos/sabores/historico/page";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  return <HistoricalFlavorPage searchParams={searchParams} companyMode />;
}
