import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Dumbbell,
  Paperclip,
  Sparkles,
  UserRound,
} from "lucide-react";
import { PhysiqueSectionNav } from "@/components/physique-section-nav";
import { PhysiqueTrainingAttachmentUpload } from "@/components/physique-training-attachment-upload";
import { PhysiqueTrainingPlanView } from "@/components/physique-training-plan-view";
import { getPhysiqueTrainingPlanDetails } from "@/lib/physique-data";

function bytes(value: number | null) {
  if (value == null) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PhysiqueTrainingPlanDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anexo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const details = await getPhysiqueTrainingPlanDetails(id);

  if (!details) notFound();

  const { plan, athlete, days, exercises, attachments } = details;
  const attachmentPending = query.anexo === "pendente";

  return (
    <section className="physique-page physique-ux-page">
      <PhysiqueSectionNav active="training" />

      <header className="physique-ux-training-hero">
        <div>
          <Link className="physique-ux-back" href="/physique/fichas">
            <ArrowLeft size={15} />
            Fichas
          </Link>
          <span>FICHA DE TREINO</span>
          <h1>{plan.title}</h1>
          <p>
            {athlete ? (
              <Link href={`/physique/atletas/${athlete.id}?tab=training`}>
                <UserRound size={13} /> {athlete.display_name}
              </Link>
            ) : (
              "Atleta"
            )}
            <span>·</span>
            {plan.goal ?? "Objetivo não informado"}
          </p>
        </div>

        <div className="physique-ux-training-hero-kpis">
          <article><strong>{days.length}</strong><span>Treinos</span></article>
          <article><strong>{exercises.length}</strong><span>Exercícios</span></article>
          <article><strong>{plan.status === "active" ? "Ativa" : plan.status}</strong><span>Status</span></article>
        </div>
      </header>

      {attachmentPending && (
        <article className="physique-ux-notice warning">
          <Paperclip size={18} />
          <div>
            <strong>Ficha salva; PDF original pendente</strong>
            <span>A estrutura do treino foi preservada. Anexe novamente o PDF na seção de arquivos.</span>
          </div>
        </article>
      )}

      {plan.ai_imported_at && (
        <article className="physique-ux-notice success">
          <Sparkles size={18} />
          <div>
            <strong>Ficha estruturada pelo Nexus</strong>
            <span>A estrutura abaixo foi organizada para consulta rápida. Use as abas para visualizar um treino por vez.</span>
          </div>
        </article>
      )}

      <article className="physique-panel physique-ux-training-panel">
        <div className="physique-panel-title">
          <div><span>Ficha estruturada</span><h2>Treinos</h2></div>
          <Dumbbell size={19} />
        </div>

        <PhysiqueTrainingPlanView days={days} exercises={exercises} />
      </article>

      <section className="physique-ux-training-meta">
        <article className="physique-panel">
          <div className="physique-panel-title">
            <div><span>Resumo</span><h2>Informações da ficha</h2></div>
            <CalendarDays size={19} />
          </div>
          <dl>
            <div><dt>Treinador</dt><dd>{plan.coach_name ?? "Não informado"}</dd></div>
            <div><dt>Início</dt><dd>{plan.starts_on ?? "—"}</dd></div>
            <div><dt>Fim</dt><dd>{plan.ends_on ?? "—"}</dd></div>
            <div><dt>Origem</dt><dd>{plan.source_type}</dd></div>
          </dl>
          {plan.notes && <p>{plan.notes}</p>}
        </article>

        <article className="physique-panel">
          <div className="physique-panel-title">
            <div><span>Armazenamento privado</span><h2>Anexos</h2></div>
            <b>{attachments.length}</b>
          </div>

          <PhysiqueTrainingAttachmentUpload planId={plan.id} />

          {attachments.length === 0 ? (
            <div className="physique-empty compact">
              <Paperclip size={23} />
              <strong>Nenhum anexo nesta ficha</strong>
            </div>
          ) : (
            <div className="physique-attachment-list">
              {attachments.map((attachment) => (
                <div key={attachment.id}>
                  <Paperclip size={16} />
                  <div>
                    <strong>{attachment.file_name}</strong>
                    <span>{attachment.mime_type ?? "Arquivo"} {bytes(attachment.file_size_bytes)}</span>
                  </div>
                  {attachment.signed_url && (
                    <a href={attachment.signed_url} target="_blank" rel="noreferrer">
                      <Download size={15} />
                      Abrir
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
