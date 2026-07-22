"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function optionalNumber(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;

  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

async function assertCanManagePromotions() {
  const access = await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canWriteSupplements ||
      access.canWriteFitness ||
      access.canWriteMarketing
    )
  ) {
    throw new Error("Seu usuário não possui permissão para gerenciar promoções.");
  }
}

function revalidatePromotion(id?: string) {
  revalidatePath("/central/promocoes");
  if (id) revalidatePath(`/central/promocoes/${id}`);
}

export async function createPromotion(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const name = text(formData, "name");
  if (!name) throw new Error("Informe o nome da promoção.");

  const channels = formData
    .getAll("channels")
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from("central_promotions")
    .insert({
      name,
      operation_scope: text(formData, "operation_scope") || "both",
      status: "draft",
      objective: text(formData, "objective") || "stock_turnover",
      promotion_type: text(formData, "promotion_type") || "percentage",
      default_discount_pct: optionalNumber(formData, "default_discount_pct") ?? 0,
      coupon_code: optionalText(formData, "coupon_code"),
      starts_on: optionalText(formData, "starts_on"),
      ends_on: optionalText(formData, "ends_on"),
      channels,
      notes: optionalText(formData, "notes"),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não foi possível criar a promoção: ${error.message}`);

  redirect(`/central/promocoes/${data.id}`);
}

export async function createPromotionFromSuggestion(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const operationScope = text(formData, "operation_scope");
  const entityId = text(formData, "entity_id");
  const entityLabel = text(formData, "entity_label");
  const discount = optionalNumber(formData, "recommended_discount_pct") ?? 0;
  const protectedPrice = text(formData, "protected_price") === "true";

  if (!["supplements", "fitness"].includes(operationScope) || !entityId) {
    throw new Error("Sugestão inválida.");
  }

  const { data: promotion, error: promotionError } = await supabase
    .from("central_promotions")
    .insert({
      name: `Sugestão · ${entityLabel}`,
      operation_scope: operationScope,
      status: "draft",
      objective: protectedPrice ? "cross_sell" : "stock_turnover",
      promotion_type: protectedPrice ? "cross_sell" : "percentage",
      default_discount_pct: protectedPrice ? 0 : discount,
      notes: protectedPrice
        ? "Criada pelo Nexus como oportunidade de produto chamariz/cross-sell sem redução automática de preço."
        : "Criada a partir de uma oportunidade detectada pelo Nexus. Revise período, margem e canais antes de ativar.",
    })
    .select("id")
    .single();

  if (promotionError) {
    throw new Error(
      `Não foi possível criar a promoção sugerida: ${promotionError.message}`,
    );
  }

  const itemPayload = {
    promotion_id: promotion.id,
    operation_scope: operationScope,
    supplement_product_id: operationScope === "supplements" ? entityId : null,
    fitness_variant_id: operationScope === "fitness" ? entityId : null,
    item_role: protectedPrice ? "anchor" : "discounted",
    discount_pct: protectedPrice ? 0 : discount,
  };

  const { error: itemError } = await supabase
    .from("central_promotion_items")
    .insert(itemPayload);

  if (itemError) {
    await supabase.from("central_promotions").delete().eq("id", promotion.id);
    throw new Error(`Não foi possível adicionar o item sugerido: ${itemError.message}`);
  }

  redirect(`/central/promocoes/${promotion.id}`);
}

export async function updatePromotionBasics(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const id = text(formData, "promotion_id");
  if (!id) throw new Error("Promoção inválida.");

  const channels = formData
    .getAll("channels")
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("central_promotions")
    .update({
      name: text(formData, "name"),
      operation_scope: text(formData, "operation_scope"),
      objective: text(formData, "objective"),
      promotion_type: text(formData, "promotion_type"),
      default_discount_pct: optionalNumber(formData, "default_discount_pct") ?? 0,
      coupon_code: optionalText(formData, "coupon_code"),
      starts_on: optionalText(formData, "starts_on"),
      ends_on: optionalText(formData, "ends_on"),
      channels,
      notes: optionalText(formData, "notes"),
    })
    .eq("id", id);

  if (error) throw new Error(`Não foi possível atualizar a promoção: ${error.message}`);

  revalidatePromotion(id);
}

export async function updatePromotionStatus(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const id = text(formData, "promotion_id");
  const status = text(formData, "status");

  if (
    !id ||
    !["draft", "scheduled", "active", "ended", "cancelled"].includes(status)
  ) {
    throw new Error("Status inválido.");
  }

  const { error } = await supabase
    .from("central_promotions")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Não foi possível alterar o status: ${error.message}`);

  revalidatePromotion(id);
}

export async function addPromotionItems(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const promotionId = text(formData, "promotion_id");
  const supplementIds = formData
    .getAll("supplementProductIds")
    .map(String)
    .filter(Boolean);
  const fitnessIds = formData
    .getAll("fitnessVariantIds")
    .map(String)
    .filter(Boolean);

  if (!promotionId) throw new Error("Promoção inválida.");

  const { data: promotion, error: promotionError } = await supabase
    .from("central_promotions")
    .select("operation_scope,default_discount_pct")
    .eq("id", promotionId)
    .single();

  if (promotionError) throw new Error(`Promoção não encontrada: ${promotionError.message}`);

  const { data: existing, error: existingError } = await supabase
    .from("central_promotion_items")
    .select("supplement_product_id,fitness_variant_id")
    .eq("promotion_id", promotionId);

  if (existingError) throw new Error(`Falha ao conferir itens: ${existingError.message}`);

  const existingSupp = new Set(
    (existing ?? [])
      .map((row) => row.supplement_product_id)
      .filter(Boolean)
      .map(String),
  );
  const existingFit = new Set(
    (existing ?? [])
      .map((row) => row.fitness_variant_id)
      .filter(Boolean)
      .map(String),
  );

  const rows = [
    ...(promotion.operation_scope !== "fitness"
      ? supplementIds
          .filter((id) => !existingSupp.has(id))
          .map((id) => ({
            promotion_id: promotionId,
            operation_scope: "supplements",
            supplement_product_id: id,
            fitness_variant_id: null,
            item_role: "discounted",
            discount_pct: Number(promotion.default_discount_pct ?? 0),
          }))
      : []),
    ...(promotion.operation_scope !== "supplements"
      ? fitnessIds
          .filter((id) => !existingFit.has(id))
          .map((id) => ({
            promotion_id: promotionId,
            operation_scope: "fitness",
            supplement_product_id: null,
            fitness_variant_id: id,
            item_role: "discounted",
            discount_pct: Number(promotion.default_discount_pct ?? 0),
          }))
      : []),
  ];

  if (rows.length > 0) {
    const { error } = await supabase.from("central_promotion_items").insert(rows);
    if (error) throw new Error(`Não foi possível adicionar os produtos: ${error.message}`);
  }

  revalidatePromotion(promotionId);
}

export async function updatePromotionItem(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const itemId = text(formData, "item_id");
  const promotionId = text(formData, "promotion_id");

  const { error } = await supabase
    .from("central_promotion_items")
    .update({
      item_role: text(formData, "item_role") || "discounted",
      discount_pct: optionalNumber(formData, "discount_pct"),
      promotional_price: optionalNumber(formData, "promotional_price"),
      quantity_limit: optionalNumber(formData, "quantity_limit"),
    })
    .eq("id", itemId);

  if (error) throw new Error(`Não foi possível atualizar o produto: ${error.message}`);

  revalidatePromotion(promotionId);
}

export async function removePromotionItem(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const itemId = text(formData, "item_id");
  const promotionId = text(formData, "promotion_id");

  const { error } = await supabase
    .from("central_promotion_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(`Não foi possível remover o produto: ${error.message}`);

  revalidatePromotion(promotionId);
}

export async function savePromotionResults(formData: FormData) {
  await assertCanManagePromotions();
  const supabase = await createClient();

  const id = text(formData, "promotion_id");

  const { error } = await supabase
    .from("central_promotions")
    .update({
      result_revenue: optionalNumber(formData, "result_revenue"),
      result_profit: optionalNumber(formData, "result_profit"),
      result_units: optionalNumber(formData, "result_units"),
      result_notes: optionalText(formData, "result_notes"),
    })
    .eq("id", id);

  if (error) throw new Error(`Não foi possível salvar o resultado: ${error.message}`);

  revalidatePromotion(id);
}
