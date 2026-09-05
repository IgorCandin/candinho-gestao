import { redirect } from "next/navigation";

export default async function CentralOperationalSuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const operation = params.operacao === "fitness" ? "fitness" : "supplements";
  redirect(`/company/custos-insumos/materiais?operacao=${operation}`);
}
