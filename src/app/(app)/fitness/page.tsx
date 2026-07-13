import Image from "next/image";
import { PageHeader } from "@/components/page-header";

export default function FitnessPage() {
  return (
    <section className="fitness-placeholder">
      <PageHeader
        eyebrow="Candinho Fitness"
        title="Operação Fitness"
        description="A estrutura da Candinho Fitness será conectada na próxima etapa, com foco inicial em vendas."
      />
      <div className="panel fitness-placeholder-card">
        <Image src="/operation-fitness.png" alt="Candinho Fitness" width={709} height={236} />
        <p>Área preparada para receber a planilha e o fluxo comercial da Giulia.</p>
      </div>
    </section>
  );
}
