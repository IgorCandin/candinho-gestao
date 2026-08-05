import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExternalLink,
  FileCheck2,
  Link2,
  Presentation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CompanyProfileSourceForm } from "@/components/company-profile-source-form";
import { CompanyProfileUpdateForm } from "@/components/company-profile-update-form";
import { CompanyPublicIdentityForm } from "@/components/company-public-identity-form";
import { PageHeader } from "@/components/page-header";
import styles from "@/components/company-profile-v45.module.css";
import {
  getCompanyProfileSections,
  getCompanyProfileUpdates,
} from "@/lib/company-profile";
import {
  getCompanyProfileSources,
  getCompanyPublicIdentity,
} from "@/lib/company-profile-v45";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function CentralPresentationPage() {
  const access = await getCurrentUserAccess();

  const canAccess =
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing;

  if (!canAccess) redirect("/dashboard");

  const canManage =
    access.role === "admin" || access.canManageUsers;

  const [sections, updates, identity, sources] = await Promise.all([
    getCompanyProfileSections(),
    canManage ? getCompanyProfileUpdates() : Promise.resolve([]),
    getCompanyPublicIdentity(),
    canManage
      ? getCompanyProfileSources({ limit: 10 })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central · Institucional"
        title="Apresentação da Candinho"
        description="Base institucional pública da Candinho Suplementos, agora com dados legais destacados e fontes externas aprovadas."
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

      <section className={styles.legalHero}>
        <article className={styles.cnpj}>
          <span>CNPJ público</span>
          <strong>{identity.cnpj ?? "Não informado"}</strong>
          <small>{identity.legal_status ?? "Dados legais"}</small>
        </article>

        <article>
          <span>Abertura</span>
          <strong>{identity.opened_on ?? "—"}</strong>
          <small>Data cadastral</small>
        </article>

        <article>
          <span>Sede</span>
          <strong>
            {[identity.city, identity.state].filter(Boolean).join(" · ") || "—"}
          </strong>
          <small>Presença oficial</small>
        </article>

        <article>
          <span>Porte</span>
          <strong>{identity.company_size ?? "—"}</strong>
          <small>{identity.trade_name}</small>
        </article>
      </section>

      <article className="panel">
        <div className="panel-body">
          <div className="company-profile-ai-guard">
            <ShieldCheck size={18} />
            <span>
              A apresentação pública continua separada do operacional. CNPJ e
              dados legais ficam em campos próprios; o Nexus não recebe acesso
              a clientes, banco, custos, margens ou documentos privados.
            </span>
          </div>
        </div>
      </article>

      <div className="company-profile-admin-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Informações que aparecem</h2>
              <p>Conteúdo institucional curto, dividido por assunto.</p>
            </div>
            <FileCheck2 size={20} />
          </div>

          <div className="panel-body company-profile-section-list">
            {sections.map((section) => (
              <article
                className="company-profile-section-card"
                key={section.id}
              >
                <span>{section.eyebrow ?? section.section_key}</span>
                <h3>{section.title}</h3>
                <p>{section.body}</p>

                {section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}

                <footer>
                  Fonte interna:{" "}
                  {section.source_label ?? "cadastro institucional"} ·{" "}
                  {section.verification_status.includes("nexus")
                    ? "revisado pelo Nexus"
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
                <h2>Dados legais públicos</h2>
                <p>CNPJ e dados cadastrais exibidos com destaque.</p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="panel-body">
              {canManage ? (
                <CompanyPublicIdentityForm initial={identity} />
              ) : (
                <div className="empty">
                  <ShieldCheck size={24} />
                  <strong>Somente administradores</strong>
                </div>
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Adicionar matéria / link</h2>
                <p>
                  O Nexus lê somente o endereço informado e mostra uma prévia
                  antes de alterar a apresentação.
                </p>
              </div>
              <Link2 size={20} />
            </div>

            <div className="panel-body">
              {canManage ? (
                <CompanyProfileSourceForm />
              ) : (
                <div className="empty">
                  <ShieldCheck size={24} />
                  <strong>Somente administradores</strong>
                </div>
              )}

              {canManage && sources.length > 0 && (
                <div className={styles.sourceHistory}>
                  {sources.map((item) => (
                    <article key={item.id}>
                      <strong>
                        {item.source_title ?? item.source_domain ?? "Fonte"}
                      </strong>
                      <small>
                        {item.status} ·{" "}
                        {formatDateTime(item.created_at)}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Atualizar por arquivo</h2>
                <p>
                  PDF, imagem ou texto continuam disponíveis como antes.
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
                  <strong>Somente administradores</strong>
                </div>
              )}

              {canManage && updates.length > 0 && (
                <div className="company-profile-update-history">
                  {updates.map((item) => (
                    <div key={item.id}>
                      <strong>{item.original_filename}</strong>
                      <small>
                        {item.status} · {item.applied_sections} seção(ões) ·{" "}
                        {formatDateTime(item.created_at)}
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
