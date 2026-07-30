import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  PackageX,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PublicNexusAdvisor } from "@/components/public-nexus-advisor";
import { PublicProductBuyPanel } from "@/components/public-product-buy-panel";
import { PublicProductViewTracker } from "@/components/public-product-view-tracker";
import { getPublicProductPage } from "@/lib/public-product-page-data";
import { formatCurrency } from "@/lib/format";
import styles from "@/components/public-catalog-experience.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getPublicProductPage(slug);

  if (!snapshot) {
    return {
      title: "Produto | Candinho Suplementos",
    };
  }

  const product = snapshot.product;
  const currentPrice =
    snapshot.promotion?.promotional_price ?? product.sale_price;

  const title =
    product.meta_title?.trim() ||
    `${product.name} | Candinho Suplementos`;

  const description =
    product.meta_description?.trim() ||
    product.description ||
    `${product.name} por ${formatCurrency(currentPrice)} na Candinho Suplementos.`;

  const image = product.image_full_url || product.image_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await getPublicProductPage(slug);

  if (!snapshot) notFound();

  const { product, promotion, flavors, recommendations } = snapshot;
  const currentPrice = promotion?.promotional_price ?? product.sale_price;

  const fallbackHighlights = [
    product.category ? `Categoria: ${product.category}` : null,
    product.brand ? `Marca: ${product.brand}` : null,
    product.objective,
  ].filter((value): value is string => Boolean(value));

  const highlights =
    product.highlights.length > 0
      ? product.highlights.slice(0, 6)
      : fallbackHighlights.slice(0, 6);

  return (
    <main className={styles.page}>
      <PublicProductViewTracker productId={product.id} />

      <header className={styles.pageHeader}>
        <Link className={styles.backLink} href="/catalogo">
          <ArrowLeft size={15} />
          Voltar ao catálogo
        </Link>
      </header>

      <section className={styles.productHero}>
        <div className={styles.productImageWrap}>
          {product.image_full_url || product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.productImage}
              src={product.image_full_url || product.image_url || ""}
              alt={product.name}
            />
          ) : (
            <PackageCheck size={72} />
          )}
        </div>

        <div className={styles.productCopy}>
          <span className={styles.category}>
            {[product.category, product.brand].filter(Boolean).join(" · ") ||
              "Candinho Suplementos"}
          </span>

          <h1>{product.name}</h1>

          {product.description && <p>{product.description}</p>}

          <div className={styles.priceBox}>
            {promotion &&
              promotion.promotional_price < promotion.current_price && (
                <span className={styles.oldPrice}>
                  {formatCurrency(promotion.current_price)}
                </span>
              )}
            <strong className={styles.price}>
              {formatCurrency(currentPrice)}
            </strong>
          </div>

          <div
            className={`${styles.stockBadge} ${
              product.available ? "" : styles.soldOut
            }`}
          >
            {product.available ? (
              <>
                <PackageCheck size={15} />
                Disponível agora
              </>
            ) : (
              <>
                <PackageX size={15} />
                Temporariamente indisponível
              </>
            )}
          </div>

          {promotion && (
            <p>
              <strong>{promotion.promotion_name}</strong>
              {promotion.ends_on ? ` · até ${promotion.ends_on}` : ""}
              {" · "}enquanto durar o estoque.
            </p>
          )}

          <PublicProductBuyPanel
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            flavors={flavors}
            available={product.available}
            messageTemplate={product.whatsapp_message_template}
          />
        </div>
      </section>

      <section className={styles.content}>
        {highlights.length > 0 && (
          <article className={styles.card}>
            <h2>Por que olhar essa opção?</h2>
            <div className={styles.highlightGrid}>
              {highlights.map((highlight) => (
                <div className={styles.highlight} key={highlight}>
                  <CheckCircle2 size={17} />
                  {highlight}
                </div>
              ))}
            </div>
          </article>
        )}

        {(product.long_description ||
          product.ideal_profile ||
          product.information) && (
          <article className={styles.card}>
            <h2>Sobre o produto</h2>
            {product.long_description && <p>{product.long_description}</p>}
            {product.ideal_profile && (
              <p>
                <strong>Perfil:</strong> {product.ideal_profile}
              </p>
            )}
            {product.information &&
              product.information !== product.long_description && (
                <p>{product.information}</p>
              )}
          </article>
        )}

        {flavors.length > 0 && (
          <article className={styles.card}>
            <h2>Sabores</h2>
            <p>
              A disponibilidade abaixo acompanha o estoque atual da operação.
            </p>
            <div className={styles.flavorGrid}>
              {flavors.map((flavor) => (
                <div className={styles.flavor} key={flavor.id}>
                  <strong>{flavor.name}</strong>
                  <span>
                    {flavor.available
                      ? `${flavor.available_quantity} disponível(is)`
                      : `${flavor.incoming_quantity} a caminho`}
                  </span>
                </div>
              ))}
            </div>
          </article>
        )}

        {(product.usage_text || product.warnings_text) && (
          <article className={styles.card}>
            <h2>Informações importantes</h2>
            {product.usage_text && (
              <p>
                <strong>Uso:</strong> {product.usage_text}
              </p>
            )}
            {product.warnings_text && (
              <p>
                <strong>Atenção:</strong> {product.warnings_text}
              </p>
            )}
          </article>
        )}

        <article className={styles.card}>
          <span className={styles.guideEyebrow}>
            <Sparkles size={15} />
            Ajuda para escolher
          </span>
          <h2>Ainda está em dúvida?</h2>
          <p>
            O Nexus conhece o contexto comercial deste produto e pode comparar
            com outras opções do catálogo. Situações de saúde mais complexas são
            encaminhadas para atendimento humano.
          </p>

          <PublicNexusAdvisor
            productSlug={product.slug}
            productId={product.id}
            productName={product.name}
          />
        </article>

        {product.faq.length > 0 && (
          <article className={styles.card}>
            <h2>Dúvidas frequentes</h2>
            <div className={styles.faq}>
              {product.faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </article>
        )}

        {recommendations.length > 0 && (
          <article className={styles.card}>
            <h2>Outras opções disponíveis</h2>
            <div className={styles.relatedGrid}>
              {recommendations.map((item) => (
                <Link
                  className={styles.related}
                  href={`/catalogo/${item.slug}`}
                  key={item.id}
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <div />
                  )}
                  <div className={styles.relatedCopy}>
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.sale_price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
