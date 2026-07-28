import { createClient } from "@/lib/supabase/server";

export type CompanyProfileSection = {
  id: string;
  section_key: string;
  eyebrow: string | null;
  title: string;
  body: string;
  bullets: string[];
  source_label: string | null;
  sort_order: number;
  active: boolean;
  public_safe: boolean;
  verification_status: string;
  updated_at: string;
};

export type CompanyProfileUpdate = {
  id: string;
  original_filename: string;
  status: string;
  provider: string | null;
  model: string | null;
  applied_sections: number;
  ignored_sensitive: string[];
  created_at: string;
  applied_at: string | null;
};

export type OfficialDocument = {
  id: string;
  title: string;
  category: string;
  original_filename: string;
  mime_type: string | null;
  storage_path: string;
  document_date: string | null;
  expires_on: string | null;
  route_required: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
  signed_url: string | null;
};

function arrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        Boolean(item.trim()),
    )
    .map((item) => item.trim());
}

export async function getCompanyProfileSections({
  publicOnly = false,
}: {
  publicOnly?: boolean;
} = {}): Promise<CompanyProfileSection[]> {
  const supabase = await createClient();

  let query = supabase
    .from("central_company_profile_sections")
    .select("*")
    .order("sort_order")
    .order("section_key");

  if (publicOnly) {
    query = query
      .eq("active", true)
      .eq("public_safe", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    section_key: String(row.section_key),
    eyebrow:
      typeof row.eyebrow === "string"
        ? row.eyebrow
        : null,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    bullets: arrayOfStrings(row.bullets),
    source_label:
      typeof row.source_label === "string"
        ? row.source_label
        : null,
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    public_safe: Boolean(row.public_safe),
    verification_status: String(
      row.verification_status ?? "seeded",
    ),
    updated_at: String(row.updated_at ?? ""),
  }));
}

export async function getCompanyProfileUpdates(
  limit = 8,
): Promise<CompanyProfileUpdate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("central_company_profile_updates")
    .select(
      "id,original_filename,status,provider,model,applied_sections,ignored_sensitive,created_at,applied_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    original_filename: String(
      row.original_filename ?? "Arquivo",
    ),
    status: String(row.status ?? "processing"),
    provider:
      typeof row.provider === "string"
        ? row.provider
        : null,
    model:
      typeof row.model === "string"
        ? row.model
        : null,
    applied_sections: Number(
      row.applied_sections ?? 0,
    ),
    ignored_sensitive: arrayOfStrings(
      row.ignored_sensitive,
    ),
    created_at: String(row.created_at ?? ""),
    applied_at:
      typeof row.applied_at === "string"
        ? row.applied_at
        : null,
  }));
}

export async function getOfficialDocuments(): Promise<
  OfficialDocument[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("central_official_documents")
    .select("*")
    .eq("active", true)
    .order("route_required", {
      ascending: false,
    })
    .order("title");

  if (error) throw error;

  const rows = data ?? [];

  return Promise.all(
    rows.map(async (row) => {
      const storagePath = String(
        row.storage_path ?? "",
      );

      const signed =
        storagePath
          ? await supabase.storage
              .from("central-company-files")
              .createSignedUrl(
                storagePath,
                60 * 20,
              )
          : { data: null, error: null };

      return {
        id: String(row.id),
        title: String(row.title ?? "Documento"),
        category: String(
          row.category ?? "other",
        ),
        original_filename: String(
          row.original_filename ?? "arquivo.pdf",
        ),
        mime_type:
          typeof row.mime_type === "string"
            ? row.mime_type
            : null,
        storage_path: storagePath,
        document_date:
          typeof row.document_date === "string"
            ? row.document_date
            : null,
        expires_on:
          typeof row.expires_on === "string"
            ? row.expires_on
            : null,
        route_required: Boolean(
          row.route_required,
        ),
        notes:
          typeof row.notes === "string"
            ? row.notes
            : null,
        active: Boolean(row.active),
        created_at: String(row.created_at ?? ""),
        signed_url:
          signed.data?.signedUrl ?? null,
      };
    }),
  );
}
