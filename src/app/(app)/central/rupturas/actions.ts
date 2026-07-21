"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(
  formData: FormData,
  key: string,
) {
  return text(formData, key) || null;
}

async function assertCanManageDemandGaps() {
  const access = await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canWriteSupplements ||
      access.canWriteFitness
    )
  ) {
    throw new Error(
      "Seu usuário não possui permissão para registrar rupturas.",
    );
  }
}

export async function createDemandGap(
  formData: FormData,
) {
  await assertCanManageDemandGaps();

  const productName = text(
    formData,
    "product_name",
  );

  if (!productName) {
    throw new Error(
      "Informe o nome do produto procurado.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("central_demand_gaps")
    .insert({
      product_name: productName,
      operation_scope:
        text(formData, "operation_scope") ||
        "supplements",
      category: optionalText(
        formData,
        "category",
      ),
      brand: optionalText(
        formData,
        "brand",
      ),
      customer_name: optionalText(
        formData,
        "customer_name",
      ),
      customer_phone: optionalText(
        formData,
        "customer_phone",
      ),
      city: optionalText(
        formData,
        "city",
      ),
      requested_on:
        optionalText(
          formData,
          "requested_on",
        ) ?? undefined,
      priority:
        text(formData, "priority") ||
        "medium",
      image_url: optionalText(
        formData,
        "image_url",
      ),
      image_source_url: optionalText(
        formData,
        "image_source_url",
      ),
      notes: optionalText(
        formData,
        "notes",
      ),
    });

  if (error) {
    throw new Error(
      `Não foi possível registrar a demanda: ${error.message}`,
    );
  }

  revalidatePath("/central/rupturas");
}

export async function updateDemandGapStatus(
  formData: FormData,
) {
  await assertCanManageDemandGaps();

  const id = text(formData, "id");
  const status = text(
    formData,
    "status",
  );

  const valid = [
    "open",
    "evaluating",
    "planned_purchase",
    "ordered",
    "stocked",
    "dismissed",
  ];

  if (!id || !valid.includes(status)) {
    throw new Error("Status inválido.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("central_demand_gaps")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Não foi possível atualizar a demanda: ${error.message}`,
    );
  }

  revalidatePath("/central/rupturas");
}
