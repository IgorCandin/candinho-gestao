import Link from "next/link";
import { Plus } from "lucide-react";
import {
  PhysiqueTrainingPlanBrowser,
  type PhysiqueTrainingPlanBrowserItem,
} from "@/components/physique-training-plan-browser";
import { PhysiqueSectionNav } from "@/components/physique-section-nav";
import { getPhysiqueTrainingPlans } from "@/lib/physique-data";

function planCounts(payload: Record<string, unknown>) {
  const days = Array.isArray(payload.days) ? payload.days : [];
  const exerciseCount = days.reduce((sum, day) => {
    if (!day || typeof day !== "object") return sum;
    const exercises = (day as Record<string, unknown>).exercises;
    return sum + (Array.isArray(exercises) ? exercises.length : 0);
  }, 0);

  return { daysCount: days.length, exerciseCount };
}

export default async function PhysiqueTrainingPlansPage() {
  const plans = await getPhysiqueTrainingPlans();

  const browserPlans: PhysiqueTrainingPlanBrowserItem[] = plans.map((plan) => {
    const counts = planCounts(plan.ai_payload);

    return {
      id: plan.id,
      title: plan.title,
      athleteName: plan.athlete_name ?? "Atleta",
      goal: plan.goal ?? "Sem objetivo descrito",
      status: plan.status,
      sourceType: plan.source_type,
      daysCount: counts.daysCount,
      exerciseCount: counts.exerciseCount,
      updatedAt: plan.updated_at || plan.created_at,
    };
  });

  return (
    <section className="physique-page physique-ux-page">
      <PhysiqueSectionNav active="training" />

      <header className="physique-ux-page-header">
        <div>
          <span>TREINOS</span>
          <h1>Fichas de treino</h1>
          <p>Consulte fichas ativas, histórico e estruturas importadas pelo Nexus.</p>
        </div>

        <Link className="physique-action-button secondary" href="/physique/fichas/nova">
          <Plus size={15} />
          Importar ficha
        </Link>
      </header>

      <PhysiqueTrainingPlanBrowser plans={browserPlans} />
    </section>
  );
}
