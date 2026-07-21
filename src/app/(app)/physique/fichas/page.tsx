import Link from "next/link";
import { ArrowLeft, Dumbbell, ExternalLink } from "lucide-react";
import { getPhysiqueTrainingPlans } from "@/lib/physique-data";

export default async function PhysiqueTrainingPlansPage() {
  const plans = await getPhysiqueTrainingPlans();

  return (
    <section className="physique-page">
      <header className="physique-subpage-header">
        <Link href="/physique"><ArrowLeft size={16} /> Physique</Link>
        <div>
          <span>Fundação · leitura</span>
          <h1>Fichas de treino</h1>
          <p>Estrutura pronta para ficha criada no ERP, ficha anexada ou modelo misto.</p>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="physique-empty">
          <Dumbbell size={28} />
          <strong>Nenhuma ficha cadastrada</strong>
          <p>A estrutura está pronta, mas a operação continua não inicializada.</p>
        </div>
      ) : (
        <div className="physique-plan-list">
          {plans.map((plan) => (
            <Link href={`/physique/fichas/${plan.id}`} key={plan.id}>
              <div>
                <small>{plan.status} · {plan.source_type}</small>
                <strong>{plan.title}</strong>
                <span>{plan.athlete_name} · {plan.goal ?? "Sem objetivo descrito"}</span>
              </div>
              <ExternalLink size={15} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
