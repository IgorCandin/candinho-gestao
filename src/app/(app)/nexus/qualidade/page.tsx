import { redirect } from "next/navigation";
import { NexusUxDoctorWorkspace } from "@/components/nexus-ux-doctor-workspace";
import type { UxIssueRow } from "@/components/ux-issue-report-list";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusUxDoctorSnapshot,
  type NexusUxDoctorSnapshot,
  type CompanyNavigationEscape,
} from "@/lib/nexus-ux-doctor-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NexusQualityPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [snapshotResult, reportsResult, escapesResult] = await Promise.all([
    supabase.rpc("nexus_ux_doctor_snapshot_v1"),
    supabase
      .from("ux_issue_reports_overview")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("company_navigation_escapes")
      .select("origin_route,destination_route,destination_operation,viewport_class,occurrence_count,last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(100),
  ]);

  const snapshot =
    (snapshotResult.data as NexusUxDoctorSnapshot | null) ??
    emptyNexusUxDoctorSnapshot();

  const rows = (reportsResult.data ?? []) as UxIssueRow[];

  return (
    <NexusUxDoctorWorkspace
      initialSnapshot={snapshot}
      manualRows={rows}
      initialEscapes={(escapesResult.data ?? []) as CompanyNavigationEscape[]}
    />
  );
}
