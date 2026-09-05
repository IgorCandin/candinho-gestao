import { redirect } from "next/navigation";

export default async function CentralOperationalCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const operation = params.operacao === "fitness" ? "fitness" : "supplements";
  redirect(`/company/custos-insumos?operacao=${operation}`);
}
