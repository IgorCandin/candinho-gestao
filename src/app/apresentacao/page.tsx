import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getCompanyProfileSections } from "@/lib/company-profile";

export const dynamic = "force-dynamic";

export default async function PublicPresentationPage() {
  const sections =
    await getCompanyProfileSections({
      publicOnly: true,
    });

  const identity =
    sections.find(
      (section) =>
        section.section_key === "identidade",
    ) ?? sections[0];

  return (
    <main className="company-showcase">
      <div className="company-showcase-shell">
        <section className="company-showcase-hero">
          <Image
            className="company-showcase-logo"
            src={BRAND_ASSETS.supplements.complete.src}
            width={
              BRAND_ASSETS.supplements.complete.width
            }
            height={
              BRAND_ASSETS.supplements.complete.height
            }
            alt={
              BRAND_ASSETS.supplements.complete.alt
            }
            priority
          />

          <div>
            <span className="company-showcase-kicker">
              {identity?.eyebrow ??
                "Candinho Suplementos"}
            </span>

            <h1>
              {identity?.title ??
                "Suplementação próxima, simples e bem explicada."}
            </h1>
          </div>

          <p>
            {identity?.body ??
              "Uma operação criada para aproximar atendimento, informação e organização da compra de suplementos."}
          </p>

          <div className="company-showcase-badges">
            <span>Caparaó · MG</span>
            <span>Desde 2026</span>
            <span>Atendimento próximo</span>
            <span>Evolução contínua</span>
          </div>
        </section>

        <section className="company-showcase-sections">
          {sections
            .filter(
              (section) =>
                section.id !== identity?.id,
            )
            .map((section) => (
              <article
                className="company-showcase-section"
                key={section.id}
              >
                <span>
                  {section.eyebrow ??
                    section.section_key}
                </span>
                <h2>{section.title}</h2>
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
              </article>
            ))}
        </section>

        <footer className="company-showcase-footer">
          Candinho Suplementos · apresentação
          institucional. Informações internas,
          financeiras e documentos privados não são
          exibidos nesta página.
        </footer>
      </div>
    </main>
  );
}
