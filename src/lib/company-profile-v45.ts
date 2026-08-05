import { createClient } from "@/lib/supabase/server";

export type CompanyPublicIdentity = {
  trade_name: string;
  cnpj: string | null;
  opened_on: string | null;
  city: string | null;
  state: string | null;
  legal_status: string | null;
  company_size: string | null;
};

export type CompanyProfileSource = {
  id: string;
  source_url: string;
  source_title: string | null;
  source_domain: string | null;
  status: string;
  summary: string | null;
  public_safe: boolean;
  provider: string | null;
  model: string | null;
  created_at: string;
  applied_at: string | null;
};

export async function getCompanyPublicIdentity(): Promise<CompanyPublicIdentity> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("central_company_public_identity")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;

  return {
    trade_name: String(data?.trade_name ?? "Candinho Suplementos"),
    cnpj: typeof data?.cnpj === "string" ? data.cnpj : null,
    opened_on:
      typeof data?.opened_on === "string" ? data.opened_on : null,
    city: typeof data?.city === "string" ? data.city : null,
    state: typeof data?.state === "string" ? data.state : null,
    legal_status:
      typeof data?.legal_status === "string" ? data.legal_status : null,
    company_size:
      typeof data?.company_size === "string" ? data.company_size : null,
  };
}

export async function getCompanyProfileSources({
  publicOnly = false,
  limit = 12,
}: {
  publicOnly?: boolean;
  limit?: number;
} = {}): Promise<CompanyProfileSource[]> {
  const supabase = await createClient();

  let query = supabase
    .from("central_company_profile_sources")
    .select(
      "id,source_url,source_title,source_domain,status,summary,public_safe,provider,model,created_at,applied_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (publicOnly) {
    query = query.eq("status", "applied").eq("public_safe", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    source_url: String(row.source_url ?? ""),
    source_title:
      typeof row.source_title === "string" ? row.source_title : null,
    source_domain:
      typeof row.source_domain === "string" ? row.source_domain : null,
    status: String(row.status ?? "review"),
    summary: typeof row.summary === "string" ? row.summary : null,
    public_safe: Boolean(row.public_safe),
    provider: typeof row.provider === "string" ? row.provider : null,
    model: typeof row.model === "string" ? row.model : null,
    created_at: String(row.created_at ?? ""),
    applied_at:
      typeof row.applied_at === "string" ? row.applied_at : null,
  }));
}
