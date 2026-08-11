import { redirect } from "next/navigation";
import { NexusFocusWorkspace } from "@/components/nexus-focus-workspace";
import { getCurrentUserAccess } from "@/lib/data";
import {
  emptyNexusPersonalWorkspace,
  type NexusPersonalWorkspace,
} from "@/lib/nexus-personal-types";
import {
  emptyNexusUnifiedQueue,
  type NexusUnifiedQueueSnapshot,
} from "@/lib/nexus-unified-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CentralMyDayPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [personalResult, queueResult] = await Promise.all([
    supabase.rpc("nexus_personal_workspace_v1", {
      p_route: "/central/meu-dia",
    }),
    supabase.rpc("nexus_unified_queue_v1", {
      p_limit: 80,
    }),
  ]);

  const personal =
    (personalResult.data as NexusPersonalWorkspace | null) ??
    emptyNexusPersonalWorkspace("/central/meu-dia");

  const queue =
    (queueResult.data as NexusUnifiedQueueSnapshot | null) ??
    emptyNexusUnifiedQueue();

  return (
    <NexusFocusWorkspace
      userName={access.name}
      initialPersonal={personal}
      initialQueue={queue}
    />
  );
}
