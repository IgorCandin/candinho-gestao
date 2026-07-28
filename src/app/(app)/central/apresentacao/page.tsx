import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExternalLink,
  FileCheck2,
  Presentation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CompanyProfileUpdateForm } from "@/components/company-profile-update-form";
import { PageHeader } from "@/components/page-header";
import {
  getCompanyProfileSections,
  getCompanyProfileUpdates,
} from "@/lib/company-profile";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function CentralPresentationPage() {
  const access =
    await getCurrentUserAccess();

  const canAccess =
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing;

  if (!canAccess) redirect("/dashboard");

  const canManage =
    access.role === "admin" ||
    access.canManageUsers;

  const [sections, updates] =
    await Promise.all([
      getCompanyProfileSections(),
      canManage
        ? getCompanyProfileUpdates()
        : Promise.resolve([]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Institucional"
        title="Apresentação da Candinho"
        description="A versão simples para mostrar a clientes, amigos e parceiros quando perguntarem o que é a Candinho Suplementos."
        action={
          <Link
            className="button gold"
            href="/apresentacao"
            target="_blank"
          >
            <Presentation size={16} />
            Abrir apresentação
            <ExternalLink size={13} />
          </Link>
        }
      />

      <article className="panel">
        <div className="panel-body">
          <div className="company-profile-ai-guard">
            <ShieldCheck size={18} />
            <span>
              Esta área foi separada do operacional.
              A apresentação pública não consulta
              clientes, estoque, faturamento, custos,
              documentos oficiais ou dados bancários.
              Ela lê somente as seções marcadas como
              públicas e seguras.
            </span>
          </div>
        </div>
      </article>

      <div className="company-profile-admin-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Informações que aparecem
              </h2>
              <p>
                Conteúdo institucional curto, dividido
                por assunto.
              </p>
            </div>
            <FileCheck2 size={20} />
          </div>

          <div className="panel-body company-profile-section-list">
            {sections.map((section) => (
              <article
                className="company-profile-section-card"
                key={section.id}
              >
                <span>
                  {section.eyebrow ??
                    section.section_key}
                </span>
                <h3>{section.title}</h3>
                <p>{section.body}</p>

                {section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map(
                      (bullet) => (
                        <li key={bullet}>
                          {bullet}
                        </li>
                      ),
                    )}
                  </ul>
                )}

                <footer>
                  Fonte interna:{" "}
                  {section.source_label ??
                    "cadastro institucional"}
                  {" · "}
                  {section.verification_status ===
                  "nexus_review"
                    ? "atualizado pelo Nexus"
                    : "base inicial"}
                </footer>
              </article>
            ))}
          </div>
        </article>

        <aside className="company-profile-update-box">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>
                  Atualizar informações
                </h2>
                <p>
                  Jogue um arquivo e deixe o Nexus
                  selecionar apenas o que serve para a
                  apresentação.
                </p>
              </div>
              <Sparkles size={20} />
            </div>

            <div className="panel-body">
              {canManage ? (
                <CompanyProfileUpdateForm />
              ) : (
                <div className="empty">
                  <ShieldCheck size={24} />
                  <strong>
                    Somente administradores
                  </strong>
                  Você pode visualizar a apresentação,
                  mas não alterar a base institucional.
                </div>
              )}

              {canManage &&
                updates.length > 0 && (
                  <div className="company-profile-update-history">
                    {updates.map((item) => (
                      <div key={item.id}>
                        <strong>
                          {item.original_filename}
                        </strong>
                        <small>
                          {item.status}
                          {" · "}
                          {item.applied_sections} seção(ões)
                          {" · "}
                          {formatDateTime(
                            item.created_at,
                          )}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </article>
        </aside>
      </div>
    </>
  );
}
