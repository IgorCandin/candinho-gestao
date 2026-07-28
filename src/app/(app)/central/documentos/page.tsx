import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  FileBadge2,
  FileCheck2,
  Route,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { OfficialDocumentUploader } from "@/components/official-document-uploader";
import { PageHeader } from "@/components/page-header";
import {
  getOfficialDocuments,
  type OfficialDocument,
} from "@/lib/company-profile";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateOnly } from "@/lib/format";

const categoryLabel: Record<string, string> = {
  route: "Rota / viagem",
  company: "Empresa",
  tax: "Fiscal",
  sanitary: "Sanitário / regulatório",
  vehicle: "Veículo",
  personal: "Documento pessoal",
  supplier: "Fornecedor",
  other: "Outro",
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysUntil(date: string, today: string) {
  const a = new Date(
    `${date}T12:00:00-03:00`,
  ).getTime();
  const b = new Date(
    `${today}T12:00:00-03:00`,
  ).getTime();

  return Math.round((a - b) / 86_400_000);
}

function expiryState(
  document: OfficialDocument,
  today: string,
) {
  if (!document.expires_on) return "none";
  if (document.expires_on < today)
    return "expired";
  if (
    daysUntil(document.expires_on, today) <=
    30
  )
    return "soon";
  return "valid";
}

export default async function CentralDocumentsPage() {
  const access =
    await getCurrentUserAccess();

  const canManage =
    access.role === "admin" ||
    access.canManageUsers;

  if (!canManage) redirect("/central");

  const documents =
    await getOfficialDocuments();

  const today = todayBrazil();

  const routeDocuments =
    documents.filter(
      (document) =>
        document.route_required,
    );

  const expired = documents.filter(
    (document) =>
      expiryState(document, today) ===
      "expired",
  );

  const expiring = documents.filter(
    (document) =>
      expiryState(document, today) ===
      "soon",
  );

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Cofre"
        title="Documentos oficiais"
        description="Cópias privadas em PDF para consulta rápida. Documentos marcados para rota já ficam preparados para o futuro módulo de Rotas."
      />

      <section className="official-doc-summary">
        <div>
          <span>Documentos</span>
          <strong>{documents.length}</strong>
          <small>arquivos ativos no cofre</small>
        </div>

        <div>
          <span>Usados em rotas</span>
          <strong>
            {routeDocuments.length}
          </strong>
          <small>separados para viagens</small>
        </div>

        <div>
          <span>Vencem em 30 dias</span>
          <strong>{expiring.length}</strong>
          <small>merecem revisão</small>
        </div>

        <div>
          <span>Vencidos</span>
          <strong>{expired.length}</strong>
          <small>precisam atualização</small>
        </div>
      </section>

      <div className="official-routes-note">
        <Route size={19} />
        <div>
          <strong>
            Base pronta para o módulo de Rotas
          </strong>
          <p>
            O campo “Preciso levar em rotas” já
            identifica os PDFs que deverão aparecer
            automaticamente quando criarmos a rota.
            Não precisa cadastrar os documentos de
            novo depois.
          </p>
        </div>
      </div>

      <div className="company-profile-admin-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Seu cofre</h2>
              <p>
                O arquivo só abre através de link
                privado temporário.
              </p>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div className="panel-body">
            {documents.length === 0 ? (
              <div className="empty">
                <FileBadge2 size={28} />
                <strong>
                  Nenhum documento salvo
                </strong>
                Comece pelos documentos que costuma
                precisar nas rotas.
              </div>
            ) : (
              <div className="official-document-grid">
                {documents.map(
                  (document) => {
                    const state =
                      expiryState(
                        document,
                        today,
                      );

                    return (
                      <article
                        className={`official-document-card ${state}`}
                        key={document.id}
                      >
                        <div className="official-document-card-head">
                          <span>
                            <FileBadge2
                              size={20}
                            />
                          </span>

                          <div>
                            <strong>
                              {document.title}
                            </strong>
                            <small>
                              {categoryLabel[
                                document
                                  .category
                              ] ??
                                document.category}
                            </small>
                          </div>
                        </div>

                        <div className="official-document-card-badges">
                          {document.route_required && (
                            <span className="badge blue">
                              <Route
                                size={12}
                              />
                              Levar em rota
                            </span>
                          )}

                          {state ===
                            "expired" && (
                            <span className="badge red">
                              <TriangleAlert
                                size={12}
                              />
                              Vencido
                            </span>
                          )}

                          {state === "soon" && (
                            <span className="badge amber">
                              <CalendarClock
                                size={12}
                              />
                              Vence em breve
                            </span>
                          )}

                          {state === "valid" && (
                            <span className="badge green">
                              <FileCheck2
                                size={12}
                              />
                              Válido
                            </span>
                          )}
                        </div>

                        <small>
                          {document.document_date
                            ? `Documento: ${formatDateOnly(
                                document.document_date,
                              )}`
                            : "Sem data informada"}
                          {document.expires_on
                            ? ` · Validade: ${formatDateOnly(
                                document.expires_on,
                              )}`
                            : " · Sem validade cadastrada"}
                        </small>

                        {document.notes && (
                          <small>
                            {document.notes}
                          </small>
                        )}

                        <div className="official-document-card-actions">
                          {document.signed_url ? (
                            <Link
                              className="button ghost compact-button"
                              href={
                                document.signed_url
                              }
                              target="_blank"
                            >
                              Abrir PDF
                              <ExternalLink
                                size={13}
                              />
                            </Link>
                          ) : (
                            <span className="badge red">
                              PDF indisponível
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </article>

        <aside className="company-profile-update-box">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>
                  Adicionar documento
                </h2>
                <p>
                  PDFs ficam em um bucket privado
                  separado da Biblioteca de Mídia.
                </p>
              </div>
              <FileBadge2 size={20} />
            </div>

            <div className="panel-body">
              <OfficialDocumentUploader />
            </div>
          </article>
        </aside>
      </div>
    </>
  );
}
