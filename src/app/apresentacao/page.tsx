import Image from "next/image";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getCompanyProfileSections } from "@/lib/company-profile";
import {
  getCompanyProfileSources,
  getCompanyPublicIdentity,
} from "@/lib/company-profile-v45";
import styles from "@/components/company-profile-v45.module.css";

export const dynamic = "force-dynamic";

function formatOpenDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function PublicPresentationPage() {
  const [sections, identity, sources] = await Promise.all([
    getCompanyProfileSections({ publicOnly: true }),
    getCompanyPublicIdentity(),
    getCompanyProfileSources({ publicOnly: true, limit: 8 }),
  ]);

  const main =
    sections.find((section) => section.section_key === "identidade") ??
    sections[0];

  return (
    <main className="company-showcase">
      <div className="company-showcase-shell">
        <section className="company-showcase-hero">
          <Image
            className="company-showcase-logo"
            src={BRAND_ASSETS.supplements.complete.src}
            width={BRAND_ASSETS.supplements.complete.width}
            height={BRAND_ASSETS.supplements.complete.height}
            alt={BRAND_ASSETS.supplements.complete.alt}
            priority
          />

          <div>
            <span className="company-showcase-kicker">
              {main?.eyebrow ?? "Candinho Suplementos"}
            </span>

            <h1>
              {main?.title ??
                "Suplementação próxima, simples e bem explicada."}
            </h1>
          </div>

          <p>
            {main?.body ??
              "Uma operação criada para aproximar atendimento, informação e organização da compra de suplementos."}
          </p>

          <section className={styles.legalHero}>
            <article className={styles.cnpj}>
              <span>CNPJ</span>
              <strong>{identity.cnpj ?? "Não informado"}</strong>
              <small>
                {identity.legal_status ?? "Empresa formalizada"}
              </small>
            </article>

            <article>
              <span>Nome</span>
              <strong>{identity.trade_name}</strong>
              <small>Operação Suplementos</small>
            </article>

            <article>
              <span>Sede</span>
              <strong>
                {[identity.city, identity.state]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </strong>
              <small>Minas Gerais</small>
            </article>

            <article>
              <span>Desde</span>
              <strong>{formatOpenDate(identity.opened_on)}</strong>
              <small>{identity.company_size ?? "Empresa"}</small>
            </article>
          </section>

          <div className="company-showcase-badges">
            <span>Caparaó · MG</span>
            <span>Atendimento próximo</span>
            <span>Operação formalizada</span>
            <span>Evolução contínua</span>
          </div>
        </section>

        <section className="company-showcase-sections">
          {sections
            .filter((section) => section.id !== main?.id)
            .map((section) => (
              <article
                className="company-showcase-section"
                key={section.id}
              >
                <span>{section.eyebrow ?? section.section_key}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>

                {section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
        </section>

        {sources.length > 0 && (
          <section className="company-showcase-section">
            <span>Candinho na mídia</span>
            <h2>Fontes e matérias aprovadas</h2>
            <p>
              Links usados para complementar a apresentação institucional.
            </p>

            <div className={styles.publicSources}>
              {sources.map((source) => (
                <a
                  key={source.id}
                  href={source.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>
                    {source.source_title ??
                      source.source_domain ??
                      "Abrir fonte"}
                    <ExternalLink size={12} />
                  </strong>
                  <span>
                    {source.source_domain}
                    {source.summary ? ` · ${source.summary}` : ""}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <footer className="company-showcase-footer">
          <ShieldCheck size={14} /> Candinho Suplementos · apresentação
          institucional. Informações financeiras, clientes, custos e documentos
          privados não são exibidos nesta página.
        </footer>
      </div>
    </main>
  );
}
