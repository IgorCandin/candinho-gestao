import { redirect } from "next/navigation";
import { OperationalCostsPage } from "@/components/operational-costs-page";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralOperationalCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const [params, access] = await Promise.all([
    searchParams,
    getCurrentUserAccess(),
  ]);

  if (
    access.role !== "admin" &&
    !access.canWriteSupplements &&
    !access.canWriteFitness
  ) {
    redirect("/central");
  }

  const operation =
    params.operacao === "fitness" ? "fitness" : "supplements";

  return <OperationalCostsPage operation={operation} />;
}
