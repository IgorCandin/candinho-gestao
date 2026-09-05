import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  Dumbbell,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OperationalCostsManager } from "@/components/operational-costs-manager";

export function OperationalCostsPage({
  operation = "supplements",
}: {
  operation?: "supplements" | "fitness";
}) {
  const manageHref =
    operation === "fitness"
      ? "/company/custos-insumos/materiais?operacao=fitness"
      : "/company/custos-insumos/materiais?operacao=supplements";

  return (
    <>
      <PageHeader
        eyebrow="Company · Gestão"
        title="Custos e insumos"
        description="Controle os materiais e custos de Suplementos e Fitness em uma única área, sem misturar os saldos e as regras de cada operação."
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

            <Link className="button ghost" href="/company/dia">
              Voltar à Gestão
            </Link>
          </div>
        }
      />

      <article className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 5, flex: "1 1 420px" }}>
              <strong>Um controle para as duas operações</strong>
              <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                Etiquetas, sacolas, cartões, lacres e outros materiais ficam
                centralizados aqui. O campo de operação continua definindo se o
                insumo é compartilhado, de Suplementos ou de Fitness.
              </span>
            </div>

            <div className="page-header-actions">
              <Link
                className={`button ${
                  operation === "supplements" ? "gold" : "ghost"
                }`}
                href="/company/custos-insumos?operacao=supplements"
              >
                <Boxes size={15} />
                Suplementos
              </Link>

              <Link
                className={`button ${
                  operation === "fitness" ? "gold" : "ghost"
                }`}
                href="/company/custos-insumos?operacao=fitness"
              >
                <Dumbbell size={15} />
                Fitness
              </Link>
            </div>
          </div>
        </div>
      </article>

      <div className="central-shared-costs-theme">
        <OperationalCostsManager initialOperation={operation} />
      </div>
    </>
  );
}
