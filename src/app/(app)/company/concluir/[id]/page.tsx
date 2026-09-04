import { notFound, redirect } from "next/navigation";
import { SaleDetailsView } from "@/components/sale-details-view";
import { getCurrentUserAccess, getSaleDetails } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CompanyCompletionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const { id } = await params;
  const sale = await getSaleDetails(id);
  if (!sale) notFound();
  return <SaleDetailsView sale={sale} eyebrow="Company · Concluir venda" backHref="/company/concluir" backLabel="Voltar às pendências" />;
}
