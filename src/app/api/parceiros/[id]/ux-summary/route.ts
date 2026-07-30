import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompletionField = {
  key: string;
  label: string;
  ok: boolean;
};

function filled(value: unknown) {
  return typeof value === "string"
    ? Boolean(value.trim())
    : value != null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.canAccessSupplements || access.role === "admin")
  ) {
    return NextResponse.json(
      { error: "Sem acesso à parceria." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("partner_management_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível carregar a parceria." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Parceiro não encontrado." },
      { status: 404 },
    );
  }

  const partner = data as Record<string, unknown>;
  const rewardType = String(partner.reward_type ?? "manual");
  const settlementFrequency = String(
    partner.settlement_frequency ?? "manual",
  );

  const fields: CompletionField[] = [
    { key: "name", label: "Nome", ok: filled(partner.name) },
    { key: "partner_type", label: "Tipo", ok: filled(partner.partner_type) },
    { key: "contact_name", label: "Responsável", ok: filled(partner.contact_name) },
    { key: "phone", label: "Telefone", ok: filled(partner.phone) },
    { key: "city", label: "Cidade", ok: filled(partner.city) },
    { key: "reference", label: "Referência", ok: filled(partner.reference) },
    { key: "start_date", label: "Data de início", ok: filled(partner.start_date) },
    {
      key: "partnership_model",
      label: "Modelo da parceria",
      ok: filled(partner.partnership_model),
    },
    {
      key: "settlement_rule",
      label: "Regra do acerto",
      ok: filled(partner.settlement_rule),
    },
  ];

  if (rewardType !== "none") {
    fields.push({
      key: "reward_description",
      label: "Descrição da recompensa",
      ok: filled(partner.reward_description),
    });
  }

  if (rewardType === "gift_per_sales") {
    fields.push({
      key: "target_sales",
      label: "Meta de vendas",
      ok: numberValue(partner.target_sales) > 0,
    });
  }

  if (
    rewardType === "fixed_per_sale" ||
    rewardType === "percentage"
  ) {
    fields.push({
      key: "reward_value",
      label:
        rewardType === "percentage"
          ? "Percentual da recompensa"
          : "Valor da recompensa",
      ok: numberValue(partner.reward_value) > 0,
    });
  }

  if (settlementFrequency === "monthly") {
    fields.push({
      key: "settlement_day",
      label: "Dia do acerto",
      ok: numberValue(partner.settlement_day) > 0,
    });
  }

  if (
    Boolean(partner.can_hold_stock) ||
    Boolean(partner.can_pickup)
  ) {
    fields.push({
      key: "linked_location_id",
      label: "Ponto físico relacionado",
      ok: filled(partner.linked_location_id),
    });
  }

  const completed = fields.filter((field) => field.ok).length;
  const missing = fields.filter((field) => !field.ok);
  const completionPct =
    fields.length > 0
      ? Math.round((completed / fields.length) * 100)
      : 100;

  const targetSales = numberValue(partner.target_sales);
  const totalSales = numberValue(partner.all_time_sales_count);
  const coveredSales = numberValue(partner.reward_sales_covered);
  const isGift =
    rewardType === "gift_per_sales" &&
    targetSales > 0;

  const nextRewardAt = isGift
    ? numberValue(partner.next_reward_at_sales) ||
      coveredSales + targetSales
    : 0;

  const salesToNext = isGift
    ? Math.max(
        0,
        partner.sales_to_next_reward == null
          ? nextRewardAt - totalSales
          : numberValue(partner.sales_to_next_reward),
      )
    : 0;

  const rewardUnitsDue = numberValue(partner.reward_units_due);
  const cycleProgressPct =
    isGift && targetSales > 0
      ? salesToNext > targetSales
        ? 0
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                ((targetSales - salesToNext) / targetSales) * 100,
              ),
            ),
          )
      : numberValue(partner.progress_pct);

  return NextResponse.json(
    {
      partner_id: String(partner.id),
      completion: {
        pct: completionPct,
        completed_fields: completed,
        total_fields: fields.length,
        missing_count: missing.length,
        missing_fields: missing.map((field) => ({
          key: field.key,
          label: field.label,
        })),
      },
      reward: {
        enabled: isGift,
        total_sales: totalSales,
        target_interval: targetSales,
        covered_sales: coveredSales,
        next_reward_at: nextRewardAt,
        sales_to_next: salesToNext,
        due_units: rewardUnitsDue,
        available:
          isGift &&
          (rewardUnitsDue > 0 || salesToNext === 0),
        progress_pct: cycleProgressPct,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
