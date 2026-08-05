import { NextResponse } from "next/server";
import {
  generateNexus,
  type JsonRecord,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATCH_SCHEMA: JsonRecord = {
  type: "object",
  properties: {
    matched_product_id: {
      type: ["string", "null"],
    },
    normalized_product_name: { type: "string" },
    category: { type: ["string", "null"] },
    brand: { type: ["string", "null"] },
  },
  required: [
    "matched_product_id",
    "normalized_product_name",
    "category",
    "brand",
  ],
  additionalProperties: false,
};

function text(value: unknown, max = 180) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function parseJson(value: string) {
  const normalized = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(normalized) as Record<string, unknown>;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const name = text(body.name, 120);
  const phone = text(body.phone, 40);
  const requestedProductName = text(body.product_name, 180);
  const suppliedProductId = text(body.product_id, 80) || null;
  const source = text(body.source, 60) || "catalog_backorder";
  const useNexus = body.use_nexus === true;

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Informe seu nome para continuar." },
      { status: 400 },
    );
  }

  if (phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json(
      { error: "Informe um WhatsApp / telefone válido." },
      { status: 400 },
    );
  }

  if (!suppliedProductId && requestedProductName.length < 2) {
    return NextResponse.json(
      { error: "Informe o produto que você procura." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  let productId: string | null = suppliedProductId;
  let productName = requestedProductName;
  let category: string | null = null;
  let brand: string | null = null;
  let notes: string | null = null;

  if (!productId && useNexus) {
    const { data: candidateRows, error: candidatesError } =
      await supabase.rpc("public_catalog_match_candidates_v1", {
        p_limit: 140,
      });

    if (!candidatesError) {
      const candidates = (candidateRows ?? []).map(
        (row: Record<string, unknown>) => ({
          id: String(row.product_id ?? ""),
          name: String(row.name ?? ""),
          category:
            typeof row.category === "string" ? row.category : null,
          brand: typeof row.brand === "string" ? row.brand : null,
          available_quantity: Number(row.available_quantity ?? 0),
          incoming_quantity: Number(row.incoming_quantity ?? 0),
        }),
      );

      const byId = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
      );

      try {
        const result = await generateNexus({
          system:
            "Você normaliza pedidos de produtos da vitrine pública da Candinho Suplementos. Não invente correspondências.",
          prompt: `
A pessoa digitou o produto abaixo porque não o encontrou no catálogo:
"${requestedProductName}"

TAREFA:
1. Veja se é claramente o mesmo produto de algum item da lista real.
2. Só retorne matched_product_id quando a correspondência for segura.
3. Se não houver correspondência segura, use null.
4. Normalize o nome digitado sem inventar peso, sabor ou marca ausentes.
5. Categoria e marca podem ser null quando não houver segurança.

PRODUTOS REAIS:
${JSON.stringify(candidates)}
          `.trim(),
          schema: MATCH_SCHEMA,
          geminiModel:
            process.env.GEMINI_PUBLIC_CATALOG_MODEL ||
            process.env.GEMINI_NEXUS_MODEL ||
            "gemini-3.5-flash-lite",
          openAIModel:
            process.env.OPENAI_PUBLIC_CATALOG_MODEL ||
            process.env.OPENAI_NEXUS_MODEL ||
            "gpt-5-mini",
          timeoutMs: 30_000,
        });

        const parsed = parseJson(result.text);
        const matchedId =
          typeof parsed.matched_product_id === "string"
            ? parsed.matched_product_id
            : null;
        const matched = matchedId ? byId.get(matchedId) : null;

        if (matched) {
          if (matched.available_quantity > 0) {
            return NextResponse.json({
              ok: true,
              available_now: true,
              matched_name: matched.name,
              message: `Esse produto já está disponível no catálogo como "${matched.name}". Tente buscar por esse nome.`,
            });
          }

          productId = matched.id;
          productName = matched.name;
          category = matched.category;
          brand = matched.brand;
          notes = `Nexus reconheceu a procura digitada como produto já cadastrado: ${requestedProductName}`;
        } else {
          productName =
            typeof parsed.normalized_product_name === "string" &&
            parsed.normalized_product_name.trim()
              ? parsed.normalized_product_name.trim().slice(0, 180)
              : requestedProductName;

          category =
            typeof parsed.category === "string"
              ? parsed.category.trim().slice(0, 120) || null
              : null;

          brand =
            typeof parsed.brand === "string"
              ? parsed.brand.trim().slice(0, 120) || null
              : null;

          notes = `Procura digitada livremente na vitrine: ${requestedProductName}`;
        }
      } catch (error) {
        // Se a IA estiver indisponível, nunca perdemos a procura.
        productName = requestedProductName;
        notes =
          "Procura digitada livremente na vitrine. O Nexus não estava disponível para normalizar no momento.";
        console.warn("[Catalog Demand Nexus]", error);
      }
    }
  }

  const { data, error } = await supabase.rpc(
    "public_register_catalog_demand_gap_v1",
    {
      p_product_id: productId,
      p_product_name: productName || requestedProductName || null,
      p_name: name,
      p_phone: phone,
      p_category: category,
      p_brand: brand,
      p_notes: notes,
      p_source: source,
    },
  );

  if (error) {
    console.warn("[Catalog Demand Gap]", error.message);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Não foi possível registrar a procura agora.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    demand_gap_id: typeof data === "string" ? data : null,
    matched_name: productName || requestedProductName,
    message:
      "Pronto. Sua procura entrou na lista de reposição da Candinho.",
  });
}
