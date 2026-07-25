import Link from "next/link";
import { ArrowLeft, Boxes, CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OperationalCostsManager } from "@/components/operational-costs-manager";

export function OperationalCostsPage({
  operation = "supplements",
}: {
  operation?: "supplements" | "fitness";
}) {
  const backHref = operation === "fitness" ? "/fitness/estoque" : "/estoque";
  return (
    <>
      <PageHeader
        eyebrow="Custos reais"
        title="Custos e insumos"
        description="Controle sacolas, etiquetas e materiais pelo custo médio; congele o custo real na entrega e acompanhe a margem de contribuição sem duplicar saídas no Bank."
        action={
          <div className="page-header-actions">
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
