import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FitnessNexusCenter } from "@/components/fitness-nexus-center";
import { FitnessNexusPurchaseBasketV2 } from "@/components/fitness-nexus-purchase-basket-v2";
import { PageHeader } from "@/components/page-header";
import { getFitnessNexusSnapshot } from "@/lib/fitness-nexus-data";

export default async function FitnessNexusPage() {
  const snapshot = await getFitnessNexusSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor Operacional"
        title="Nexus Fitness"
        description="Estoque, giro, mix e sinais de demanda organizados em próximos passos. O histórico orienta família, tamanho e cor; a escolha do novo modelo e do fornecedor continua humana."
        action={
          <Link className="button ghost" href="/fitness/estoque">
            <ArrowLeft size={16} />
            Voltar ao Setor Operacional
          </Link>
        }
      />

      <div className="fitness-nexus-lab-v2">
        <FitnessNexusCenter snapshot={snapshot} />
      </div>
      <FitnessNexusPurchaseBasketV2 />
    </>
  );
}
