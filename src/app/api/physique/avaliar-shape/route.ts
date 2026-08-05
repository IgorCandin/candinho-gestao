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
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
    },
    priorities: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
    },
    symmetry_notes: { type: "string" },
    posing_notes: { type: "string" },
    limitations: { type: "string" },
  },
  required: [
    "summary",
    "strengths",
    "priorities",
    "symmetry_notes",
    "posing_notes",
    "limitations",
  ],
};

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function parseJson(value: string) {
  return JSON.parse(
    value
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim(),
  ) as JsonRecord;
}

export async function POST(request: Request) {
  const uploaded: string[] = [];

  try {
    const access = await getCurrentUserAccess();

    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para usar a análise visual da Physique." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const athleteId = String(form.get("athlete_id") ?? "").trim();
    const images = form
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    if (!athleteId) {
      return NextResponse.json({ error: "Atleta não informado." }, { status: 400 });
    }

    if (images.length < 1 || images.length > 3) {
      return NextResponse.json(
        { error: "Envie de 1 a 3 fotos para a análise." },
        { status: 400 },
      );
    }

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

    for (const image of images) {
      if (!allowed.has(image.type)) {
        return NextResponse.json(
          { error: "Use fotos JPEG, PNG ou WebP." },
          { status: 400 },
        );
      }

      if (image.size <= 0 || image.size > 2.5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Cada foto preparada deve ter no máximo 2,5 MB." },
          { status: 413 },
        );
      }
    }

    const supabase = await createClient();
    const athleteResult = await supabase
      .from("physique_athletes")
      .select("id,display_name,primary_goal")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteResult.error) throw athleteResult.error;
    if (!athleteResult.data) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 });
    }

    const athleteName = String(athleteResult.data.display_name ?? "Atleta");
    const goal =
      typeof athleteResult.data.primary_goal === "string"
        ? athleteResult.data.primary_goal
        : "não informado";

    const result = await generateNexus({
      system: [
        "Você é o Nexus da Candinho Physique e faz leitura visual esportiva de fotos enviadas voluntariamente pelo responsável pelo perfil.",
        "Descreva apenas aspectos visíveis relacionados a desenvolvimento muscular aparente, equilíbrio entre grupos, simetria aparente e qualidade das fotos/poses.",
        "NÃO identifique a pessoa e NÃO infira raça, etnia, idade, saúde, doenças, hormônios ou uso de substâncias.",
        "NÃO estime percentual de gordura, peso, medidas corporais ou diagnóstico médico pela imagem.",
        "Não trate uma foto como medição objetiva. Sempre registre limitações de iluminação, pose, ângulo e distância.",
        "O texto deve ser curto, prático e útil para orientar prioridades de treino, sem prometer resultado.",
      ].join("\n"),
      prompt: [
        `Atleta: ${athleteName}.`,
        `Objetivo registrado: ${goal}.`,
        "Analise as fotos em conjunto. Se houver apenas um ângulo, deixe claro o limite.",
        "strengths: até 5 pontos visuais que parecem mais desenvolvidos/equilibrados.",
        "priorities: até 5 grupos/áreas que visualmente poderiam receber prioridade para equilíbrio estético.",
        "symmetry_notes: diferenças aparentes entre lados ou regiões, sem afirmar lesão.",
        "posing_notes: diga se pose/iluminação/ângulo dificultam ou ajudam a comparação.",
        "limitations: uma frase clara lembrando que foto não substitui medidas e avaliação profissional.",
      ].join("\n"),
      schema: OUTPUT_SCHEMA,
      files: images.map((file) => ({
        file,
        mimeType: file.type,
      })),
      geminiModel:
        process.env.GEMINI_PHYSIQUE_VISION_MODEL ||
        process.env.GEMINI_PHYSIQUE_MODEL ||
        "gemini-2.5-flash-lite",
      openAIModel:
        process.env.OPENAI_PHYSIQUE_VISION_MODEL ||
        process.env.OPENAI_PHYSIQUE_MODEL ||
        "gpt-5-mini",
      timeoutMs: 50_000,
    });

    const parsed = parseJson(result.text);

    for (const image of images) {
      const path = `athletes/${athleteId}/shape/${crypto.randomUUID()}-${safeName(image.name || "shape.webp")}`;
      const upload = await supabase.storage
        .from("physique-training-files")
        .upload(path, image, {
          contentType: image.type,
          upsert: false,
        });

      if (upload.error) throw upload.error;
      uploaded.push(path);
    }

    const row = {
      athlete_id: athleteId,
      summary: String(parsed.summary ?? "").slice(0, 3000),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map(String).slice(0, 6)
        : [],
      priorities: Array.isArray(parsed.priorities)
        ? parsed.priorities.map(String).slice(0, 6)
        : [],
      symmetry_notes: String(parsed.symmetry_notes ?? "").slice(0, 2000) || null,
      posing_notes: String(parsed.posing_notes ?? "").slice(0, 2000) || null,
      limitations: String(parsed.limitations ?? "").slice(0, 2000) || null,
      image_paths: uploaded,
      provider: result.provider,
      model: result.model,
    };

    const insert = await supabase
      .from("physique_shape_analyses")
      .insert(row)
      .select("*")
      .single();

    if (insert.error) throw insert.error;

    return NextResponse.json({
      id: String(insert.data.id),
      athlete_id: athleteId,
      analyzed_on: String(insert.data.analyzed_on),
      summary: String(insert.data.summary),
      strengths: insert.data.strengths ?? [],
      priorities: insert.data.priorities ?? [],
      symmetry_notes: insert.data.symmetry_notes,
      posing_notes: insert.data.posing_notes,
      limitations: insert.data.limitations,
      provider: insert.data.provider,
      model: insert.data.model,
      created_at: String(insert.data.created_at),
    });
  } catch (error) {
    if (uploaded.length > 0) {
      try {
        const supabase = await createClient();
        await supabase.storage.from("physique-training-files").remove(uploaded);
      } catch {
        // best effort cleanup
      }
    }

    const friendly = nexusErrorResponse(error);
    return NextResponse.json(
      { error: friendly.error, code: friendly.code },
      { status: friendly.status },
    );
  }
}
