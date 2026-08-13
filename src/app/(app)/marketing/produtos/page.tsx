import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  MarketingProductMediaHubV4533,
  type MarketingProductMediaRow,
} from "@/components/marketing-product-media-hub-v45-33";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MarketingProductsPage() {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(
      access.role === "admin" ||
      access.canAccessMarketing
    )
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [
    supplementsResult,
    fitnessResult,
    fitnessMediaResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,category,brand,image_url,banner_image_url,secondary_image_url,description,nutrition_status",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("fitness_products")
      .select(
        "id,name,category,image_url,description",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("fitness_product_media")
      .select(
        "id,product_id,image_url,source_image_url,media_type,sort_order,public_visible",
      )
      .eq("public_visible", true)
      .order("sort_order")
      .order("created_at"),
  ]);

  for (const result of [
    supplementsResult,
    fitnessResult,
    fitnessMediaResult,
  ]) {
    if (result.error) throw result.error;
  }

  const fitnessMedia = new Map<
    string,
    Array<{
      id: string;
      image_url: string | null;
      source_image_url: string | null;
      sort_order: number | null;
    }>
  >();

  for (const media of fitnessMediaResult.data ?? []) {
    const key = String(media.product_id);
    const list = fitnessMedia.get(key) ?? [];

    list.push({
      id: String(media.id),
      image_url:
        typeof media.image_url === "string"
          ? media.image_url
          : null,
      source_image_url:
        typeof media.source_image_url === "string"
          ? media.source_image_url
          : null,
      sort_order: Number(media.sort_order ?? 0),
    });

    fitnessMedia.set(key, list);
  }

  const supplementRows: MarketingProductMediaRow[] =
    (supplementsResult.data ?? []).map((product) => ({
      module: "supplements" as const,
      id: String(product.id),
      name: String(product.name),
      category:
        typeof product.category === "string"
          ? product.category
          : null,
      brand:
        typeof product.brand === "string"
          ? product.brand
          : null,
      edit_href:
        `/suplementos/produtos/${String(product.id)}/editar`,
      description_missing:
        !String(product.description ?? "").trim(),
      slots: [
        {
          key: "photo1",
          label: "Foto 01 · Produto",
          url:
            typeof product.image_url === "string"
              ? product.image_url
              : null,
          required: true,
          media_id: null,
        },
        {
          key: "photo2",
          label: "Foto 02 · Banner",
          url:
            typeof product.banner_image_url === "string"
              ? product.banner_image_url
              : null,
          required: true,
          media_id: null,
        },
        {
          key: "photo3",
          label: "Foto 03 · Nutrição",
          url:
            typeof product.secondary_image_url === "string"
              ? product.secondary_image_url
              : null,
          required: false,
          media_id: null,
        },
      ],
    }));

  const fitnessRows: MarketingProductMediaRow[] =
    (fitnessResult.data ?? []).map((product) => {
      const extras =
        (fitnessMedia.get(String(product.id)) ?? [])
          .sort(
            (a, b) =>
              Number(a.sort_order ?? 0) -
              Number(b.sort_order ?? 0),
          )
          .map((media) => ({
            id: media.id,
            url:
              media.image_url ??
              media.source_image_url,
          }))
          .filter(
            (
              media,
            ): media is {
              id: string;
              url: string;
            } => Boolean(media.url),
          );

      return {
        module: "fitness" as const,
        id: String(product.id),
        name: String(product.name),
        category:
          typeof product.category === "string"
            ? product.category
            : null,
        brand: null,
        edit_href:
          `/fitness/produtos/${String(product.id)}`,
        description_missing:
          !String(product.description ?? "").trim(),
        slots: [
          {
            key: "photo1",
            label: "Foto principal",
            url:
              typeof product.image_url === "string"
                ? product.image_url
                : null,
            required: true,
            media_id: null,
          },
          {
            key: "photo2",
            label: "Foto extra 01",
            url: extras[0]?.url ?? null,
            required: false,
            media_id: extras[0]?.id ?? null,
          },
          {
            key: "photo3",
            label: "Foto extra 02",
            url: extras[1]?.url ?? null,
            required: false,
            media_id: extras[1]?.id ?? null,
          },
          ...extras.slice(2).map(
            (media, index) => ({
              key: `extra-${index + 3}`,
              label:
                `Foto extra ${String(index + 3).padStart(2, "0")}`,
              url: media.url,
              required: false,
              media_id: media.id,
            }),
          ),
        ],
      };
    });

  const rows = [
    ...supplementRows,
    ...fitnessRows,
  ];

  const supplementBannerMissing =
    supplementRows.filter(
      (row) =>
        !row.slots.find(
          (slot) => slot.key === "photo2",
        )?.url,
    ).length;

  const supplementNutritionMissing =
    supplementRows.filter(
      (row) =>
        !row.slots.find(
          (slot) => slot.key === "photo3",
        )?.url,
    ).length;

  const fitnessDescriptionMissing =
    fitnessRows.filter(
      (row) => row.description_missing,
    ).length;

  const fitnessExtraMissing =
    fitnessRows.filter(
      (row) =>
        !row.slots
          .slice(1)
          .some((slot) => slot.url),
    ).length;

  const canEditSupplements =
    access.role === "admin" ||
    access.canWriteSupplements;

  const canEditFitness =
    access.role === "admin" ||
    access.canWriteFitness;

  return (
    <>
      <PageHeader
        eyebrow="Central · Marketing"
        title="Produtos e banco de fotos"
        description="Selecione para baixar em lote ou clique diretamente em qualquer foto para adicionar ou substituir sem sair desta tela."
      />

      <section className="marketing-product-pending-summary-v4533">
        <article>
          <span>Suplementos · banners faltando</span>
          <strong>{supplementBannerMissing}</strong>
          <small>
            Foto 02 horizontal ainda não cadastrada.
          </small>
        </article>

        <article>
          <span>Suplementos · nutrição faltando</span>
          <strong>{supplementNutritionMissing}</strong>
          <small>
            Foto 03 opcional com rótulo / informação nutricional.
          </small>
        </article>

        <article>
          <span>Fitness · descrições faltando</span>
          <strong>{fitnessDescriptionMissing}</strong>
          <small>
            Cadastro textual ainda precisa ser lapidado.
          </small>
        </article>

        <article>
          <span>Fitness · fotos extras faltando</span>
          <strong>{fitnessExtraMissing}</strong>
          <small>
            A foto principal continua preservada.
          </small>
        </article>
      </section>

      <MarketingProductMediaHubV4533
        rows={rows}
        canEditSupplements={canEditSupplements}
        canEditFitness={canEditFitness}
      />
    </>
  );
}
