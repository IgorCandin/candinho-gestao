import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Boxes, Dumbbell } from "lucide-react";
import { OperationalSuppliesAdmin } from "@/components/operational-supplies-admin";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyOperationalSuppliesPage({
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
    redirect("/company/dia");
  }

  const operation =
    params.operacao === "fitness" ? "fitness" : "supplements";

  return (
    <>
      <PageHeader
        eyebrow="Company · Gestão · Custos e insumos"
        title="Editar materiais"
        description="Ajuste saldo, custo e regras dos materiais usados por Suplementos, Fitness ou pelas duas operações."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href={`/company/custos-insumos?operacao=${operation}`}
            >
              <ArrowLeft size={16} />
              Voltar aos custos
            </Link>
            <Link
              className="button ghost"
              href={operation === "fitness" ? "/fitness/estoque" : "/estoque"}
            >
              {operation === "fitness" ? <Dumbbell size={16} /> : <Boxes size={16} />}
              Ver estoque da operação
            </Link>
          </div>
        }
      />

      <article className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Archive size={20} />
          <div style={{ display: "grid", gap: 4 }}>
            <strong>O histórico permanece intacto</strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.45 }}>
              Ao desativar um material, ele deixa de aparecer nos fluxos novos,
              mas compras, custos e vendas antigas continuam disponíveis para conferência.
            </span>
          </div>
        </div>
      </article>

      <OperationalSuppliesAdmin initialOperation={operation} />
    </>
  );
}
