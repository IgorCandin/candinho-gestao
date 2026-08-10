import { NextResponse } from "next/server";
import {
  getCurrentUserAccess,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function imageModel() {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();

  if (
    !configured ||
    [
      "gpt-image-1",
      "gpt-image-1.5",
      "chatgpt-image-latest",
    ].includes(configured)
  ) {
    return "gpt-image-2";
  }

  return configured;
}

function openAiImageError(status: number, raw: JsonRecord) {
  const error = object(raw.error);
  const detail = text(error.message);
  const code = text(error.code);
  const type = text(error.type);
  const normalized = `${code} ${type} ${detail}`.toLowerCase();

  console.warn(JSON.stringify({
    level: "warn",
    event: "fitness_model_photo_openai_error",
    status,
    code: code || null,
    type: type || null,
    message: detail.slice(0, 500) || null,
  }));

  if (
    normalized.includes("no credits remaining") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("billing quota") ||
    normalized.includes("run out of credits")
  ) {
    return "Os créditos da OpenAI acabaram. Adicione saldo na conta da API para voltar a gerar fotos.";
  }

  if (status === 401 || normalized.includes("invalid_api_key")) {
    return "A chave da OpenAI precisa ser atualizada para voltar a gerar fotos.";
  }

  if (status === 403 || normalized.includes("model_not_found")) {
    return "A conta da OpenAI ainda não tem acesso ao modelo de imagens configurado.";
  }

  if (status === 429 || normalized.includes("rate_limit")) {
    return "A OpenAI recebeu muitas solicitações agora. Aguarde um minuto e tente novamente.";
  }

  return "O Nexus não conseguiu gerar a foto agora. Tente novamente em instantes.";
}

function absoluteSource(
  request: Request,
  value: string,
) {
  return new URL(value, new URL(request.url).origin).href;
}

async function allowedSource(
  productId: string,
  source: string,
) {
  const supabase = await createClient();

  const [
    productResult,
    variantResult,
    mediaResult,
  ] = await Promise.all([
    supabase
      .from("fitness_products")
      .select("image_url")
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("fitness_variants")
      .select("image_url")
      .eq("product_id", productId),
    supabase
      .from("fitness_product_media")
      .select("image_url")
      .eq("product_id", productId),
  ]);

  if (
    productResult.error ||
    variantResult.error ||
    mediaResult.error
  ) {
    return false;
  }

  const known = new Set<string>();

  if (typeof productResult.data?.image_url === "string") {
    known.add(productResult.data.image_url);
  }

  for (const row of variantResult.data ?? []) {
    if (typeof row.image_url === "string") {
      known.add(row.image_url);
    }
  }

  for (const row of mediaResult.data ?? []) {
    if (typeof row.image_url === "string") {
      known.add(row.image_url);
    }
  }

  return known.has(source);
}

function buildPrompt({
  productName,
  color,
  scene,
  modelProfile,
  additionalContext,
}: {
  productName: string;
  color: string;
  scene: string;
  modelProfile: string;
  additionalContext: string;
}) {
  return `
Crie uma fotografia publicitária extremamente realista para uma loja brasileira
de moda fitness.

A imagem de referência contém a peça real "${productName}"${
    color ? ` na cor ${color}` : ""
  }.

OBJETIVO
Coloque a MESMA peça de roupa da referência vestida por um(a) modelo adulto(a)
${modelProfile === "aleatorio" ? "escolhido(a) de forma natural e aleatória" : modelProfile}.
Cena: ${scene}.

REGRAS DE FIDELIDADE DA PEÇA
- Preserve formato, recortes, comprimento, cintura, costuras, textura,
  estampas, logos e proporções da roupa.
- Não invente detalhes, bolsos, textos, marcas, transparências ou acessórios
  na peça.
- A cor deve permanecer fiel à referência.
- A roupa precisa parecer realmente vestida no corpo, com caimento, dobras e
  tensão do tecido fisicamente plausíveis.

FILTRO ANTI-APARÊNCIA-DE-IA
- fotografia comercial real, não ilustração;
- textura de pele natural, poros discretos e pequenas imperfeições;
- anatomia humana natural, mãos e dedos corretos;
- cabelo com fios naturais, sem aspecto plástico;
- iluminação fotográfica realista, sombras coerentes e profundidade de campo
  plausível;
- nada de pele encerada, simetria artificial, olhos irreais, membros extras,
  mãos deformadas ou tecido derretido;
- não inserir texto, legenda, marca d'água ou interface;
- composição elegante e simples, como campanha de e-commerce/lifestyle feita
  com câmera profissional.

${additionalContext ? `CONTEXTO EXTRA\n${additionalContext}` : ""}

A roupa da imagem de referência é a fonte de verdade. Priorize a fidelidade à
peça acima de criatividade.
  `.trim();
}


async function generatedImageBytes(raw: JsonRecord) {
  const data = Array.isArray(raw.data) ? raw.data : [];
  const first = object(data[0]);

  if (
    typeof first.b64_json === "string" &&
    first.b64_json
  ) {
    return Buffer.from(first.b64_json, "base64");
  }

  if (typeof first.url === "string" && first.url) {
    const response = await fetch(first.url, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        "A imagem foi gerada, mas não pôde ser baixada.",
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.role === "admin" || access.canAccessFitness)
  ) {
    return NextResponse.json(
      { error: "Sem acesso à Fitness." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fitness_product_media")
    .select(
      "id,color,media_type,source_image_url,image_url,public_visible,sort_order,created_at",
    )
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: data ?? [],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.role === "admin" || access.canWriteFitness)
  ) {
    return NextResponse.json(
      { error: "Sem permissão para gerar fotos." },
      { status: 403 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "A geração de fotos precisa da OPENAI_API_KEY configurada no ambiente.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = object(
    await request.json().catch(() => ({})),
  );

  const sourceImage = text(body.source_image_url);
  const color = text(body.color);
  const scene =
    text(body.scene) || "academia/lifestyle clean com luz natural";
  const modelProfile =
    text(body.model_profile) || "aleatorio";
  const additionalContext = text(body.additional_context);

  if (!sourceImage) {
    return NextResponse.json(
      { error: "Escolha uma foto real da peça como referência." },
      { status: 400 },
    );
  }

  if (!(await allowedSource(id, sourceImage))) {
    return NextResponse.json(
      { error: "A foto de referência não pertence a esse produto." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("fitness_products")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  try {
    const resolvedSource = absoluteSource(
      request,
      sourceImage,
    );

    const sourceResponse = await fetch(resolvedSource, {
      signal: AbortSignal.timeout(20_000),
    });

    if (!sourceResponse.ok) {
      throw new Error(
        "Não foi possível abrir a foto de referência.",
      );
    }

    const mime =
      sourceResponse.headers.get("content-type") ||
      "image/jpeg";
    const sourceBuffer = Buffer.from(
      await sourceResponse.arrayBuffer(),
    );
    const form = new FormData();
    form.append(
      "model",
      imageModel(),
    );
    form.append(
      "prompt",
      buildPrompt({
        productName: String(product.name),
        color,
        scene,
        modelProfile,
        additionalContext,
      }),
    );
    form.append(
      "image",
      new Blob(
        [new Uint8Array(sourceBuffer)],
        { type: mime },
      ),
      `referencia.${mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg"}`,
    );
    form.append("size", "1024x1536");
    form.append("quality", "high");
    form.append("input_fidelity", "high");
    form.append("output_format", "jpeg");
    form.append("output_compression", "92");

    const response = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(120_000),
      },
    );

    const raw = object(
      await response.json().catch(() => ({})),
    );

    if (!response.ok) {
      throw new Error(openAiImageError(response.status, raw));
    }

    const generated = await generatedImageBytes(raw);

    if (!generated) {
      throw new Error(
        "A geração terminou sem uma imagem válida.",
      );
    }
    const objectPath =
      `fitness/${id}/ai/${Date.now()}-${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("fitness-product-images")
      .upload(objectPath, generated, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("fitness-product-images")
      .getPublicUrl(objectPath);

    const generatedUrl = publicData.publicUrl;

    const { data: media, error: mediaError } = await supabase
      .from("fitness_product_media")
      .insert({
        product_id: id,
        color: color || null,
        media_type: "model_ai",
        source_image_url: sourceImage,
        image_url: generatedUrl,
        public_visible: false,
        sort_order: 100,
        metadata: {
          scene,
          model_profile: modelProfile,
          anti_ai_filters: true,
          image_model:
            process.env.OPENAI_IMAGE_MODEL ||
            "gpt-image-2",
        },
      })
      .select(
        "id,color,media_type,source_image_url,image_url,public_visible,sort_order,created_at",
      )
      .single();

    if (mediaError) throw mediaError;

    return NextResponse.json({
      ok: true,
      item: media,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar a foto.",
      },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.role === "admin" || access.canWriteFitness)
  ) {
    return NextResponse.json(
      { error: "Sem permissão." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = object(
    await request.json().catch(() => ({})),
  );

  const mediaId = text(body.media_id);

  if (!mediaId) {
    return NextResponse.json(
      { error: "Mídia não informada." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fitness_product_media")
    .update({
      public_visible: body.public_visible === true,
    })
    .eq("id", mediaId)
    .eq("product_id", id)
    .select(
      "id,color,media_type,source_image_url,image_url,public_visible,sort_order,created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    item: data,
  });
}
