import Link from "next/link";
import {
  ArrowLeft,
  CircleDollarSign,
  Pencil,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OperationalCostsManager } from "@/components/operational-costs-manager";

export function OperationalCostsPage({
  operation = "supplements",
}: {
  operation?: "supplements" | "fitness";
}) {
  const backHref = operation === "fitness" ? "/fitness/estoque" : "/estoque";
  const manageHref =
    operation === "fitness"
      ? "/estoque/custos/materiais?operacao=fitness"
      : "/estoque/custos/materiais";

  return (
    <>
      <PageHeader
        eyebrow="Custos reais"
        title="Custos e insumos"
        description="Controle materiais, corrija cadastros, defina quando cada custo acontece e acompanhe a margem real sem duplicar saídas no Bank."
        action={
          <div className="page-header-actions">
            <Link className="button gold" href={manageHref}>
              <Settings2 size={16} />
              Editar materiais
            </Link>
            <Link className="button ghost" href="/bank">
              <CircleDollarSign size={16} />
              Ver Bank
            </Link>
            <Link className="button ghost" href={backHref}>
              <ArrowLeft size={16} />
              Voltar ao estoque
            </Link>
          </div>
        }
      />

      <article
        className="panel"
        style={{
          marginBottom: 16,
          borderColor: "rgba(245, 188, 63, .34)",
        }}
      >
        <div
          className="panel-body"
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 4, flex: "1 1 300px" }}>
            <strong>Nome errado ou material que não usa mais?</strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.45 }}>
              Abra o cadastro para renomear, corrigir regras ou arquivar o
              material sem apagar o histórico das compras e vendas.
            </span>
          </div>

          <Link className="button gold" href={manageHref}>
            <Pencil size={16} />
            Editar / arquivar materiais
          </Link>
        </div>
      </article>

      <OperationalCostsManager initialOperation={operation} />
    </>
  );
}
