import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Boxes,
  Dumbbell,
} from "lucide-react";
import { OperationalSuppliesAdmin } from "@/components/operational-supplies-admin";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralOperationalSuppliesPage({
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

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Custos e insumos"
        title="Editar materiais"
        description="Renomeie, ajuste saldo/custo, altere a regra de consumo ou arquive um material sem apagar o histórico das operações."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href={`/central/custos-insumos?operacao=${operation}`}
            >
              <ArrowLeft size={16} />
              Voltar aos custos
            </Link>

            <Link
              className="button ghost"
              href={
                operation === "fitness"
                  ? "/fitness/estoque"
                  : "/estoque"
              }
            >
              {operation === "fitness" ? (
                <Dumbbell size={16} />
              ) : (
                <Boxes size={16} />
              )}
              Ver estoque da operação
            </Link>
          </div>
        }
      />

      <article className="panel" style={{ marginBottom: 16 }}>
        <div
          className="panel-body"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <Archive size={20} />
          <div style={{ display: "grid", gap: 4 }}>
            <strong>Material não é apagado do histórico</strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.45 }}>
              Se não usa mais um material, desative “Material ativo”. Ele deixa
              de aparecer nos fluxos novos, mas compras, custos e vendas antigas
              continuam auditáveis.
            </span>
          </div>
        </div>
      </article>

      <OperationalSuppliesAdmin initialOperation={operation} />
    </>
  );
}
