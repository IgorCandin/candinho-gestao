import { redirect } from "next/navigation";
import { NexusRoutinesWorkspace } from "@/components/nexus-routines-workspace";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusPersonalWorkspace,
  type NexusPersonalWorkspace,
} from "@/lib/nexus-personal-types";
import {
  emptyNexusRoutinesWorkspace,
  type NexusRoutinesWorkspace as NexusRoutinesWorkspaceSnapshot,
} from "@/lib/nexus-routine-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NexusRoutinesPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [routinesResult, personalResult] = await Promise.all([
    supabase.rpc("nexus_routines_workspace_v1"),
    supabase.rpc("nexus_personal_workspace_v1", {
      p_route: "/nexus/rotinas",
    }),
  ]);

  const workspace =
    (routinesResult.data as NexusRoutinesWorkspaceSnapshot | null) ??
    emptyNexusRoutinesWorkspace();

  const personal =
    (personalResult.data as NexusPersonalWorkspace | null) ??
    emptyNexusPersonalWorkspace("/nexus/rotinas");

  return (
    <NexusRoutinesWorkspace
      initialWorkspace={workspace}
      pinnedShortcuts={personal.pinned}
    />
  );
}
