import { createClient } from "@/lib/supabase/server";

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  provider: "apps_script" | "legacy_oauth" | null;
  email: string | null;
  calendar_id: string | null;
  status: string;
  sync_post_sale: boolean;
  sync_strategic_agenda: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  pending_jobs: number;
  error_jobs: number;
  done_jobs: number;
};

const EMPTY_STATUS: GoogleCalendarStatus = {
  configured: false,
  connected: false,
  provider: null,
  email: null,
  calendar_id: null,
  status: "disconnected",
  sync_post_sale: true,
  sync_strategic_agenda: true,
  last_sync_at: null,
  last_error: null,
  pending_jobs: 0,
  error_jobs: 0,
  done_jobs: 0,
};

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "central_google_calendar_status",
  );

  if (error || !data || typeof data !== "object") {
    return EMPTY_STATUS;
  }

  const row = data as Record<string, unknown>;
  const provider =
    row.provider === "apps_script"
      ? "apps_script"
      : row.provider === "legacy_oauth"
        ? "legacy_oauth"
        : null;

  return {
    configured: Boolean(row.configured),
    connected: Boolean(row.connected),
    provider,
    email: typeof row.email === "string" ? row.email : null,
    calendar_id:
      typeof row.calendar_id === "string"
        ? row.calendar_id
        : null,
    status:
      typeof row.status === "string"
        ? row.status
        : "disconnected",
    sync_post_sale: row.sync_post_sale !== false,
    sync_strategic_agenda:
      row.sync_strategic_agenda !== false,
    last_sync_at:
      typeof row.last_sync_at === "string"
        ? row.last_sync_at
        : null,
    last_error:
      typeof row.last_error === "string"
        ? row.last_error
        : null,
    pending_jobs: Number(row.pending_jobs ?? 0),
    error_jobs: Number(row.error_jobs ?? 0),
    done_jobs: Number(row.done_jobs ?? 0),
  };
}
