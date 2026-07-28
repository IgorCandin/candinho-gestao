import { redirect } from "next/navigation";

export default async function LegacyOperationalSuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const operation =
    params.operacao === "fitness" ? "fitness" : "supplements";

  redirect(
    `/central/custos-insumos/materiais?operacao=${operation}`,
  );
}
