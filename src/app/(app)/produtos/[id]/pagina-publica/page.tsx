import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PublicProductPageEditor } from "@/components/public-product-page-editor";
import { getProductDetails } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function faq(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => object(item))
    .map((item) => ({
      question: String(item.question ?? ""),
      answer: String(item.answer ?? ""),
    }))
    .filter((item) => item.question || item.answer);
}

export default async function ProductPublicPageEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, supabase] = await Promise.all([
    getProductDetails(id),
    createClient(),
  ]);

  if (!product) notFound();

  const { data, error } = await supabase
    .from("public_product_pages")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  if (error) throw error;

  const row = object(data);
  const slug = String(row.slug ?? "");

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Produto · Vitrine"
        title={`Página pública · ${product.name}`}
        description="Controle como o produto é apresentado no link individual do catálogo."
        action={
          <div className="page-header-actions">
            {row.published !== false && slug && (
              <Link
                className="button gold"
                href={`/catalogo/${slug}`}
                target="_blank"
              >
                <ExternalLink size={16} />
                Ver página
              </Link>
            )}

            <Link className="button ghost" href={`/produtos/${id}`}>
              <ArrowLeft size={16} />
              Voltar ao produto
            </Link>
          </div>
        }
      />

      <PublicProductPageEditor
        productId={id}
        productName={product.name}
        initial={{
          slug,
          public_title:
            typeof row.public_title === "string" ? row.public_title : null,
          short_description:
            typeof row.short_description === "string"
              ? row.short_description
              : product.description,
          long_description:
            typeof row.long_description === "string"
              ? row.long_description
              : product.information,
          highlights: Array.isArray(row.highlights)
            ? row.highlights.filter(
                (value: unknown): value is string =>
                  typeof value === "string",
              )
            : [],
          usage_text:
            typeof row.usage_text === "string" ? row.usage_text : null,
          warnings_text:
            typeof row.warnings_text === "string" ? row.warnings_text : null,
          faq: faq(row.faq),
          meta_title:
            typeof row.meta_title === "string" ? row.meta_title : null,
          meta_description:
            typeof row.meta_description === "string"
              ? row.meta_description
              : null,
          whatsapp_message_template:
            typeof row.whatsapp_message_template === "string"
              ? row.whatsapp_message_template
              : null,
          published: row.published !== false,
        }}
      />
    </>
  );
}
