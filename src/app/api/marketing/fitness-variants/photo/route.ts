import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { isUuidRouteParam } from "@/lib/route-param-guards";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE = 10 * 1024 * 1024;

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

function storagePath(url: string | null) {
  if (!url) return null;

  const marker =
    "/storage/v1/object/public/fitness-product-images/";
  const index = url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(
        url.slice(index + marker.length),
      )
    : null;
}

async function syncFitnessCover(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
) {
  const [variantsResult, stockResult] = await Promise.all([
    supabase
      .from("fitness_variants")
      .select("id,color,image_url,active")
      .eq("product_id", productId)
      .eq("active", true),
    supabase
      .from("fitness_stock_operational")
      .select("variant_id,available_quantity")
      .eq("product_id", productId)
      .eq("variant_active", true),
  ]);

  if (
    variantsResult.error ||
    stockResult.error
  ) {
    return;
  }

  const availableByVariant = new Map(
    (stockResult.data ?? []).map((row) => [
      String(row.variant_id),
      Number(row.available_quantity ?? 0),
    ]),
  );

  const rows = (variantsResult.data ?? [])
    .map((row) => ({
      id: String(row.id),
      color: String(row.color ?? ""),
      image:
        typeof row.image_url === "string" &&
        row.image_url.trim()
          ? row.image_url
          : null,
      available:
        availableByVariant.get(String(row.id)) ?? 0,
    }))
    .filter((row) => row.image);

  const chosen =
    rows.find(
      (row) =>
        row.available > 0 &&
        isBlack(row.color),
    ) ??
    rows.find(
      (row) => row.available > 0,
    ) ??
    rows.find(
      (row) => isBlack(row.color),
    ) ??
    rows[0];

  if (!chosen?.image) return;

  await supabase
    .from("fitness_products")
    .update({
      image_url: chosen.image,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(
      access.role === "admin" ||
      access.canWriteFitness
    )
  ) {
    return NextResponse.json(
      { error: "Sem permissão para alterar Fitness." },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const productId = String(
    form.get("product_id") ?? "",
  );
  const color = String(
    form.get("color") ?? "",
  ).trim();
  const rawVariantIds = String(
    form.get("variant_ids") ?? "[]",
  );
  const file = form.get("file");

  let variantIds: string[] = [];

  try {
    const parsed = JSON.parse(rawVariantIds);

    if (Array.isArray(parsed)) {
      variantIds = [
        ...new Set(
          parsed
            .map((value) => String(value))
            .filter(isUuidRouteParam),
        ),
      ];
    }
  } catch {
    variantIds = [];
  }

  if (
    !isUuidRouteParam(productId) ||
    !color ||
    variantIds.length === 0 ||
    variantIds.length > 80
  ) {
    return NextResponse.json(
      { error: "Variação Fitness inválida." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecione uma imagem." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use JPG, PNG ou WEBP." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE) {
    return NextResponse.json(
      { error: "A imagem precisa ter no máximo 10 MB." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: variants, error: variantsError } =
    await supabase
      .from("fitness_variants")
      .select("id,product_id,color,image_url")
      .in("id", variantIds);

  if (variantsError) {
    return NextResponse.json(
      { error: variantsError.message },
      { status: 400 },
    );
  }

  const validRows = variants ?? [];

  if (
    validRows.length !== variantIds.length ||
    validRows.some(
      (row) =>
        String(row.product_id) !== productId ||
        normalizeColor(String(row.color ?? "")) !==
          normalizeColor(color),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "As variações selecionadas não pertencem à mesma cor/produto.",
      },
      { status: 400 },
    );
  }

  let optimized: Buffer;

  try {
    optimized = await sharp(
      Buffer.from(await file.arrayBuffer()),
    )
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 90,
        effort: 4,
      })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível processar a imagem." },
      { status: 400 },
    );
  }

  const safeColor =
    normalizeColor(color)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "cor";

  const path =
    `${productId}/variations/${safeColor}-${crypto.randomUUID()}.webp`;

  const { error: uploadError } =
    await supabase.storage
      .from("fitness-product-images")
      .upload(path, optimized, {
        contentType: "image/webp",
        upsert: false,
      });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 400 },
    );
  }

  const publicUrl =
    supabase.storage
      .from("fitness-product-images")
      .getPublicUrl(path)
      .data.publicUrl;

  const { error: updateError } =
    await supabase
      .from("fitness_variants")
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .in("id", variantIds);

  if (updateError) {
    await supabase.storage
      .from("fitness-product-images")
      .remove([path]);

    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    );
  }

  /*
   * Se algum media antigo está explicitamente ligado à variação,
   * mantemos a associação coerente. A fonte oficial da cor continua
   * sendo fitness_variants.image_url.
   */
  await supabase
    .from("fitness_product_media")
    .update({
      product_id: productId,
      color,
      image_url: publicUrl,
      source_image_url: null,
    })
    .in("variant_id", variantIds);

  await syncFitnessCover(
    supabase,
    productId,
  );

  const oldPaths = [
    ...new Set(
      validRows
        .map((row) =>
          storagePath(
            typeof row.image_url === "string"
              ? row.image_url
              : null,
          ),
        )
        .filter(
          (value): value is string => Boolean(value),
        ),
    ),
  ];

  /*
   * Não apagamos automaticamente os antigos aqui. Uma mesma foto pode
   * ter sido reaproveitada por outras variações durante a importação.
   * A prioridade é não quebrar imagens históricas por engano.
   */

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    size_kb: Math.max(
      1,
      Math.round(optimized.length / 1024),
    ),
    old_paths_kept: oldPaths.length,
  });
}
