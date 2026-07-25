import Link from "next/link";
import {
  ArrowLeft,
  CircleDollarSign,
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
              <Settings2 size={16} /> Editar materiais
            </Link>
            <Link className="button ghost" href="/bank">
              <CircleDollarSign size={16} /> Ver Bank
            </Link>
            <Link className="button ghost" href={backHref}>
              <ArrowLeft size={16} /> Voltar ao estoque
            </Link>
          </div>
        }
      />
      <OperationalCostsManager initialOperation={operation} />
    </>
  );
}
