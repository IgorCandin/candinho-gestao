"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const validPriorityTypes = new Set(["payment", "lead", "stock"]);

function readPriority(formData: FormData) {
  const itemType = String(formData.get("itemType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!validPriorityTypes.has(itemType) || !/^[0-9a-f-]{36}$/i.test(entityId)) {
    throw new Error("Prioridade inválida.");
  }
  return { itemType, entityId };
}

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sessão não encontrada.");
  return { supabase, userId: user.id };
}

export async function ignoreDashboardPriority(formData: FormData) {
  const { itemType, entityId } = readPriority(formData);
  const { supabase, userId } = await currentUserId();
  const hiddenUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("dashboard_priority_preferences").upsert({
    user_id: userId,
    item_type: itemType,
    entity_id: entityId,
    hidden_until: hiddenUntil,
    permanently_hidden: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,item_type,entity_id" });

  if (error) throw error;
  revalidatePath("/suplementos");
}

export async function removeDashboardPriority(formData: FormData) {
  const { itemType, entityId } = readPriority(formData);
  const { supabase, userId } = await currentUserId();

  const { error } = await supabase.from("dashboard_priority_preferences").upsert({
    user_id: userId,
    item_type: itemType,
    entity_id: entityId,
    hidden_until: null,
    permanently_hidden: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,item_type,entity_id" });

  if (error) throw error;
  revalidatePath("/suplementos");
}
