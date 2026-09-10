import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PhysiqueTrainingImportForm } from "@/components/physique-training-import-form";
import { getPhysiqueAthletes } from "@/lib/physique-data";

export default async function NewPhysiqueTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ atleta?: string }>;
}) {
  const [athletes, params] = await Promise.all([getPhysiqueAthletes(), searchParams]);

  return (
    <section className="physique-page physique-ux-page">
      <header className="physique-ux-page-header">
        <div>
          <Link className="physique-ux-back" href="/atletas/fichas">
            <ArrowLeft size={15} />
            Fichas
          </Link>
          <span>NEXUS</span>
          <h1>Importar ficha de treino</h1>
          <p>Envie o PDF, revise os dias identificados e só então grave a ficha no perfil do atleta.</p>
        </div>
      </header>

      {athletes.length === 0 ? (
        <div className="physique-empty compact">
          <strong>Cadastre um atleta primeiro</strong>
          <Link className="physique-action-button secondary" href="/atletas/atletas/novo">
            Novo atleta
          </Link>
        </div>
      ) : (
        <PhysiqueTrainingImportForm
          athletes={athletes.map((athlete) => ({
            id: athlete.id,
            display_name: athlete.display_name,
          }))}
          initialAthleteId={params.atleta ?? ""}
        />
      )}
    </section>
  );
}
