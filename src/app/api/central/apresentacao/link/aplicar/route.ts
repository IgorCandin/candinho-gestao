import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const allowedSectionKeys = new Set([
  "identidade",
  "proposito",
  "como_trabalhamos",
  "presenca",
  "diferenciais",
  "historia",
]);

const sortOrder: Record<string, number> = {
  identidade: 10,
  proposito: 20,
  como_trabalhamos: 30,
  presenca: 40,
  diferenciais: 50,
  historia: 60,
};

const eyebrow: Record<string, string> = {
  identidade: "Candinho Suplementos",
  proposito: "Por que existe",
  como_trabalhamos: "Como funciona",
  presenca: "Presença",
  diferenciais: "O que buscamos fazer diferente",
  historia: "Nossa história",
};

function text(value: unknown, max = 2000) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.canManageUsers && access.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para aplicar esta fonte." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      source_id?: unknown;
    };
    const sourceId =
      typeof body.source_id === "string" ? body.source_id.trim() : "";

    if (!sourceId) {
      return NextResponse.json({ error: "Fonte não informada." }, { status: 400 });
    }

    const supabase = await createClient();
    const sourceResult = await supabase
      .from("central_company_profile_sources")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceResult.error) throw sourceResult.error;
    if (!sourceResult.data) {
      return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });
    }

    const payload =
      sourceResult.data.proposed_payload &&
      typeof sourceResult.data.proposed_payload === "object"
        ? (sourceResult.data.proposed_payload as Record<string, unknown>)
        : {};

    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    const sourceTitle =
      text(sourceResult.data.source_title, 240) ||
      text(sourceResult.data.source_domain, 120) ||
      "fonte pública";

    const safeRows = sections
      .map((value) => {
        const row =
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : {};
        const key = text(row.section_key, 60);
        const confidence = Number(row.confidence ?? 0);

        if (!allowedSectionKeys.has(key) || confidence < 0.6) return null;

        const title = text(row.title, 240);
        const body = text(row.body, 1800);
        const bullets = Array.isArray(row.bullets)
          ? row.bullets.map((item) => text(item, 300)).filter(Boolean).slice(0, 7)
          : [];

        if (!title || !body) return null;

        return {
          section_key: key,
          eyebrow: eyebrow[key] ?? null,
          title,
          body,
          bullets,
          source_label: `Matéria · ${sourceTitle}`,
          sort_order: sortOrder[key] ?? 100,
          active: true,
          public_safe: true,
          verification_status: "nexus_source_review",
          updated_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (safeRows.length > 0) {
      const update = await supabase
        .from("central_company_profile_sections")
        .upsert(safeRows, { onConflict: "section_key" });

      if (update.error) throw update.error;
    }

    const finish = await supabase
      .from("central_company_profile_sources")
      .update({
        status: "applied",
        public_safe: true,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    if (finish.error) throw finish.error;

    return NextResponse.json({
      ok: true,
      updated_sections: safeRows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar a fonte.",
      },
      { status: 500 },
    );
  }
}
