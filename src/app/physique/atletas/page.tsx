import Link from "next/link";
import { ArrowLeft, Dumbbell, Plus, UserRound } from "lucide-react";
import { getPhysiqueAthletes } from "@/lib/physique-data";

export default async function PhysiqueAthletesPage() {
  const athletes = await getPhysiqueAthletes();
  return <section className="physique-page">
    <header className="physique-subpage-header"><Link href="/physique"><ArrowLeft size={16}/> Physique</Link><div><span>Acompanhamento</span><h1>Atletas</h1><p>Perfis acompanhados pela Physique e seus históricos de treino e evolução.</p></div><Link className="physique-action-button secondary" href="/physique/atletas/novo"><Plus size={15}/> Novo atleta</Link></header>
    {athletes.length===0?<div className="physique-empty"><UserRound size={28}/><strong>Nenhum atleta cadastrado</strong><p>Cadastre o primeiro atleta para iniciar avaliações e fichas.</p></div>:<div className="physique-athlete-list">{athletes.map((athlete)=><Link href={`/physique/atletas/${athlete.id}`} key={athlete.id}><div><small>{athlete.status}</small><strong>{athlete.display_name}</strong><span>{athlete.primary_goal??"Objetivo ainda não informado"}</span></div><div className="physique-athlete-plan-count"><Dumbbell size={15}/>{athlete.training_plan_count} ficha(s)</div></Link>)}</div>}
  </section>;
}
