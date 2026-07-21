import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Dumbbell,
  FileArchive,
  Link2,
  LogOut,
  Paperclip,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPhysiqueFoundationSnapshot } from "@/lib/physique-data";

export default async function PhysiqueStandalonePage() {
  const snapshot = await getPhysiqueFoundationSnapshot();
  const brand = BRAND_ASSETS.physique.complete;

  return (
    <section className="physique-standalone-shell">
      <div className="physique-standalone-container">
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
              Núcleo da operação de acompanhamento de atletas e fichas de treino.
              Nesta fase a Physique permanece como uma frente premium e controlada,
              conectada ao ERP sem herdar o menu lateral das demais operações.
            </p>

            <div className={`physique-operation-status ${snapshot.enabled ? "enabled" : "preparing"}`}>
              <ShieldCheck size={15} />
              <strong>
                {snapshot.enabled ? "Operação habilitada" : "Em preparação · Não inicializada"}
              </strong>
            </div>

            <div className="physique-inline-links" aria-label="Módulos conectados">
              <span><Link2 size={14} /> ERP conectado</span>
              <span>Clientes</span>
              <span>Agenda</span>
              <span>Central</span>
              <span>Suplementos</span>
              <span>Fitness</span>
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
          <article className="physique-foundation-card physique-foundation-card-highlight">
            <UserRound size={22} />
            <div>
              <span>Base estrutural</span>
              <h2>Atletas</h2>
              <p>
                Cadastro pensado para vínculo com cliente existente no ERP, sem duplicar pessoas e mantendo a Physique integrada ao ecossistema Candinho.
              </p>
            </div>
          </article>

          <article className="physique-foundation-card physique-foundation-card-highlight">
            <Dumbbell size={22} />
            <div>
              <span>Base estrutural</span>
              <h2>Fichas de treino</h2>
              <p>
                Divisão semanal, exercícios, séries, repetições, carga, descanso, observações e histórico de versões para acompanhamento sério.
              </p>
            </div>
          </article>

          <article className="physique-foundation-card">
            <FileArchive size={22} />
            <div>
              <span>Bucket privado pronto</span>
              <h2>Anexos de ficha</h2>
              <p>
                PDFs e imagens ficam preparados em armazenamento privado. O upload operacional continua bloqueado até a inicialização oficial.
              </p>
            </div>
          </article>

          <article className="physique-foundation-card">
            <Link2 size={22} />
            <div>
              <span>Fase atual</span>
              <h2>Operação controlada</h2>
              <p>
                A Physique terá navegação própria, sem sidebar, com identidade visual exclusiva. Essa é a única operação do ERP com esse comportamento.
              </p>
            </div>
          </article>
        </div>

        <article className="physique-not-started-note">
          <strong>O que continua propositalmente desligado agora</strong>
          <p>
            Cadastro operacional liberado, edição de ficha, evolução prática e upload de anexos ainda não foram destravados.
            A fundação está pronta para evoluir com calma, sem criar processos paralelos ou confusos.
          </p>
        </article>

        <div className="physique-standalone-actions" aria-label="Ações da operação Physique">
          <Link href="/dashboard" className="physique-action-button secondary">
            Operações
          </Link>

          <form action="/auth/signout" method="post">
            <button className="physique-action-button" type="submit">
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
