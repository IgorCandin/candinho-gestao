import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
import { OperationalSuppliesAdmin } from "@/components/operational-supplies-admin";
import { PageHeader } from "@/components/page-header";

export default async function OperationalSuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const operation = params.operacao === "fitness" ? "fitness" : "supplements";

  return (
    <>
      <PageHeader
        eyebrow="Custos e insumos"
        title="Editar materiais"
        description="Corrija cadastro, saldo e custo; defina se o material é usado quando o produto chega ou se será escolhido no momento da entrega."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href={operation === "fitness" ? "/fitness/estoque/custos" : "/estoque/custos"}
            >
              <ArrowLeft size={16} /> Voltar aos custos
            </Link>
            <Link className="button ghost" href={operation === "fitness" ? "/fitness/estoque" : "/estoque"}>
              <Boxes size={16} /> Estoque
            </Link>
          </div>
        }
      />
      <OperationalSuppliesAdmin initialOperation={operation} />
    </>
  );
}
