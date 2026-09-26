import { CommercialRoutesPage } from "@/components/commercial-routes-page";

export const dynamic = "force-dynamic";

export default function RoutesPage({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  return <CommercialRoutesPage searchParams={searchParams} />;
}
