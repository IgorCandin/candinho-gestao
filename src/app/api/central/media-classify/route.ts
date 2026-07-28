import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import {
  generateNexus,
  nexusErrorResponse,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OUTPUT_SCHEMA: JsonRecord = {
  type: "object",
  properties: {
    description: { type: "string" },
    category: { type: "string" },
    environment: { type: "string" },
    recognized_products: {
      type: "array",
      items: { type: "string" },
    },
    suggested_use: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "description",
    "category",
    "environment",
    "recognized_products",
    "suggested_use",
    "tags",
  ],
  additionalProperties: false,
};

function cleanList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    const canUseCentral =
      access.active &&
      (access.role === "admin" ||
        access.canAccessSupplements ||
        access.canAccessFitness ||
        access.canAccessMarketing);

    if (!canUseCentral) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 },
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as { asset_id?: string };

    const assetId =
      typeof body.asset_id === "string"
        ? body.asset_id.trim()
        : "";

    if (!assetId) {
      return NextResponse.json(
        { error: "asset_id é obrigatório." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: asset, error: assetError } = await supabase
      .from("central_media_assets")
      .select(
        "id,operation_scope,storage_path,original_filename,mime_type,source",
      )
      .eq("id", assetId)
      .maybeSingle();

    if (assetError) throw assetError;

    if (!asset) {
      return NextResponse.json(
        { error: "Mídia não encontrada." },
        { status: 404 },
      );
    }

    const mime = String(asset.mime_type ?? "");
    const supported = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(mime);

    if (!supported || !asset.storage_path) {
      return NextResponse.json(
        {
          error:
            "A classificação visual automática está disponível para JPEG, PNG e WebP.",
        },
        { status: 400 },
      );
    }

    const { data: blob, error: downloadError } =
      await supabase.storage
        .from("central-media")
        .download(String(asset.storage_path));

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message ||
          "Não foi possível carregar a mídia para análise.",
      );
    }

    const filename =
      String(asset.original_filename || "midia").trim() || "midia";

    const file = new File(
      [await blob.arrayBuffer()],
      filename,
      { type: mime },
    );

    const result = await generateNexus({
      system:
        "Você é o Nexus Mídia da Candinho Company. Classifique arquivos visuais para organização interna com rigor factual. Não invente detalhes e não identifique pessoas reais.",
      prompt: [
        "Analise esta imagem para a biblioteca interna da Candinho Company.",
        "",
        "Retorne:",
        "- description: descrição curta, objetiva e útil para localizar o arquivo depois;",
        "- category: categoria visual curta, por exemplo produto, campanha, mascote, academia, cliente, comprovante ou outro;",
        "- environment: ambiente/cenário visível; use string vazia se não estiver claro;",
        "- recognized_products: apenas nomes ou textos de produtos que estejam realmente visíveis;",
        "- suggested_use: uso provável do arquivo dentro da operação, sem inventar contexto;",
        "- tags: termos curtos úteis para busca.",
        "",
        "Regras:",
        "- não identifique pessoas reais;",
        "- não infira saúde, idade, origem, religião, política ou outros atributos sensíveis;",
        "- se algo não estiver visível, deixe vazio em vez de adivinhar;",
        `- operação do arquivo: ${String(asset.operation_scope ?? "company")};`,
        `- nome do arquivo: ${filename}.`,
      ].join("\n"),
      schema: OUTPUT_SCHEMA,
      files: [{ file, mimeType: mime }],
      geminiModel:
        process.env.GEMINI_MEDIA_MODEL ||
        process.env.GEMINI_NEXUS_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_MEDIA_MODEL ||
        process.env.OPENAI_NEXUS_MODEL ||
        "gpt-5-mini",
      timeoutMs: 50_000,
    });

    let analysis: JsonRecord;

    try {
      analysis = JSON.parse(result.text) as JsonRecord;
    } catch {
      throw new Error(
        "O Nexus retornou uma classificação em formato inválido.",
      );
    }

    const description =
      typeof analysis.description === "string"
        ? analysis.description.trim()
        : "";

    const category =
      typeof analysis.category === "string"
        ? analysis.category.trim()
        : "";

    const environment =
      typeof analysis.environment === "string"
        ? analysis.environment.trim()
        : "";

    const suggestedUse =
      typeof analysis.suggested_use === "string"
        ? analysis.suggested_use.trim()
        : "";

    const recognizedProducts = cleanList(
      analysis.recognized_products,
    );
    const tags = cleanList(analysis.tags);

    const metadata: JsonRecord = {
      category,
      environment,
      suggested_use: suggestedUse,
      recognized_products: recognizedProducts,
      tags,
      nexus_provider: result.provider,
      nexus_model: result.model,
      classified_at: new Date().toISOString(),
    };

    const searchText = [
      filename,
      description,
      category,
      environment,
      suggestedUse,
      ...recognizedProducts,
      ...tags,
    ]
      .filter(Boolean)
      .join(" ");

    const { error: updateError } = await supabase
      .from("central_media_assets")
      .update({
        description_ai:
          description || "Imagem classificada pelo Nexus.",
        ai_metadata: metadata,
        search_text: searchText,
      })
      .eq("id", asset.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const normalized = nexusErrorResponse(error);

    return NextResponse.json(
      {
        error: normalized.error,
        code: normalized.code,
      },
      { status: normalized.status },
    );
  }
}
