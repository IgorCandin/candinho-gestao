"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { normalizeStrategicMonth } from "@/lib/strategic-agenda-data";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

async function assertCanManageStrategicAgenda() {
  const access = await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canWriteSupplements ||
      access.canWriteFitness ||
      access.canWriteMarketing
    )
  ) {
    throw new Error("Seu usuário não possui permissão para gerenciar a Agenda Estratégica.");
  }
}

function refreshAgenda() {
  revalidatePath("/central/agenda-estrategica");
}

export async function setStrategicTaskStatus(formData: FormData) {
  await assertCanManageStrategicAgenda();

  const id = text(formData, "id");
  const status = text(formData, "status");

  if (!id || !["planned", "completed", "postponed"].includes(status)) {
    throw new Error("Status inválido.");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const payload =
    status === "completed"
      ? {
          status,
          completed_at: now,
          postponed_at: null,
          updated_at: now,
        }
      : status === "postponed"
        ? {
            status,
            completed_at: null,
            postponed_at: now,
            updated_at: now,
          }
        : {
            status,
            completed_at: null,
            postponed_at: null,
            updated_at: now,
          };

  const { error } = await supabase
    .from("central_strategic_agenda_items")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(`Não foi possível atualizar a tarefa: ${error.message}`);
  }

  refreshAgenda();
}

export async function saveStrategicTaskNotes(formData: FormData) {
  await assertCanManageStrategicAgenda();

  const id = text(formData, "id");
  if (!id) throw new Error("Tarefa inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("central_strategic_agenda_items")
    .update({
      impact_note: optionalText(formData, "impact_note"),
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Não foi possível salvar as anotações: ${error.message}`);
  }

  refreshAgenda();
}

export async function moveStrategicTaskWeek(formData: FormData) {
  await assertCanManageStrategicAgenda();

  const id = text(formData, "id");
  const week = Number(text(formData, "week_number"));

  if (!id || !Number.isInteger(week) || week < 1 || week > 4) {
    throw new Error("Semana inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("central_strategic_agenda_items")
    .update({
      week_number: week,
      status: "planned",
      postponed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Não foi possível mover a tarefa: ${error.message}`);
  }

  refreshAgenda();
}

export async function createStrategicTask(formData: FormData) {
  await assertCanManageStrategicAgenda();

  const task = text(formData, "task");
  const week = Number(text(formData, "week_number"));

  if (!task || !Number.isInteger(week) || week < 1 || week > 4) {
    throw new Error("Informe uma tarefa e uma semana válida.");
  }

  const supabase = await createClient();
  const referenceMonth = normalizeStrategicMonth(text(formData, "reference_month"));

  const { error } = await supabase
    .from("central_strategic_agenda_items")
    .insert({
      reference_month: referenceMonth,
      week_number: week,
      task,
      objective: optionalText(formData, "objective"),
      priority: text(formData, "priority") || "medium",
      category: text(formData, "category") || "Geral",
      sort_order: 1000,
      status: "planned",
      notes: optionalText(formData, "notes"),
    });

  if (error) {
    throw new Error(`Não foi possível criar a tarefa: ${error.message}`);
  }

  refreshAgenda();
}
