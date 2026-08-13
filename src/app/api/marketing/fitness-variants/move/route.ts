import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { isUuidRouteParam } from "@/lib/route-param-guards";
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
      { error: "Sem permissão para reorganizar Fitness." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        source_product_id?: string;
        target_product_id?: string;
        variant_ids?: string[];
      }
    | null;

  const sourceProductId =
    String(payload?.source_product_id ?? "");
  const targetProductId =
    String(payload?.target_product_id ?? "");

  const variantIds = [
    ...new Set(
      (payload?.variant_ids ?? [])
        .map((value) => String(value))
        .filter(isUuidRouteParam),
    ),
  ];

  if (
    !isUuidRouteParam(sourceProductId) ||
    !isUuidRouteParam(targetProductId) ||
    sourceProductId === targetProductId ||
    variantIds.length === 0 ||
    variantIds.length > 80
  ) {
    return NextResponse.json(
      { error: "Destino da variação inválido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const [
    targetResult,
    variantsResult,
  ] = await Promise.all([
    supabase
      .from("fitness_products")
      .select("id,name,active")
      .eq("id", targetProductId)
      .maybeSingle(),
    supabase
      .from("fitness_variants")
      .select("id,product_id,color,size")
      .in("id", variantIds),
  ]);

  if (targetResult.error) {
    return NextResponse.json(
      { error: targetResult.error.message },
      { status: 400 },
    );
  }

  if (
    !targetResult.data ||
    !targetResult.data.active
  ) {
    return NextResponse.json(
      { error: "O produto de destino não está ativo." },
      { status: 400 },
    );
  }

  if (variantsResult.error) {
    return NextResponse.json(
      { error: variantsResult.error.message },
      { status: 400 },
    );
  }

  const rows =
    variantsResult.data ?? [];

  if (
    rows.length !== variantIds.length ||
    rows.some(
      (row) =>
        String(row.product_id) !== sourceProductId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Uma ou mais variações já não pertencem a este produto.",
      },
      { status: 409 },
    );
  }

  const { error: moveError } =
    await supabase
      .from("fitness_variants")
      .update({
        product_id: targetProductId,
        updated_at: new Date().toISOString(),
      })
      .in("id", variantIds)
      .eq("product_id", sourceProductId);

  if (moveError) {
    return NextResponse.json(
      { error: moveError.message },
      { status: 400 },
    );
  }

  await supabase
    .from("fitness_product_media")
    .update({
      product_id: targetProductId,
    })
    .in("variant_id", variantIds);

  await Promise.all([
    syncFitnessCover(
      supabase,
      sourceProductId,
    ),
    syncFitnessCover(
      supabase,
      targetProductId,
    ),
  ]);

  return NextResponse.json({
    ok: true,
    moved: variantIds.length,
    target_product_id: targetProductId,
    target_product_name:
      String(targetResult.data.name ?? "Produto"),
  });
}
