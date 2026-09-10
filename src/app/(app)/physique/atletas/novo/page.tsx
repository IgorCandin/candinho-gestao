import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { PhysiqueAthleteForm } from "@/components/physique-athlete-form";

export default function NewPhysiqueAthletePage() {
  return (
    <section className="physique-page physique-ux-page">
      <header className="physique-ux-page-header">
        <div>
          <Link className="physique-ux-back" href="/atletas/atletas">
            <ArrowLeft size={15} />
            Atletas
          </Link>
          <span>CADASTRO</span>
          <h1>Novo atleta</h1>
          <p>Comece com o essencial. Dossiê, avaliações, fotos, patrocínios e treinos ficam dentro do perfil.</p>
        </div>
        <div className="physique-ux-header-icon"><UserPlus size={24} /></div>
      </header>

      <article className="physique-panel physique-ux-form-panel">
        <PhysiqueAthleteForm />
      </article>
    </section>
  );
}
