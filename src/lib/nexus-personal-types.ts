export type NexusPersonalShortcut = {
  id: string;
  label: string;
  href: string;
  operation_scope:
    | "company"
    | "central"
    | "supplements"
    | "fitness"
    | "bank"
    | "marketing"
    | "physique";
  context_route: string;
  source: "manual" | "learned" | "workflow" | "command";
  sort_order: number;
  use_count: number;
  last_used_at: string | null;
};

export type NexusPersonalSuggestion = {
  href: string;
  operation_scope: NexusPersonalShortcut["operation_scope"];
  source: "context" | "usage";
  hits: number;
  distinct_days: number;
  last_seen_at: string | null;
  score: number;
  reason: string;
};

export type NexusRecentRoute = {
  href: string;
  operation_scope: NexusPersonalShortcut["operation_scope"];
  last_seen_at: string | null;
};

export type NexusPersonalWorkspace = {
  generated_at: string;
  route: string;
  pinned: NexusPersonalShortcut[];
  suggested: NexusPersonalSuggestion[];
  recent: NexusRecentRoute[];
  stats: {
    total_pins: number;
    context_pins: number;
    suggestion_count: number;
    recent_count: number;
  };
};

export function emptyNexusPersonalWorkspace(
  route = "/dashboard",
): NexusPersonalWorkspace {
  return {
    generated_at: new Date().toISOString(),
    route,
    pinned: [],
    suggested: [],
    recent: [],
    stats: {
      total_pins: 0,
      context_pins: 0,
      suggestion_count: 0,
      recent_count: 0,
    },
  };
}
