import Image from "next/image";
import Link from "next/link";
import { Activity, CalendarDays, Dumbbell, LogOut, Paperclip, Plus, ShieldCheck, UserRound } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPhysiqueFoundationSnapshot } from "@/lib/physique-data";

export default async function PhysiqueStandalonePage() {
  const snapshot = await getPhysiqueFoundationSnapshot();
  const brand = BRAND_ASSETS.physique.complete;
  return <>
    <header className="physique-hero physique-hero-standalone">
      <div className="physique-hero-logo"><Image src={brand.src} alt={brand.alt} width={brand.width} height={brand.height} priority /></div>
      <div className="physique-hero-copy">
        <span>Candinho Company · Operação exclusiva</span><h1>Physique Athletes</h1>
        <p>Acompanhamento de atletas, avaliações, evolução por fotos e fichas de treino. A operação continua integrada ao ERP, mas mantém uma navegação própria e enxuta.</p>
        <div className={`physique-operation-status ${snapshot.enabled ? "enabled" : "preparing"}`}><ShieldCheck size={15}/><strong>{snapshot.enabled ? "Operação habilitada" : "Preparando operação"}</strong></div>
        <div className="physique-inline-links"><span>ERP conectado</span><span>Clientes</span><span>Avaliações</span><span>Treinos</span><span>Evolução</span></div>
      </div>
    </header>

    <div className="physique-kpis">
      <article><UserRound size={18}/><small>Atletas</small><strong>{snapshot.athleteCount}</strong></article>
      <article><Activity size={18}/><small>Avaliações</small><strong>{snapshot.assessmentCount}</strong></article>
      <article><Dumbbell size={18}/><small>Fichas ativas</small><strong>{snapshot.activeTrainingPlanCount}</strong></article>
      <article><Paperclip size={18}/><small>Arquivos e fotos</small><strong>{snapshot.attachmentCount}</strong></article>
    </div>

    <div className="physique-foundation-grid">
      <Link href="/physique/atletas" className="physique-foundation-card physique-foundation-card-highlight"><UserRound size={22}/><div><span>Operação</span><h2>Atletas e evolução</h2><p>Abra o perfil do atleta para acompanhar avaliações, medidas, fotos e histórico de fichas.</p></div></Link>
      <Link href="/physique/fichas" className="physique-foundation-card physique-foundation-card-highlight"><Dumbbell size={22}/><div><span>Operação</span><h2>Fichas de treino</h2><p>Consulte as fichas estruturadas e importe um PDF com leitura do Nexus antes de salvar.</p></div></Link>
      <Link href="/physique/atletas/novo" className="physique-foundation-card"><Plus size={22}/><div><span>Ação rápida</span><h2>Novo atleta</h2><p>Cadastre somente o necessário e comece a registrar a evolução.</p></div></Link>
      <Link href="/physique/fichas/nova" className="physique-foundation-card"><CalendarDays size={22}/><div><span>Ação rápida</span><h2>Importar ficha</h2><p>Envie o PDF, deixe o Nexus organizar os dias e exercícios, revise e salve.</p></div></Link>
    </div>

    <div className="physique-standalone-actions"><Link href="/dashboard" className="physique-action-button secondary">Operações</Link><form action="/auth/signout" method="post"><button className="physique-action-button" type="submit"><LogOut size={15}/><span>Sair</span></button></form></div>
  </>;
}
