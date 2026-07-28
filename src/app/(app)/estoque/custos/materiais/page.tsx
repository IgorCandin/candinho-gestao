import Link from "next/link";
import { Archive, ArrowLeft, Boxes } from "lucide-react";
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
        description="Renomeie, corrija saldo/custo e retire materiais do uso. Para preservar o histórico, excluir da operação é feito arquivando o material."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href={
                operation === "fitness"
                  ? "/fitness/estoque/custos"
                  : "/estoque/custos"
              }
            >
              <ArrowLeft size={16} />
              Voltar aos custos
            </Link>
            <Link
              className="button ghost"
              href={operation === "fitness" ? "/fitness/estoque" : "/estoque"}
            >
              <Boxes size={16} />
              Estoque
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
            <strong>Quer “excluir” um material?</strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.45 }}>
              Selecione o material e desative “Material ativo”. Ele some dos
              fluxos novos, mas compras, custos e auditorias antigas continuam
              corretos.
            </span>
          </div>
        </div>
      </article>

      <OperationalSuppliesAdmin initialOperation={operation} />
    </>
  );
}
