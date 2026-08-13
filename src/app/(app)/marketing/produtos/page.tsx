import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  MarketingProductMediaHubV4533,
  type MarketingFitnessProductOption,
  type MarketingProductMediaRow,
  type MarketingProductMediaSlot,
} from "@/components/marketing-product-media-hub-v45-33";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeColor(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function isBlack(value: string) {
  return [
    "preto",
    "preta",
    "black",
  ].includes(normalizeColor(value));
}

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
    fitnessProductsResult,
    fitnessVariantsResult,
    fitnessStockResult,
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
        "id,name,category,image_url,description,active",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("fitness_variants")
      .select(
        "id,product_id,size,color,image_url,active",
      )
      .eq("active", true)
      .order("color")
      .order("size"),
    supabase
      .from("fitness_stock_operational")
      .select(
        "variant_id,product_id,physical_quantity,available_quantity,incoming_quantity,variant_active",
      )
      .eq("variant_active", true),
  ]);

  for (const result of [
    supplementsResult,
    fitnessProductsResult,
    fitnessVariantsResult,
    fitnessStockResult,
  ]) {
    if (result.error) throw result.error;
  }

  const stockByVariant = new Map<
    string,
    {
      physical: number;
      available: number;
      incoming: number;
    }
  >();

  for (const row of fitnessStockResult.data ?? []) {
    stockByVariant.set(
      String(row.variant_id),
      {
        physical:
          Number(row.physical_quantity ?? 0),
        available:
          Number(row.available_quantity ?? 0),
        incoming:
          Number(row.incoming_quantity ?? 0),
      },
    );
  }

  const variantsByProduct = new Map<
    string,
    Array<{
      id: string;
      size: string;
      color: string;
      image_url: string | null;
      physical: number;
      available: number;
      incoming: number;
    }>
  >();

  for (const row of fitnessVariantsResult.data ?? []) {
    const productId = String(row.product_id);
    const stock =
      stockByVariant.get(String(row.id)) ?? {
        physical: 0,
        available: 0,
        incoming: 0,
      };

    const list =
      variantsByProduct.get(productId) ?? [];

    list.push({
      id: String(row.id),
      size: String(row.size ?? "").trim(),
      color:
        String(row.color ?? "").trim() ||
        "Sem cor",
      image_url:
        typeof row.image_url === "string" &&
        row.image_url.trim()
          ? row.image_url
          : null,
      physical: stock.physical,
      available: stock.available,
      incoming: stock.incoming,
    });

    variantsByProduct.set(
      productId,
      list,
    );
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
    (fitnessProductsResult.data ?? []).map((product) => {
      const rawVariants =
        variantsByProduct.get(
          String(product.id),
        ) ?? [];

      const groups = new Map<
        string,
        {
          color: string;
          rows: typeof rawVariants;
        }
      >();

      for (const variant of rawVariants) {
        const key =
          normalizeColor(variant.color) ||
          "sem-cor";

        const group =
          groups.get(key) ?? {
            color: variant.color,
            rows: [],
          };

        group.rows.push(variant);
        groups.set(key, group);
      }

      const slots: MarketingProductMediaSlot[] =
        [...groups.values()].map(
          (group, index) => {
            const sortedRows =
              [...group.rows].sort(
                (a, b) =>
                  b.available - a.available ||
                  Number(Boolean(b.image_url)) -
                    Number(Boolean(a.image_url)) ||
                  a.size.localeCompare(
                    b.size,
                    "pt-BR",
                  ),
              );

            const representative =
              sortedRows.find(
                (row) =>
                  row.available > 0 &&
                  row.image_url,
              ) ??
              sortedRows.find(
                (row) => row.image_url,
              ) ??
              sortedRows[0];

            return {
              key: `fitness-color-${index}`,
              label: group.color,
              color: group.color,
              url:
                representative?.image_url ?? null,
              required: true,
              variant_ids:
                group.rows.map((row) => row.id),
              sizes: [
                ...new Set(
                  group.rows
                    .map((row) => row.size)
                    .filter(Boolean),
                ),
              ].sort((a, b) =>
                a.localeCompare(b, "pt-BR"),
              ),
              available_quantity:
                group.rows.reduce(
                  (sum, row) =>
                    sum + row.available,
                  0,
                ),
              physical_quantity:
                group.rows.reduce(
                  (sum, row) =>
                    sum + row.physical,
                  0,
                ),
              incoming_quantity:
                group.rows.reduce(
                  (sum, row) =>
                    sum + row.incoming,
                  0,
                ),
              preferred_cover: false,
            };
          },
        );

      const preferred =
        slots.find(
          (slot) =>
            (slot.available_quantity ?? 0) > 0 &&
            slot.url &&
            isBlack(slot.color ?? ""),
        ) ??
        slots.find(
          (slot) =>
            (slot.available_quantity ?? 0) > 0 &&
            slot.url,
        ) ??
        slots.find(
          (slot) =>
            slot.url &&
            isBlack(slot.color ?? ""),
        ) ??
        slots.find(
          (slot) => slot.url,
        ) ??
        null;

      for (const slot of slots) {
        slot.preferred_cover =
          Boolean(
            preferred &&
            preferred.key === slot.key,
          );
      }

      slots.sort(
        (a, b) =>
          Number(Boolean(b.preferred_cover)) -
            Number(Boolean(a.preferred_cover)) ||
          Number(
            (b.available_quantity ?? 0) > 0,
          ) -
            Number(
              (a.available_quantity ?? 0) > 0,
            ) ||
          (b.available_quantity ?? 0) -
            (a.available_quantity ?? 0) ||
          (a.color ?? "").localeCompare(
            b.color ?? "",
            "pt-BR",
          ),
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
        slots,
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

  const fitnessVariationMissing =
    fitnessRows.reduce(
      (sum, row) =>
        sum +
        row.slots.filter(
          (slot) => !slot.url,
        ).length,
      0,
    );

  const fitnessProductOptions: MarketingFitnessProductOption[] =
    (fitnessProductsResult.data ?? []).map(
      (product) => ({
        id: String(product.id),
        name: String(product.name),
      }),
    );

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
        description="Suplementos seguem por Foto 01, 02 e 03. Em Fitness, cada quadrado representa uma cor real cadastrada no produto."
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
          <span>Fitness · cores sem foto</span>
          <strong>{fitnessVariationMissing}</strong>
          <small>
            Cada cor aparece separadamente para revisão da importação.
          </small>
        </article>
      </section>

      <MarketingProductMediaHubV4533
        rows={rows}
        canEditSupplements={canEditSupplements}
        canEditFitness={canEditFitness}
        fitnessProducts={fitnessProductOptions}
      />
    </>
  );
}
