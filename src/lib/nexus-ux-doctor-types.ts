export type NexusUxAutoSignal = {
  id: string;
  route: string;
  signal_type: "horizontal_overflow" | "fixed_clip" | "client_error";
  severity: "info" | "attention" | "high";
  viewport_class: "mobile" | "tablet" | "desktop" | "unknown";
  viewport_width: number | null;
  viewport_height: number | null;
  overflow_px: number | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  payload: Record<string, unknown>;
};

export type NexusUxTopRoute = {
  route: string;
  issue_count: number;
  high_count: number;
  last_seen_at: string | null;
};

export type NexusUxDeviceBreakdown = {
  viewport_class: string;
  total: number;
};

export type NexusUxDoctorSnapshot = {
  generated_at: string;
  health_score: number;
  manual_pending: number;
  manual_high: number;
  auto_active: number;
  auto_high: number;
  repeated_signals: number;
  manual_reports: unknown[];
  auto_signals: NexusUxAutoSignal[];
  top_routes: NexusUxTopRoute[];
  device_breakdown: NexusUxDeviceBreakdown[];
};

export function emptyNexusUxDoctorSnapshot(): NexusUxDoctorSnapshot {
  return {
    generated_at: new Date().toISOString(),
    health_score: 100,
    manual_pending: 0,
    manual_high: 0,
    auto_active: 0,
    auto_high: 0,
    repeated_signals: 0,
    manual_reports: [],
    auto_signals: [],
    top_routes: [],
    device_breakdown: [],
  };
}
