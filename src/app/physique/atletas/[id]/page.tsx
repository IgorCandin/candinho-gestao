import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Dumbbell,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Plus,
  Trophy,
  UserRound,
} from "lucide-react";
import { PhysiqueAssessmentForm } from "@/components/physique-assessment-form";
import { PhysiqueAthleteImportHub } from "@/components/physique-athlete-import-hub";
import { PhysiqueSectionNav } from "@/components/physique-section-nav";
import { PhysiqueSponsorshipPanel } from "@/components/physique-sponsorship-panel";
import { formatDateOnly } from "@/lib/format";
import { getPhysiqueAthleteDetails } from "@/lib/physique-data";

function metric(value: number | null, unit: string) {
  return value == null
    ? "—"
    : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit}`;
}

type AthleteTab = "overview" | "dossier" | "evolution" | "training" | "photos" | "sponsorship";

const tabs: Array<{ key: AthleteTab; label: string }> = [
  { key: "overview", label: "Visão geral" },
  { key: "dossier", label: "Dossiê" },
  { key: "evolution", label: "Evolução" },
  { key: "training", label: "Treino" },
  { key: "photos", label: "Fotos" },
  { key: "sponsorship", label: "Patrocínios" },
];

function normalizeTab(value: string | undefined): AthleteTab {
  return tabs.some((tab) => tab.key === value) ? (value as AthleteTab) : "overview";
}

export default async function PhysiqueAthleteDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const details = await getPhysiqueAthleteDetails(id);

  if (!details) notFound();

  const { athlete, plans, assessments, assessmentAttachments } = details;
  const tab = normalizeTab(query.tab);
  const latestAssessment = assessments[0] ?? null;
  const photos = assessmentAttachments.filter((file) =>
    ["front", "side", "back"].includes(file.attachment_type),
  );

  return (
    <section className="physique-page physique-ux-page">
      <PhysiqueSectionNav active="athletes" />

      <header className="physique-ux-athlete-hero">
        <div>
          <Link className="physique-ux-back" href="/physique/atletas">
            <ArrowLeft size={15} />
            Atletas
          </Link>

          <div className="physique-ux-athlete-identity">
            <div className="physique-ux-athlete-avatar large">
              <UserRound size={28} />
            </div>
            <div>
              <span>{athlete.status}</span>
              <h1>{athlete.display_name}</h1>
              <p>{athlete.primary_goal ?? "Objetivo ainda não informado."}</p>
            </div>
          </div>
        </div>

        <Link className="physique-action-button secondary" href={`/physique/fichas/nova?atleta=${athlete.id}`}>
          <Plus size={15} />
          Nova ficha
        </Link>
      </header>

      <div className="physique-ux-athlete-kpis">
        <article><strong>{latestAssessment ? metric(latestAssessment.weight_kg, " kg") : "—"}</strong><span>Peso mais recente</span></article>
        <article><strong>{assessments.length}</strong><span>Avaliações</span></article>
        <article><strong>{plans.filter((plan) => plan.status === "active").length}</strong><span>Fichas ativas</span></article>
        <article><strong>{photos.length}</strong><span>Fotos de evolução</span></article>
      </div>

      <nav className="physique-ux-athlete-tabs" aria-label="Seções do atleta">
        {tabs.map((item) => (
          <Link
            className={tab === item.key ? "active" : ""}
            href={`/physique/atletas/${athlete.id}?tab=${item.key}`}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="physique-ux-tab-content">
          <div className="physique-profile-grid">
            <article className="physique-panel physique-ux-profile-card">
              <div className="physique-panel-title">
                <div><span>Perfil</span><h2>Dados principais</h2></div>
                <UserRound size={19} />
              </div>
              <dl>
                <div><dt>Telefone</dt><dd>{athlete.phone ?? "—"}</dd></div>
                <div><dt>E-mail</dt><dd>{athlete.email ?? "—"}</dd></div>
                <div><dt>Instagram</dt><dd>{athlete.instagram_username ?? "—"}</dd></div>
                <div><dt>Objetivo</dt><dd>{athlete.primary_goal ?? "—"}</dd></div>
              </dl>
            </article>

            <article className="physique-panel physique-ux-profile-card">
              <div className="physique-panel-title">
                <div><span>ERP</span><h2>Vínculos</h2></div>
                <Link2 size={19} />
              </div>
              <div className="physique-linked-actions vertical">
                <Link href="/central/clientes">Abrir Central de Clientes <ExternalLink size={13} /></Link>
                {athlete.supplements_customer_id && (
                  <Link href={`/clientes/${athlete.supplements_customer_id}`}>
                    {athlete.supplements_customer_name ?? "Cliente Suplementos"} <ExternalLink size={13} />
                  </Link>
                )}
                {athlete.fitness_customer_id && (
                  <Link href={`/fitness/clientes/${athlete.fitness_customer_id}`}>
                    {athlete.fitness_customer_name ?? "Cliente Fitness"} <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            </article>
          </div>

          <div className="physique-ux-overview-grid">
            <Link href={`/physique/atletas/${athlete.id}?tab=dossier`}>
              <FileText size={20} />
              <div><span>Dossiê</span><strong>Atualizar contexto do atleta</strong><p>Envie arquivos e consolide um novo estado com o Nexus.</p></div>
            </Link>
            <Link href={`/physique/atletas/${athlete.id}?tab=evolution`}>
              <Activity size={20} />
              <div><span>Evolução</span><strong>{assessments.length} avaliação(ões)</strong><p>Medidas, avaliações e comparações ao longo do tempo.</p></div>
            </Link>
            <Link href={`/physique/atletas/${athlete.id}?tab=training`}>
              <Dumbbell size={20} />
              <div><span>Treino</span><strong>{plans.length} ficha(s)</strong><p>Consulte a ficha ativa e o histórico estruturado.</p></div>
            </Link>
            <Link href={`/physique/atletas/${athlete.id}?tab=sponsorship`}>
              <Trophy size={20} />
              <div><span>Patrocínios</span><strong>Apoios e eventos</strong><p>Registre suporte financeiro ou em produtos.</p></div>
            </Link>
          </div>
        </div>
      )}

      {tab === "dossier" && (
        <article className="physique-panel physique-ux-feature-panel">
          <div className="physique-panel-title">
            <div><span>Dossiê do atleta</span><h2>Importar arquivos e consolidar atualização</h2></div>
            <FileText size={19} />
          </div>
          <PhysiqueAthleteImportHub athleteId={athlete.id} athleteName={athlete.display_name} />
        </article>
      )}

      {tab === "evolution" && (
        <div className="physique-ux-tab-content">
          <article className="physique-panel physique-ux-feature-panel">
            <div className="physique-panel-title">
              <div><span>Registrar</span><h2>Nova avaliação</h2></div>
              <Activity size={19} />
            </div>
            <PhysiqueAssessmentForm athleteId={athlete.id} />
          </article>

          <article className="physique-panel">
            <div className="physique-panel-title">
              <div><span>Histórico</span><h2>Evolução</h2></div>
              <b>{assessments.length}</b>
            </div>

            {assessments.length === 0 ? (
              <div className="physique-empty compact"><Activity size={23} /><strong>Nenhuma avaliação registrada</strong></div>
            ) : (
              <div className="physique-assessment-list">
                {assessments.map((item) => {
                  const files = assessmentAttachments.filter((file) => file.assessment_id === item.id);
                  const pdf = files.find((file) => file.attachment_type === "assessment_pdf");

                  return (
                    <article key={item.id} className="physique-assessment-card">
                      <header>
                        <div>
                          <small>{formatDateOnly(item.assessed_on)} · {item.source_type}</small>
                          <strong>{metric(item.weight_kg, " kg")} · {metric(item.body_fat_pct, "% gordura")}</strong>
                        </div>
                        {item.ai_status === "reviewed" && <span className="badge green">Nexus revisado</span>}
                      </header>

                      <div className="physique-measure-grid">
                        <span>Peito <b>{metric(item.chest_cm, " cm")}</b></span>
                        <span>Cintura <b>{metric(item.waist_cm, " cm")}</b></span>
                        <span>Abdômen <b>{metric(item.abdomen_cm, " cm")}</b></span>
                        <span>Braços <b>{metric(item.arm_left_cm, " cm")} / {metric(item.arm_right_cm, " cm")}</b></span>
                        <span>Coxas <b>{metric(item.thigh_left_cm, " cm")} / {metric(item.thigh_right_cm, " cm")}</b></span>
                        <span>Panturrilhas <b>{metric(item.calf_left_cm, " cm")} / {metric(item.calf_right_cm, " cm")}</b></span>
                      </div>

                      {item.notes && <p>{item.notes}</p>}
                      {pdf?.signed_url && (
                        <a className="physique-file-link" href={pdf.signed_url} target="_blank" rel="noreferrer">
                          <FileText size={14} />
                          Abrir PDF da avaliação
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </div>
      )}

      {tab === "training" && (
        <article className="physique-panel">
          <div className="physique-panel-title">
            <div><span>Treinos</span><h2>Fichas do atleta</h2></div>
            <b>{plans.length}</b>
          </div>

          {plans.length === 0 ? (
            <div className="physique-empty compact">
              <Dumbbell size={23} />
              <strong>Nenhuma ficha criada</strong>
              <Link className="physique-action-button secondary" href={`/physique/fichas/nova?atleta=${athlete.id}`}>
                Importar primeira ficha
              </Link>
            </div>
          ) : (
            <div className="physique-plan-list">
              {plans.map((plan) => (
                <Link href={`/physique/fichas/${plan.id}`} key={plan.id}>
                  <div>
                    <small>{plan.status} · {plan.source_type}</small>
                    <strong>{plan.title}</strong>
                    <span>{plan.goal ?? "Sem objetivo descrito"}</span>
                  </div>
                  <ExternalLink size={15} />
                </Link>
              ))}
            </div>
          )}
        </article>
      )}

      {tab === "photos" && (
        <article className="physique-panel">
          <div className="physique-panel-title">
            <div><span>Evolução visual</span><h2>Fotos das avaliações</h2></div>
            <ImageIcon size={19} />
          </div>

          {photos.length === 0 ? (
            <div className="physique-empty compact">
              <ImageIcon size={23} />
              <strong>Nenhuma foto registrada</strong>
              <p>Fotos adicionadas às avaliações físicas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="physique-ux-photo-grid">
              {photos.map((photo) => (
                <a href={photo.signed_url ?? "#"} target="_blank" rel="noreferrer" key={photo.id}>
                  {photo.signed_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.signed_url} alt={`${athlete.display_name} · ${photo.attachment_type}`} />
                  )}
                  <span>
                    {photo.attachment_type === "front"
                      ? "Frente"
                      : photo.attachment_type === "side"
                        ? "Lado"
                        : "Costas"}
                  </span>
                </a>
              ))}
            </div>
          )}
        </article>
      )}

      {tab === "sponsorship" && (
        <article className="physique-panel physique-ux-feature-panel">
          <div className="physique-panel-title">
            <div><span>Patrocínio</span><h2>Apoio e eventos</h2></div>
            <Trophy size={19} />
          </div>
          <PhysiqueSponsorshipPanel athleteId={athlete.id} athleteName={athlete.display_name} />
        </article>
      )}
    </section>
  );
}
