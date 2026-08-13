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

type Module = "supplements" | "fitness";

type UploadResult = {
  full: Buffer;
  thumbnail: Buffer | null;
  extension: "webp";
};

function storagePath(
  url: string | null | undefined,
  bucket: string,
) {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(
        url.slice(index + marker.length),
      )
    : null;
}

function cleanSlot(value: string) {
  if (
    value === "photo1" ||
    value === "photo2" ||
    value === "photo3" ||
    /^extra-\d+$/.test(value)
  ) {
    return value;
  }

  return null;
}

function fitnessExtraIndex(slot: string) {
  if (slot === "photo2") return 0;
  if (slot === "photo3") return 1;

  const match = slot.match(/^extra-(\d+)$/);
  if (!match) return null;

  return Math.max(0, Number(match[1]) - 1);
}

async function optimize(
  buffer: Buffer,
  module: Module,
  slot: string,
): Promise<UploadResult> {
  const isBanner =
    module === "supplements" &&
    slot === "photo2";

  const isNutrition =
    module === "supplements" &&
    slot === "photo3";

  const maxWidth = isBanner
    ? 2200
    : isNutrition
      ? 2000
      : 1600;

  const maxHeight = isBanner
    ? 1300
    : isNutrition
      ? 2000
      : 1600;

  const quality = isNutrition
    ? 92
    : isBanner
      ? 90
      : 88;

  const full = await sharp(buffer)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
    })
    .toBuffer();

  if (
    module === "fitness" ||
    isBanner
  ) {
    return {
      full,
      thumbnail: null,
      extension: "webp",
    };
  }

  const thumbnail = await sharp(buffer)
    .rotate()
    .resize({
      width: 360,
      height: 360,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
      effort: 3,
    })
    .toBuffer();

  return {
    full,
    thumbnail,
    extension: "webp",
  };
}

async function removePaths(
  bucket: string,
  paths: Array<string | null>,
) {
  const valid = paths.filter(
    (value): value is string => Boolean(value),
  );

  if (valid.length === 0) return;

  try {
    const supabase = await createClient();
    await supabase.storage
      .from(bucket)
      .remove(valid);
  } catch {
    // Limpeza de arquivo antigo não pode desfazer uma troca já salva.
  }
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();

  if (!access.active) {
    return NextResponse.json(
      { error: "Sem acesso." },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const module = String(form.get("module") ?? "") as Module;
  const productId = String(form.get("product_id") ?? "");
  const slot = cleanSlot(
    String(form.get("slot") ?? ""),
  );
  const mediaIdRaw = String(
    form.get("media_id") ?? "",
  ).trim();
  const mediaId =
    mediaIdRaw && isUuidRouteParam(mediaIdRaw)
      ? mediaIdRaw
      : null;
  const file = form.get("file");

  if (
    !["supplements", "fitness"].includes(module) ||
    !isUuidRouteParam(productId) ||
    !slot
  ) {
    return NextResponse.json(
      { error: "Destino da imagem inválido." },
      { status: 400 },
    );
  }

  const canWrite =
    access.role === "admin" ||
    (module === "supplements"
      ? access.canWriteSupplements
      : access.canWriteFitness);

  if (!canWrite) {
    return NextResponse.json(
      { error: "Sem permissão para alterar este produto." },
      { status: 403 },
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
  const originalBuffer = Buffer.from(
    await file.arrayBuffer(),
  );

  let optimized: UploadResult;

  try {
    optimized = await optimize(
      originalBuffer,
      module,
      slot,
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível processar a imagem." },
      { status: 400 },
    );
  }

  const token = crypto.randomUUID();

  if (module === "supplements") {
    const bucket = "product-images";

    const { data: current, error: currentError } =
      await supabase
        .from("products")
        .select(
          "id,image_url,thumbnail_url,banner_image_url,secondary_image_url,secondary_thumbnail_url",
        )
        .eq("id", productId)
        .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        { error: currentError.message },
        { status: 400 },
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const storageLabel =
      slot === "photo1"
        ? "primary"
        : slot === "photo2"
          ? "banner-desktop"
          : "secondary";

    const fullPath =
      `${productId}/marketing-${storageLabel}-${token}.webp`;
    const thumbPath = optimized.thumbnail
      ? `${productId}/marketing-${storageLabel}-${token}-thumb.webp`
      : null;

    const { error: fullError } =
      await supabase.storage
        .from(bucket)
        .upload(
          fullPath,
          optimized.full,
          {
            contentType: "image/webp",
            upsert: false,
          },
        );

    if (fullError) {
      return NextResponse.json(
        { error: fullError.message },
        { status: 400 },
      );
    }

    if (thumbPath && optimized.thumbnail) {
      const { error: thumbError } =
        await supabase.storage
          .from(bucket)
          .upload(
            thumbPath,
            optimized.thumbnail,
            {
              contentType: "image/webp",
              upsert: false,
            },
          );

      if (thumbError) {
        await supabase.storage
          .from(bucket)
          .remove([fullPath]);

        return NextResponse.json(
          { error: thumbError.message },
          { status: 400 },
        );
      }
    }

    const fullUrl =
      supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath)
        .data.publicUrl;

    const thumbUrl = thumbPath
      ? supabase.storage
          .from(bucket)
          .getPublicUrl(thumbPath)
          .data.publicUrl
      : null;

    let persistError: string | null = null;

    if (slot === "photo1") {
      const { error } = await supabase.rpc(
        "set_product_image",
        {
          p_product_id: productId,
          p_slot: "primary",
          p_image_url: fullUrl,
          p_thumbnail_url: thumbUrl,
        },
      );
      persistError = error?.message ?? null;
    } else if (slot === "photo2") {
      const { error } = await supabase.rpc(
        "set_product_banner_v1",
        {
          p_product_id: productId,
          p_slot: "desktop",
          p_image_url: fullUrl,
        },
      );
      persistError = error?.message ?? null;
    } else if (slot === "photo3") {
      const { error } = await supabase.rpc(
        "set_product_image",
        {
          p_product_id: productId,
          p_slot: "secondary",
          p_image_url: fullUrl,
          p_thumbnail_url: thumbUrl,
        },
      );
      persistError = error?.message ?? null;
    } else {
      persistError =
        "Este slot não existe em Suplementos.";
    }

    if (persistError) {
      const cleanup = [
        fullPath,
        thumbPath,
      ].filter(
        (value): value is string =>
          Boolean(value),
      );

      await supabase.storage
        .from(bucket)
        .remove(cleanup);

      return NextResponse.json(
        { error: persistError },
        { status: 400 },
      );
    }

    const oldPaths =
      slot === "photo1"
        ? [
            storagePath(
              current.image_url,
              bucket,
            ),
            storagePath(
              current.thumbnail_url,
              bucket,
            ),
          ]
        : slot === "photo2"
          ? [
              storagePath(
                current.banner_image_url,
                bucket,
              ),
            ]
          : [
              storagePath(
                current.secondary_image_url,
                bucket,
              ),
              storagePath(
                current.secondary_thumbnail_url,
                bucket,
              ),
            ];

    await removePaths(bucket, oldPaths);

    return NextResponse.json({
      ok: true,
      url: fullUrl,
      thumbnail_url: thumbUrl,
      media_id: null,
      size_kb: Math.max(
        1,
        Math.round(
          optimized.full.length / 1024,
        ),
      ),
    });
  }

  const bucket = "fitness-product-images";

  const { data: product, error: productError } =
    await supabase
      .from("fitness_products")
      .select("id,image_url")
      .eq("id", productId)
      .maybeSingle();

  if (productError) {
    return NextResponse.json(
      { error: productError.message },
      { status: 400 },
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Produto Fitness não encontrado." },
      { status: 404 },
    );
  }

  const fullPath =
    `${productId}/marketing-${slot}-${token}.webp`;

  const { error: uploadError } =
    await supabase.storage
      .from(bucket)
      .upload(
        fullPath,
        optimized.full,
        {
          contentType: "image/webp",
          upsert: false,
        },
      );

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 400 },
    );
  }

  const publicUrl =
    supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath)
      .data.publicUrl;

  if (slot === "photo1") {
    const { error } = await supabase
      .from("fitness_products")
      .update({
        image_url: publicUrl,
      })
      .eq("id", productId);

    if (error) {
      await supabase.storage
        .from(bucket)
        .remove([fullPath]);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    await removePaths(
      bucket,
      [
        storagePath(
          product.image_url,
          bucket,
        ),
      ],
    );

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      thumbnail_url: null,
      media_id: null,
      size_kb: Math.max(
        1,
        Math.round(
          optimized.full.length / 1024,
        ),
      ),
    });
  }

  const index =
    fitnessExtraIndex(slot);

  if (index === null) {
    await supabase.storage
      .from(bucket)
      .remove([fullPath]);

    return NextResponse.json(
      { error: "Slot Fitness inválido." },
      { status: 400 },
    );
  }

  const { data: mediaRows, error: mediaError } =
    await supabase
      .from("fitness_product_media")
      .select(
        "id,image_url,source_image_url,sort_order",
      )
      .eq("product_id", productId)
      .eq("public_visible", true)
      .order("sort_order")
      .order("created_at");

  if (mediaError) {
    await supabase.storage
      .from(bucket)
      .remove([fullPath]);

    return NextResponse.json(
      { error: mediaError.message },
      { status: 400 },
    );
  }

  const target =
    (mediaId
      ? (mediaRows ?? []).find(
          (row) => String(row.id) === mediaId,
        )
      : null) ??
    (mediaRows ?? [])[index] ??
    null;

  let savedMediaId: string | null = null;
  let oldMediaUrl: string | null = null;

  if (target) {
    oldMediaUrl =
      typeof target.image_url === "string"
        ? target.image_url
        : null;

    const { data, error } = await supabase
      .from("fitness_product_media")
      .update({
        image_url: publicUrl,
        source_image_url: null,
      })
      .eq("id", target.id)
      .eq("product_id", productId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      await supabase.storage
        .from(bucket)
        .remove([fullPath]);

      return NextResponse.json(
        {
          error:
            error?.message ??
            "Não foi possível atualizar a foto Fitness.",
        },
        { status: 400 },
      );
    }

    savedMediaId = String(data.id);
  } else {
    const { data, error } = await supabase
      .from("fitness_product_media")
      .insert({
        product_id: productId,
        variant_id: null,
        color: null,
        media_type: "extra",
        source_image_url: null,
        image_url: publicUrl,
        public_visible: true,
        sort_order: 100 + index * 10,
        metadata: {
          source: "marketing_product_media_hub",
          slot,
        },
      })
      .select("id")
      .single();

    if (error) {
      await supabase.storage
        .from(bucket)
        .remove([fullPath]);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    savedMediaId = String(data.id);
  }

  await removePaths(
    bucket,
    [
      storagePath(
        oldMediaUrl,
        bucket,
      ),
    ],
  );

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    thumbnail_url: null,
    media_id: savedMediaId,
    size_kb: Math.max(
      1,
      Math.round(
        optimized.full.length / 1024,
      ),
    ),
  });
}
