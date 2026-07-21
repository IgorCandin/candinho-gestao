import { createClient } from "@/lib/supabase/server";

export type PhysiqueAthlete = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  instagram_username: string | null;
  status: string;
  primary_goal: string | null;
  notes: string | null;
  central_contact_id: string | null;
  central_contact_name: string | null;
  supplements_customer_id: string | null;
  supplements_customer_name: string | null;
  fitness_customer_id: string | null;
  fitness_customer_name: string | null;
  training_plan_count: number;
  active_training_plan_count: number;
  last_plan_update_at: string | null;
};

export type PhysiqueTrainingPlan = {
  id: string;
  athlete_id: string;
  title: string;
  goal: string | null;
  status: string;
  source_type: string;
  starts_on: string | null;
  ends_on: string | null;
  coach_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  athlete_name?: string | null;
};

export type PhysiqueTrainingDay = {
  id: string;
  plan_id: string;
  day_order: number;
  day_label: string;
  focus: string | null;
  notes: string | null;
};

export type PhysiqueTrainingExercise = {
  id: string;
  day_id: string;
  exercise_order: number;
  exercise_name: string;
  sets_text: string | null;
  reps_text: string | null;
  rest_seconds: number | null;
  technique: string | null;
  load_guidance: string | null;
  notes: string | null;
};

export type PhysiqueAttachment = {
  id: string;
  plan_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
  signed_url: string | null;
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function athlete(row: Record<string, unknown>): PhysiqueAthlete {
  return {
    id: String(row.id),
    display_name: String(row.display_name ?? "Atleta"),
    phone: typeof row.phone === "string" ? row.phone : null,
    email: typeof row.email === "string" ? row.email : null,
    instagram_username: typeof row.instagram_username === "string" ? row.instagram_username : null,
    status: String(row.status ?? "prospect"),
    primary_goal: typeof row.primary_goal === "string" ? row.primary_goal : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    central_contact_id: typeof row.central_contact_id === "string" ? row.central_contact_id : null,
    central_contact_name: typeof row.central_contact_name === "string" ? row.central_contact_name : null,
    supplements_customer_id: typeof row.supplements_customer_id === "string" ? row.supplements_customer_id : null,
    supplements_customer_name: typeof row.supplements_customer_name === "string" ? row.supplements_customer_name : null,
    fitness_customer_id: typeof row.fitness_customer_id === "string" ? row.fitness_customer_id : null,
    fitness_customer_name: typeof row.fitness_customer_name === "string" ? row.fitness_customer_name : null,
    training_plan_count: n(row.training_plan_count),
    active_training_plan_count: n(row.active_training_plan_count),
    last_plan_update_at: typeof row.last_plan_update_at === "string" ? row.last_plan_update_at : null,
  };
}

function plan(row: Record<string, unknown>): PhysiqueTrainingPlan {
  return {
    id: String(row.id),
    athlete_id: String(row.athlete_id),
    title: String(row.title ?? "Ficha de treino"),
    goal: typeof row.goal === "string" ? row.goal : null,
    status: String(row.status ?? "draft"),
    source_type: String(row.source_type ?? "manual"),
    starts_on: typeof row.starts_on === "string" ? row.starts_on : null,
    ends_on: typeof row.ends_on === "string" ? row.ends_on : null,
    coach_name: typeof row.coach_name === "string" ? row.coach_name : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    athlete_name: typeof row.athlete_name === "string" ? row.athlete_name : null,
  };
}

export async function getPhysiqueFoundationSnapshot() {
  const supabase = await createClient();

  const empty = {
    enabled: false,
    athletes: [] as PhysiqueAthlete[],
    athleteCount: 0,
    trainingPlanCount: 0,
    activeTrainingPlanCount: 0,
    attachmentCount: 0,
  };

  try {
    const [flagResult, athletesResult, plansResult, attachmentsResult] = await Promise.all([
      supabase.from("ui_feature_flags").select("enabled").eq("key", "physique_enabled").maybeSingle(),
      supabase.from("physique_athlete_overview").select("*").order("display_name"),
      supabase.from("physique_training_plans").select("id,status"),
      supabase.from("physique_training_attachments").select("id", { count: "exact", head: true }),
    ]);

    if (athletesResult.error || plansResult.error || attachmentsResult.error) {
      return empty;
    }

    const athletes = (athletesResult.data ?? []).map((row) =>
      athlete(row as Record<string, unknown>)
    );
    const plans = plansResult.data ?? [];

    return {
      enabled: flagResult.data?.enabled === true,
      athletes,
      athleteCount: athletes.length,
      trainingPlanCount: plans.length,
      activeTrainingPlanCount: plans.filter((item) => item.status === "active").length,
      attachmentCount: attachmentsResult.count ?? 0,
    };
  } catch {
    return empty;
  }
}

export async function getPhysiqueAthletes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physique_athlete_overview")
    .select("*")
    .order("display_name");

  if (error) throw error;
  return (data ?? []).map((row) => athlete(row as Record<string, unknown>));
}

export async function getPhysiqueAthleteDetails(id: string) {
  const supabase = await createClient();
  const [{ data: athleteRow, error: athleteError }, { data: planRows, error: planError }] = await Promise.all([
    supabase.from("physique_athlete_overview").select("*").eq("id", id).maybeSingle(),
    supabase.from("physique_training_plans").select("*").eq("athlete_id", id).order("created_at", { ascending: false }),
  ]);

  if (athleteError) throw athleteError;
  if (planError) throw planError;
  if (!athleteRow) return null;

  return {
    athlete: athlete(athleteRow as Record<string, unknown>),
    plans: (planRows ?? []).map((row) => plan(row as Record<string, unknown>)),
  };
}

export async function getPhysiqueTrainingPlans() {
  const supabase = await createClient();

  const [{ data: planRows, error: planError }, { data: athleteRows, error: athleteError }] = await Promise.all([
    supabase.from("physique_training_plans").select("*").order("created_at", { ascending: false }),
    supabase.from("physique_athlete_overview").select("id,display_name"),
  ]);

  if (planError) throw planError;
  if (athleteError) throw athleteError;

  const athleteNames = new Map(
    (athleteRows ?? []).map((row) => [String(row.id), String(row.display_name ?? "Atleta")]),
  );

  return (planRows ?? []).map((row) => ({
    ...plan(row as Record<string, unknown>),
    athlete_name: athleteNames.get(String(row.athlete_id)) ?? "Atleta",
  }));
}

export async function getPhysiqueTrainingPlanDetails(id: string) {
  const supabase = await createClient();

  const { data: planRow, error: planError } = await supabase
    .from("physique_training_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (planError) throw planError;
  if (!planRow) return null;

  const [{ data: athleteRow, error: athleteError }, { data: dayRows, error: dayError }, { data: attachmentRows, error: attachmentError }] = await Promise.all([
    supabase.from("physique_athlete_overview").select("*").eq("id", planRow.athlete_id).maybeSingle(),
    supabase.from("physique_training_days").select("*").eq("plan_id", id).order("day_order"),
    supabase.from("physique_training_attachments").select("*").eq("plan_id", id).order("created_at", { ascending: false }),
  ]);

  if (athleteError) throw athleteError;
  if (dayError) throw dayError;
  if (attachmentError) throw attachmentError;

  const days: PhysiqueTrainingDay[] = (dayRows ?? []).map((row) => ({
    id: String(row.id),
    plan_id: String(row.plan_id),
    day_order: n(row.day_order),
    day_label: String(row.day_label ?? "Treino"),
    focus: typeof row.focus === "string" ? row.focus : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  }));

  const dayIds = days.map((day) => day.id);
  let exerciseRows: Record<string, unknown>[] = [];

  if (dayIds.length > 0) {
    const { data, error } = await supabase
      .from("physique_training_exercises")
      .select("*")
      .in("day_id", dayIds)
      .order("exercise_order");

    if (error) throw error;
    exerciseRows = (data ?? []) as Record<string, unknown>[];
  }

  const exercises: PhysiqueTrainingExercise[] = exerciseRows.map((row) => ({
    id: String(row.id),
    day_id: String(row.day_id),
    exercise_order: n(row.exercise_order),
    exercise_name: String(row.exercise_name ?? "Exercício"),
    sets_text: typeof row.sets_text === "string" ? row.sets_text : null,
    reps_text: typeof row.reps_text === "string" ? row.reps_text : null,
    rest_seconds: row.rest_seconds == null ? null : n(row.rest_seconds),
    technique: typeof row.technique === "string" ? row.technique : null,
    load_guidance: typeof row.load_guidance === "string" ? row.load_guidance : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  }));

  const attachments: PhysiqueAttachment[] = [];

  for (const row of attachmentRows ?? []) {
    const fileUrl = String(row.file_url ?? "");
    let signedUrl: string | null = null;

    if (/^https?:\/\//i.test(fileUrl)) {
      signedUrl = fileUrl;
    } else if (fileUrl) {
      const { data } = await supabase.storage
        .from("physique-training-files")
        .createSignedUrl(fileUrl, 60 * 60);
      signedUrl = data?.signedUrl ?? null;
    }

    attachments.push({
      id: String(row.id),
      plan_id: String(row.plan_id),
      file_name: String(row.file_name ?? "Arquivo"),
      file_url: fileUrl,
      mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
      file_size_bytes: row.file_size_bytes == null ? null : n(row.file_size_bytes),
      created_at: String(row.created_at ?? ""),
      signed_url: signedUrl,
    });
  }

  return {
    plan: plan(planRow as Record<string, unknown>),
    athlete: athleteRow ? athlete(athleteRow as Record<string, unknown>) : null,
    days,
    exercises,
    attachments,
  };
}
