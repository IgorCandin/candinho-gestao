import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PhysiqueAthleteForm } from "@/components/physique-athlete-form";
export default function NewPhysiqueAthletePage(){return <section className="physique-page"><header className="physique-subpage-header"><Link href="/physique/atletas"><ArrowLeft size={16}/> Atletas</Link><div><span>Cadastro</span><h1>Novo atleta</h1><p>Comece com o essencial. Avaliações, fotos e treino ficam dentro do perfil.</p></div></header><article className="physique-panel"><PhysiqueAthleteForm/></article></section>;}
