import Link from "next/link";
import { ArrowUpRight, Dumbbell, Plus, UserRound } from "lucide-react";
import { PhysiqueSectionNav } from "@/components/physique-section-nav";
import { getPhysiqueAthletes } from "@/lib/physique-data";

export default async function PhysiqueAthletesPage() {
  const athletes = await getPhysiqueAthletes();

  return (
    <section className="physique-page physique-ux-page">
      <PhysiqueSectionNav active="athletes" />

      <header className="physique-ux-page-header">
        <div>
          <span>ACOMPANHAMENTO</span>
          <h1>Atletas</h1>
          <p>Perfis acompanhados, objetivos e acesso rápido ao dossiê, evolução e treino.</p>
        </div>

        <Link className="physique-action-button secondary" href="/physique/atletas/novo">
          <Plus size={15} />
          Novo atleta
        </Link>
      </header>

      {athletes.length === 0 ? (
        <div className="physique-empty">
          <UserRound size={28} />
          <strong>Nenhum atleta cadastrado</strong>
          <p>Cadastre o primeiro atleta para iniciar avaliações e fichas.</p>
        </div>
      ) : (
        <div className="physique-ux-athlete-grid">
          {athletes.map((athlete) => (
            <Link className="physique-ux-athlete-card" href={`/physique/atletas/${athlete.id}`} key={athlete.id}>
              <div className="physique-ux-athlete-card-top">
                <span className="physique-ux-status active">{athlete.status}</span>
                <ArrowUpRight size={17} />
              </div>

              <div className="physique-ux-athlete-avatar">
                <UserRound size={24} />
              </div>

              <strong>{athlete.display_name}</strong>
              <p>{athlete.primary_goal ?? "Objetivo ainda não informado"}</p>

              <div className="physique-ux-athlete-numbers">
                <span>
                  <Dumbbell size={14} />
                  <b>{athlete.active_training_plan_count}</b> ativa(s)
                </span>
                <span>{athlete.training_plan_count} ficha(s) no histórico</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
