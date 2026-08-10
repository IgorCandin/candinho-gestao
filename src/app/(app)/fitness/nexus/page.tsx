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
        eyebrow="Candinho Fitness · Nexus"
        title="Nexus Fitness"
        description="Estoque, giro, reposição e campanhas organizados em próximos passos simples."
        action={
          <Link className="button ghost" href="/fitness">
            <ArrowLeft size={16} />
            Voltar
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
