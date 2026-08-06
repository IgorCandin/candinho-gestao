export type NexusRoutineStep = {
  type: "route";
  href: string;
  label?: string;
};

export type NexusRoutine = {
  id: string;
  title: string;
  description: string | null;
  steps: NexusRoutineStep[];
  source: "manual" | "learned" | "template";
  source_key: string | null;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NexusRoutineSuggestion = {
  source_key: string;
  steps: NexusRoutineStep[];
  repetitions: number;
  distinct_days: number;
  last_seen_at: string | null;
};

export type NexusActiveRoutine = {
  run_id: string;
  routine_id: string;
  title: string;
  description: string | null;
  source: NexusRoutine["source"];
  steps: NexusRoutineStep[];
  current_step: number;
  total_steps: number;
  status: "active";
  started_at: string;
  updated_at: string;
  current: NexusRoutineStep | null;
  progress_percent: number;
};

export type NexusRoutineRecentRun = {
  run_id: string;
  routine_id: string;
  title: string;
  status: "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  current_step: number;
  total_steps: number;
};

export type NexusRoutinesWorkspace = {
  generated_at: string;
  active_run: NexusActiveRoutine | null;
  routines: NexusRoutine[];
  suggestions: NexusRoutineSuggestion[];
  recent_runs: NexusRoutineRecentRun[];
  stats: {
    routines: number;
    suggestions: number;
    recent_runs: number;
    has_active: boolean;
  };
};

export function emptyNexusRoutinesWorkspace(): NexusRoutinesWorkspace {
  return {
    generated_at: new Date().toISOString(),
    active_run: null,
    routines: [],
    suggestions: [],
    recent_runs: [],
    stats: {
      routines: 0,
      suggestions: 0,
      recent_runs: 0,
      has_active: false,
    },
  };
}
