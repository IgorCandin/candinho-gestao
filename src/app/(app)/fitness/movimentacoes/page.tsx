import FitnessMovementsPage from "@/components/operational-pages/fitness-movements-page";

export default function Page({ searchParams }: {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
}) {
  return <FitnessMovementsPage searchParams={searchParams} />;
}
