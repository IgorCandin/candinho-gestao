import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Dumbbell,
  FileStack,
  Paperclip,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPhysiqueFoundationSnapshot } from "@/lib/physique-data";

export default async function PhysiqueStandalonePage() {
  const snapshot = await getPhysiqueFoundationSnapshot();
  const brand = BRAND_ASSETS.physique.complete;

  return (
    <>
      <header className="physique-hero physique-hero-standalone">
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
          <span>Candinho Company · Operação exclusiva</span>
          <h1>Physique Athletes</h1>
          <p>
            O atleta é o centro da operação: dossiê histórico, avaliações,
            evolução por fotos e fichas estruturadas, com Nexus para organizar e
            comparar cada nova atualização.
          </p>

          <div
            className={`physique-operation-status ${
              snapshot.enabled ? "enabled" : "preparing"
            }`}
          >
            <ShieldCheck size={15}/>
            <strong>
              {snapshot.enabled ? "Operação habilitada" : "Preparando operação"}
            </strong>
          </div>

          <div className="physique-inline-links">
            <span>Dossiê</span>
            <span>Avaliações</span>
            <span>Treinos</span>
            <span>Fotos</span>
            <span>Evolução</span>
          </div>
        </div>
      </header>

      <div className="physique-kpis">
        <article>
          <UserRound size={18}/>
          <small>Atletas</small>
          <strong>{snapshot.athleteCount}</strong>
        </article>
        <article>
          <Activity size={18}/>
          <small>Avaliações</small>
          <strong>{snapshot.assessmentCount}</strong>
        </article>
        <article>
          <Dumbbell size={18}/>
          <small>Fichas ativas</small>
          <strong>{snapshot.activeTrainingPlanCount}</strong>
        </article>
        <article>
          <Paperclip size={18}/>
          <small>Arquivos e fotos</small>
          <strong>{snapshot.attachmentCount}</strong>
        </article>
      </div>

      <div className="physique-foundation-grid">
        <Link
          href="/physique/atletas"
          className="physique-foundation-card physique-foundation-card-highlight"
        >
          <FileStack size={22}/>
          <div>
            <span>Operação principal</span>
            <h2>Atletas e Dossiê</h2>
            <p>
              Abra o atleta para importar avaliação, treino, fotos e contexto na
              mesma atualização e comparar com o histórico anterior.
            </p>
          </div>
        </Link>

        <Link
          href="/physique/fichas"
          className="physique-foundation-card physique-foundation-card-highlight"
        >
          <Dumbbell size={22}/>
          <div>
            <span>Treinos estruturados</span>
            <h2>Fichas de treino</h2>
            <p>
              Consulte fichas já estruturadas em dias e exercícios e acompanhe o
              treino ativo de cada atleta.
            </p>
          </div>
        </Link>

        <Link href="/physique/atletas/novo" className="physique-foundation-card">
          <Plus size={22}/>
          <div>
            <span>Ação rápida</span>
            <h2>Novo atleta</h2>
            <p>
              Cadastre somente o necessário e continue o acompanhamento dentro
              do dossiê individual.
            </p>
          </div>
        </Link>

        <Link href="/physique/atletas" className="physique-foundation-card">
          <Activity size={22}/>
          <div>
            <span>Nova atualização</span>
            <h2>Atualizar um atleta</h2>
            <p>
              Escolha o atleta e adicione os novos arquivos. O Nexus consolida o
              estado atual antes de salvar no histórico.
            </p>
          </div>
        </Link>
      </div>

    </>
  );
}
