import { NextResponse } from "next/server";
import {
  generateNexus,
  nexusErrorResponse,
} from "@/lib/nexus-ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/data";

export const runtime = "nodejs";

const allowedSectionKeys = [
  "identidade",
  "proposito",
  "como_trabalhamos",
  "presenca",
  "diferenciais",
  "historia",
] as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "sections",
    "ignored_sensitive",
  ],
  properties: {
    summary: {
      type: "string",
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "section_key",
          "title",
          "body",
          "bullets",
          "confidence",
        ],
        properties: {
          section_key: {
            type: "string",
            enum: allowedSectionKeys,
          },
          title: {
            type: "string",
          },
          body: {
            type: "string",
          },
          bullets: {
            type: "array",
            items: {
              type: "string",
            },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
    ignored_sensitive: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;

const sensitivePatterns = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/,
  /\b\d{5}-?\d{3}\b/,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/,
  /\b(?:senha|password|token|secret|api[_ -]?key|chave pix|ag[eê]ncia banc[aá]ria|conta banc[aá]ria)\b/i,
];

function containsSensitive(value: string) {
  return sensitivePatterns.some((pattern) =>
    pattern.test(value),
  );
}

function cleanText(value: unknown) {
  if (typeof value !== "string")
    return null;

  const text = value
    .replace(/\s+/g, " ")
    .trim();

  if (
    !text ||
    containsSensitive(text)
  ) {
    return null;
  }

  return text.slice(0, 1600);
}

function parseJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as {
    summary: string;
    sections: Array<{
      section_key: string;
      title: string;
      body: string;
      bullets: string[];
      confidence: number;
    }>;
    ignored_sensitive: string[];
  };
}

function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(
  request: Request,
) {
  let updateId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    const access =
      await getCurrentUserAccess();

    if (
      !(
        access.role === "admin" ||
        access.canManageUsers
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não tem permissão para atualizar a apresentação.",
        },
        { status: 403 },
      );
    }

    const data =
      await request.formData();
    const file = data.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Envie um arquivo.",
        },
        { status: 400 },
      );
    }

    if (
      file.size <= 0 ||
      file.size >
        20 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "O arquivo precisa ter entre 1 byte e 20 MB.",
        },
        { status: 400 },
      );
    }

    const allowedMime = new Set([
      "application/pdf",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ?? "";

    const allowedExtension =
      new Set([
        "pdf",
        "txt",
        "md",
        "jpg",
        "jpeg",
        "png",
        "webp",
      ]);

    if (
      !allowedMime.has(file.type) &&
      !allowedExtension.has(extension)
    ) {
      return NextResponse.json(
        {
          error:
            "Use PDF, TXT, Markdown, JPEG, PNG ou WebP.",
        },
        { status: 400 },
      );
    }

    const supabase =
      await createClient();

    const { data: auth } =
      await supabase.auth.getUser();

    const userId = auth.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Sessão expirada.",
        },
        { status: 401 },
      );
    }

    uploadedPath = `profile-sources/${userId}/${crypto.randomUUID()}-${safeFilename(
      file.name,
    )}`;

    const uploadResult =
      await supabase.storage
        .from("central-company-files")
        .upload(uploadedPath, file, {
          upsert: false,
          contentType:
            file.type ||
            "application/octet-stream",
        });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const updateResult =
      await supabase
        .from(
          "central_company_profile_updates",
        )
        .insert({
          storage_path:
            uploadedPath,
          original_filename:
            file.name,
          mime_type:
            file.type || null,
          status: "processing",
        })
        .select("id")
        .single();

    if (updateResult.error) {
      throw updateResult.error;
    }

    updateId = String(
      updateResult.data.id,
    );

    const existingResult =
      await supabase
        .from(
          "central_company_profile_sections",
        )
        .select(
          "section_key,title,body,bullets,verification_status",
        )
        .order("sort_order");

    if (existingResult.error) {
      throw existingResult.error;
    }

    const result =
      await generateNexus({
        files: [
          {
            file,
            mimeType:
              file.type || undefined,
          },
        ],
        schema: schema as unknown as Record<
          string,
          unknown
        >,
        timeoutMs: 60_000,
        system: [
          "Você é o Nexus IA responsável por manter a apresentação institucional pública da Candinho Suplementos.",
          "Extraia SOMENTE fatos úteis para apresentar a empresa a clientes, amigos, parceiros ou familiares.",
          "Nunca exponha CPF, CNPJ, endereço completo, CEP, telefone pessoal, e-mail pessoal, dados bancários, PIX, credenciais, senhas, tokens, chaves de API, documentos pessoais, nomes/listas de clientes, fornecedores privados, custos, margens, lucro, faturamento, dívidas, saldos, estoque detalhado, contratos confidenciais ou informações que facilitem fraude.",
          "Não invente números, conquistas, certificações, laudos, pureza, alcance, cidades, parceiros ou resultados que o arquivo não sustente.",
          "Você só pode atualizar estas seções: identidade, proposito, como_trabalhamos, presenca, diferenciais, historia.",
          "Se o arquivo não trouxer melhoria factual para uma seção, NÃO devolva essa seção.",
          "Escreva em português brasileiro, tom humano, simples e institucional, sem exagero publicitário.",
          "Mantenha frases curtas. Bullets devem ser públicos e seguros.",
          "ignored_sensitive deve listar apenas categorias gerais descartadas, por exemplo 'dados fiscais' ou 'telefone', nunca o valor sensível.",
        ].join("\n"),
        prompt: [
          "Analise o arquivo enviado e proponha somente atualizações institucionais públicas seguras.",
          "Base atual da apresentação:",
          JSON.stringify(
            existingResult.data ?? [],
          ),
          "A informação nova deve corrigir, complementar ou tornar mais clara a base atual, sem apagar fatos já seguros apenas por não estarem repetidos no arquivo.",
        ].join("\n\n"),
      });

    const parsed =
      parseJson(result.text);

    const safeRows = parsed.sections
      .filter((section) =>
        allowedSectionKeys.includes(
          section.section_key as
            (typeof allowedSectionKeys)[number],
        ),
      )
      .filter(
        (section) =>
          Number(section.confidence) >=
          0.6,
      )
      .map((section) => {
        const title =
          cleanText(section.title);
        const body =
          cleanText(section.body);
        const bullets = (
          Array.isArray(
            section.bullets,
          )
            ? section.bullets
            : []
        )
          .map(cleanText)
          .filter(
            (item): item is string =>
              Boolean(item),
          )
          .slice(0, 7);

        if (!title || !body)
          return null;

        return {
          section_key:
            section.section_key,
          title,
          body,
          bullets,
          source_label:
            `Nexus · ${file.name}`,
          verification_status:
            "nexus_review",
          updated_by: userId,
          updated_at:
            new Date().toISOString(),
        };
      })
      .filter(
        (
          row,
        ): row is NonNullable<
          typeof row
        > => Boolean(row),
      );

    if (safeRows.length > 0) {
      const { error } =
        await supabase
          .from(
            "central_company_profile_sections",
          )
          .upsert(safeRows, {
            onConflict:
              "section_key",
          });

      if (error) throw error;
    }

    const ignored = (
      Array.isArray(
        parsed.ignored_sensitive,
      )
        ? parsed.ignored_sensitive
        : []
    )
      .map(cleanText)
      .filter(
        (item): item is string =>
          Boolean(item),
      )
      .slice(0, 12);

    const finishResult =
      await supabase
        .from(
          "central_company_profile_updates",
        )
        .update({
          status: "applied",
          extracted_payload:
            parsed,
          provider:
            result.provider,
          model: result.model,
          applied_sections:
            safeRows.length,
          ignored_sensitive:
            ignored,
          applied_at:
            new Date().toISOString(),
        })
        .eq("id", updateId);

    if (finishResult.error) {
      throw finishResult.error;
    }

    return NextResponse.json({
      summary:
        cleanText(parsed.summary) ??
        "Arquivo analisado pelo Nexus.",
      updated_sections:
        safeRows.length,
      ignored_sensitive:
        ignored,
    });
  } catch (error) {
    if (updateId) {
      try {
        const supabase =
          await createClient();

        await supabase
          .from(
            "central_company_profile_updates",
          )
          .update({
            status: "error",
            error_message:
              error instanceof Error
                ? error.message.slice(
                    0,
                    600,
                  )
                : "Falha na análise",
          })
          .eq("id", updateId);
      } catch {
        // Melhor esforço de auditoria.
      }
    } else if (uploadedPath) {
      try {
        const supabase =
          await createClient();

        await supabase.storage
          .from("central-company-files")
          .remove([uploadedPath]);
      } catch {
        // Melhor esforço.
      }
    }

    const detail =
      nexusErrorResponse(error);

    return NextResponse.json(
      {
        error: detail.error,
        code: detail.code,
      },
      {
        status: detail.status,
      },
    );
  }
}
