import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Dumbbell,
  FileArchive,
  Link2,
  Paperclip,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPhysiqueFoundationSnapshot } from "@/lib/physique-data";

export default async function PhysiqueFoundationPage() {
  const snapshot = await getPhysiqueFoundationSnapshot();
  const brand = BRAND_ASSETS.physique.complete;

  return (
    <section className="physique-page">
      <header className="physique-hero">
        <div className="physique-hero-logo">
          <Image
            src={brand.src}
            alt={brand.alt}
            width={brand.width}
            height={brand.height}
            priority
          />
        </div>

        <div className="physique-hero-copy">
          <span>Candinho Company · Nova operação</span>
          <h1>Physique Athletes</h1>
          <p>
            Fundação da operação de acompanhamento de atletas e fichas de treino.
            A estrutura está implantada no ERP, mas a operação continua oficialmente
            não inicializada.
          </p>

          <div className={`physique-operation-status ${snapshot.enabled ? "enabled" : "preparing"}`}>
            <ShieldCheck size={15} />
            <strong>{snapshot.enabled ? "Operação habilitada" : "Em preparação · Não inicializada"}</strong>
          </div>
        </div>
      </header>

      <div className="physique-kpis">
        <article>
          <UserRound size={18} />
          <small>Atletas cadastrados</small>
          <strong>{snapshot.athleteCount}</strong>
        </article>
        <article>
          <Dumbbell size={18} />
          <small>Fichas de treino</small>
          <strong>{snapshot.trainingPlanCount}</strong>
        </article>
        <article>
          <CalendarDays size={18} />
          <small>Fichas ativas</small>
          <strong>{snapshot.activeTrainingPlanCount}</strong>
        </article>
        <article>
          <Paperclip size={18} />
          <small>Anexos</small>
          <strong>{snapshot.attachmentCount}</strong>
        </article>
      </div>

      <div className="physique-foundation-grid">
        <Link href="/physique/atletas" className="physique-foundation-card">
          <UserRound size={22} />
          <div>
            <span>Base estrutural</span>
            <h2>Atletas</h2>
            <p>Atleta conectado, quando existir vínculo, à Central e aos clientes de Suplementos/Fitness.</p>
          </div>
        </Link>

        <Link href="/physique/fichas" className="physique-foundation-card">
          <Dumbbell size={22} />
          <div>
            <span>Base estrutural</span>
            <h2>Fichas de treino</h2>
            <p>Dias, exercícios, séries, repetições, técnicas, descanso, orientação de carga e histórico.</p>
          </div>
        </Link>

        <div className="physique-foundation-card">
          <FileArchive size={22} />
          <div>
            <span>Bucket privado pronto</span>
            <h2>Anexos de ficha</h2>
            <p>PDFs e imagens ficam preparados em armazenamento privado. Upload operacional permanece bloqueado nesta fase.</p>
          </div>
        </div>

        <div className="physique-foundation-card">
          <Link2 size={22} />
          <div>
            <span>ERP conectado</span>
            <h2>Ecossistema Candinho</h2>
            <div className="physique-linked-actions">
              <Link href="/central/clientes">Central de Clientes</Link>
              <Link href="/clientes">Clientes Suplementos</Link>
              <Link href="/fitness/clientes">Clientes Fitness</Link>
              <Link href="/agenda">Agenda</Link>
              <Link href="/central/agenda-estrategica">Agenda Estratégica</Link>
            </div>
          </div>
        </div>
      </div>

      <article className="physique-not-started-note">
        <strong>O que está propositalmente desligado agora</strong>
        <p>
          Cadastro operacional, edição de ficha e upload de anexos não foram liberados.
          A fundação está pronta para evoluir sem criar uma operação paralela ou desconectada
          do restante do ERP.
        </p>
      </article>
    </section>
  );
}
