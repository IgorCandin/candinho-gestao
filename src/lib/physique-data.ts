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
  ai_model: string | null;
  ai_imported_at: string | null;
  ai_payload: Record<string, unknown>;
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

export type PhysiqueAssessment = {
  id: string;
  athlete_id: string;
  assessed_on: string;
  source_type: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hips_cm: number | null;
  arm_left_cm: number | null;
  arm_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  calf_left_cm: number | null;
  calf_right_cm: number | null;
  notes: string | null;
  ai_status: string;
  ai_model: string | null;
  ai_payload: Record<string, unknown>;
  ai_interpreted_at: string | null;
  created_at: string;
};

export type PhysiqueAssessmentAttachment = {
  id: string;
  assessment_id: string;
  attachment_type: string;
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

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
    ai_model: typeof row.ai_model === "string" ? row.ai_model : null,
    ai_imported_at: typeof row.ai_imported_at === "string" ? row.ai_imported_at : null,
    ai_payload: jsonObject(row.ai_payload),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    athlete_name: typeof row.athlete_name === "string" ? row.athlete_name : null,
  };
}

function assessment(row: Record<string, unknown>): PhysiqueAssessment {
  return {
    id: String(row.id),
    athlete_id: String(row.athlete_id),
    assessed_on: String(row.assessed_on ?? ""),
    source_type: String(row.source_type ?? "manual"),
    weight_kg: nullableNumber(row.weight_kg),
    height_cm: nullableNumber(row.height_cm),
    body_fat_pct: nullableNumber(row.body_fat_pct),
    chest_cm: nullableNumber(row.chest_cm),
    waist_cm: nullableNumber(row.waist_cm),
    abdomen_cm: nullableNumber(row.abdomen_cm),
    hips_cm: nullableNumber(row.hips_cm),
    arm_left_cm: nullableNumber(row.arm_left_cm),
    arm_right_cm: nullableNumber(row.arm_right_cm),
    thigh_left_cm: nullableNumber(row.thigh_left_cm),
    thigh_right_cm: nullableNumber(row.thigh_right_cm),
    calf_left_cm: nullableNumber(row.calf_left_cm),
    calf_right_cm: nullableNumber(row.calf_right_cm),
    notes: typeof row.notes === "string" ? row.notes : null,
    ai_status: String(row.ai_status ?? "not_requested"),
    ai_model: typeof row.ai_model === "string" ? row.ai_model : null,
    ai_payload: jsonObject(row.ai_payload),
    ai_interpreted_at: typeof row.ai_interpreted_at === "string" ? row.ai_interpreted_at : null,
    created_at: String(row.created_at ?? ""),
  };
}

async function signedUrl(fileUrl: string) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("physique-training-files").createSignedUrl(fileUrl, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function getPhysiqueFoundationSnapshot() {
  const supabase = await createClient();
  const empty = {
    enabled: false,
    athletes: [] as PhysiqueAthlete[],
    athleteCount: 0,
    trainingPlanCount: 0,
    activeTrainingPlanCount: 0,
    assessmentCount: 0,
    attachmentCount: 0,
  };

  try {
    const [flagResult, athletesResult, plansResult, assessmentsResult, trainingAttachmentsResult, assessmentAttachmentsResult] = await Promise.all([
      supabase.from("ui_feature_flags").select("enabled").eq("key", "physique_enabled").maybeSingle(),
      supabase.from("physique_athlete_overview").select("*").order("display_name"),
      supabase.from("physique_training_plans").select("id,status"),
      supabase.from("physique_assessments").select("id", { count: "exact", head: true }),
      supabase.from("physique_training_attachments").select("id", { count: "exact", head: true }),
      supabase.from("physique_assessment_attachments").select("id", { count: "exact", head: true }),
    ]);

    if (athletesResult.error || plansResult.error) return empty;
    const athletes = (athletesResult.data ?? []).map((row) => athlete(row as Record<string, unknown>));
    const plans = plansResult.data ?? [];
    return {
      enabled: flagResult.data?.enabled === true,
      athletes,
      athleteCount: athletes.length,
      trainingPlanCount: plans.length,
      activeTrainingPlanCount: plans.filter((item) => item.status === "active").length,
      assessmentCount: assessmentsResult.count ?? 0,
      attachmentCount: (trainingAttachmentsResult.count ?? 0) + (assessmentAttachmentsResult.count ?? 0),
    };
  } catch {
    return empty;
  }
}

export async function getPhysiqueAthletes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("physique_athlete_overview").select("*").order("display_name");
  if (error) throw error;
  return (data ?? []).map((row) => athlete(row as Record<string, unknown>));
}

export async function getPhysiqueAthleteDetails(id: string) {
  const supabase = await createClient();
  const [athleteResult, plansResult, assessmentsResult] = await Promise.all([
    supabase.from("physique_athlete_overview").select("*").eq("id", id).maybeSingle(),
    supabase.from("physique_training_plans").select("*").eq("athlete_id", id).order("created_at", { ascending: false }),
    supabase.from("physique_assessments").select("*").eq("athlete_id", id).order("assessed_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  if (athleteResult.error) throw athleteResult.error;
  if (plansResult.error) throw plansResult.error;
  if (assessmentsResult.error) throw assessmentsResult.error;
  if (!athleteResult.data) return null;

  const assessments = (assessmentsResult.data ?? []).map((row) => assessment(row as Record<string, unknown>));
  const assessmentIds = assessments.map((item) => item.id);
  let attachmentRows: Record<string, unknown>[] = [];
  if (assessmentIds.length > 0) {
    const result = await supabase.from("physique_assessment_attachments").select("*").in("assessment_id", assessmentIds).order("created_at", { ascending: false });
    if (result.error) throw result.error;
    attachmentRows = (result.data ?? []) as Record<string, unknown>[];
  }

  const assessmentAttachments: PhysiqueAssessmentAttachment[] = [];
  for (const row of attachmentRows) {
    const fileUrl = String(row.file_url ?? "");
    assessmentAttachments.push({
      id: String(row.id),
      assessment_id: String(row.assessment_id),
      attachment_type: String(row.attachment_type ?? "other"),
      file_name: String(row.file_name ?? "Arquivo"),
      file_url: fileUrl,
      mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
      file_size_bytes: row.file_size_bytes == null ? null : n(row.file_size_bytes),
      created_at: String(row.created_at ?? ""),
      signed_url: await signedUrl(fileUrl),
    });
  }

  return {
    athlete: athlete(athleteResult.data as Record<string, unknown>),
    plans: (plansResult.data ?? []).map((row) => plan(row as Record<string, unknown>)),
    assessments,
    assessmentAttachments,
  };
}

export async function getPhysiqueTrainingPlans() {
  const supabase = await createClient();
  const [planResult, athleteResult] = await Promise.all([
    supabase.from("physique_training_plans").select("*").order("created_at", { ascending: false }),
    supabase.from("physique_athlete_overview").select("id,display_name"),
  ]);
  if (planResult.error) throw planResult.error;
  if (athleteResult.error) throw athleteResult.error;
  const names = new Map((athleteResult.data ?? []).map((row) => [String(row.id), String(row.display_name ?? "Atleta")]));
  return (planResult.data ?? []).map((row) => ({ ...plan(row as Record<string, unknown>), athlete_name: names.get(String(row.athlete_id)) ?? "Atleta" }));
}

export async function getPhysiqueTrainingPlanDetails(id: string) {
  const supabase = await createClient();
  const planResult = await supabase.from("physique_training_plans").select("*").eq("id", id).maybeSingle();
  if (planResult.error) throw planResult.error;
  if (!planResult.data) return null;

  const [athleteResult, dayResult, attachmentResult] = await Promise.all([
    supabase.from("physique_athlete_overview").select("*").eq("id", planResult.data.athlete_id).maybeSingle(),
    supabase.from("physique_training_days").select("*").eq("plan_id", id).order("day_order"),
    supabase.from("physique_training_attachments").select("*").eq("plan_id", id).order("created_at", { ascending: false }),
  ]);
  if (athleteResult.error) throw athleteResult.error;
  if (dayResult.error) throw dayResult.error;
  if (attachmentResult.error) throw attachmentResult.error;

  const days: PhysiqueTrainingDay[] = (dayResult.data ?? []).map((row) => ({
    id: String(row.id), plan_id: String(row.plan_id), day_order: n(row.day_order),
    day_label: String(row.day_label ?? "Treino"), focus: typeof row.focus === "string" ? row.focus : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  }));
  const dayIds = days.map((day) => day.id);
  let exerciseRows: Record<string, unknown>[] = [];
  if (dayIds.length > 0) {
    const result = await supabase.from("physique_training_exercises").select("*").in("day_id", dayIds).order("exercise_order");
    if (result.error) throw result.error;
    exerciseRows = (result.data ?? []) as Record<string, unknown>[];
  }
  const exercises: PhysiqueTrainingExercise[] = exerciseRows.map((row) => ({
    id: String(row.id), day_id: String(row.day_id), exercise_order: n(row.exercise_order),
    exercise_name: String(row.exercise_name ?? "Exercício"),
    sets_text: typeof row.sets_text === "string" ? row.sets_text : null,
    reps_text: typeof row.reps_text === "string" ? row.reps_text : null,
    rest_seconds: row.rest_seconds == null ? null : n(row.rest_seconds),
    technique: typeof row.technique === "string" ? row.technique : null,
    load_guidance: typeof row.load_guidance === "string" ? row.load_guidance : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  }));

  const attachments: PhysiqueAttachment[] = [];
  for (const row of attachmentResult.data ?? []) {
    const fileUrl = String(row.file_url ?? "");
    attachments.push({
      id: String(row.id), plan_id: String(row.plan_id), file_name: String(row.file_name ?? "Arquivo"), file_url: fileUrl,
      mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
      file_size_bytes: row.file_size_bytes == null ? null : n(row.file_size_bytes),
      created_at: String(row.created_at ?? ""), signed_url: await signedUrl(fileUrl),
    });
  }

  return {
    plan: plan(planResult.data as Record<string, unknown>),
    athlete: athleteResult.data ? athlete(athleteResult.data as Record<string, unknown>) : null,
    days,
    exercises,
    attachments,
  };
}
