import { createClient } from "@/lib/supabase/server";

export type PhysiqueAthleteVisual = {
  athlete_id: string;
  avatar_path: string | null;
  avatar_url: string | null;
};

export type PhysiqueShapeAnalysis = {
  id: string;
  athlete_id: string;
  analyzed_on: string;
  summary: string;
  strengths: string[];
  priorities: string[];
  symmetry_notes: string | null;
  posing_notes: string | null;
  limitations: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
};

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function sign(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("physique-training-files")
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}

export async function getPhysiqueAthleteVisual(
  athleteId: string,
): Promise<PhysiqueAthleteVisual> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physique_athletes")
    .select("id,avatar_path")
    .eq("id", athleteId)
    .maybeSingle();

  if (error) throw error;

  const path =
    data && typeof data.avatar_path === "string"
      ? data.avatar_path
      : null;

  return {
    athlete_id: athleteId,
    avatar_path: path,
    avatar_url: await sign(path),
  };
}

export async function getPhysiqueAthleteAvatarMap(
  athleteIds: string[],
): Promise<Record<string, PhysiqueAthleteVisual>> {
  if (athleteIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physique_athletes")
    .select("id,avatar_path")
    .in("id", athleteIds);

  if (error) throw error;

  const entries = await Promise.all(
    (data ?? []).map(async (row) => {
      const athleteId = String(row.id);
      const path =
        typeof row.avatar_path === "string" ? row.avatar_path : null;

      return [
        athleteId,
        {
          athlete_id: athleteId,
          avatar_path: path,
          avatar_url: await sign(path),
        } satisfies PhysiqueAthleteVisual,
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getPhysiqueShapeAnalyses(
  athleteId: string,
  limit = 8,
): Promise<PhysiqueShapeAnalysis[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physique_shape_analyses")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("analyzed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    athlete_id: String(row.athlete_id),
    analyzed_on: String(row.analyzed_on ?? ""),
    summary: String(row.summary ?? ""),
    strengths: strings(row.strengths),
    priorities: strings(row.priorities),
    symmetry_notes:
      typeof row.symmetry_notes === "string" ? row.symmetry_notes : null,
    posing_notes:
      typeof row.posing_notes === "string" ? row.posing_notes : null,
    limitations:
      typeof row.limitations === "string" ? row.limitations : null,
    provider: typeof row.provider === "string" ? row.provider : null,
    model: typeof row.model === "string" ? row.model : null,
    created_at: String(row.created_at ?? ""),
  }));
}
