import {
  getBankMonthHomeData,
  type BankMonthCommitment,
  type BankMonthHomeData,
} from "@/lib/bank-home-data";
import { createClient } from "@/lib/supabase/server";

function total(rows: BankMonthCommitment[]) {
  return rows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
}

function nextMonthStart(referenceMonth: string) {
  const [year, month] = referenceMonth.slice(0, 7).split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function getBankMonthHomeDataV2(): Promise<BankMonthHomeData> {
  const base = await getBankMonthHomeData();
  const supabase = await createClient();

  const [resolutionsResult, incomeSourcesResult, receiptsResult] = await Promise.all([
    supabase
      .from("bank_month_commitment_resolutions")
      .select("commitment_key,resolution,amount_override")
      .eq("reference_month", base.referenceMonth),
    supabase
      .from("bank_income_sources")
      .select("id,amount,frequency,include_in_projection,is_active,starts_on,ends_on")
      .eq("is_active", true),
    supabase
      .from("bank_income_source_receipts")
      .select("source_id")
      .eq("reference_month", base.referenceMonth),
  ]);

  if (resolutionsResult.error) throw resolutionsResult.error;
  if (incomeSourcesResult.error) throw incomeSourcesResult.error;
  if (receiptsResult.error) throw receiptsResult.error;

  const resolutions = new Map(
    (resolutionsResult.data ?? []).map((row) => [String(row.commitment_key), row]),
  );

  const apply = (rows: BankMonthCommitment[]) =>
    rows
      .filter((item) => {
        const resolution = String(
          resolutions.get(item.id)?.resolution ?? "",
        );

        return !["paid", "dismissed"].includes(resolution);
      })
      .map((item) => {
        const override = resolutions.get(item.id)?.amount_override;

        return {
          ...item,
          amount:
            override === null || override === undefined
              ? item.amount
              : Number(override),
        };
      })
      .filter((item) => item.amount > 0);

  const commitments = apply(base.commitments);
  const overdue = apply(base.overdue);
  const dueToday = apply(base.dueToday);
  const upcoming = apply(base.upcoming);
  const monthPending = apply(base.monthPending);

  const receivedSourceIds = new Set(
    (receiptsResult.data ?? []).map((row) => String(row.source_id)),
  );

  const referenceStart = base.referenceMonth;
  const referenceNextStart = nextMonthStart(base.referenceMonth);

  const pendingRecurringIncome = (incomeSourcesResult.data ?? [])
    .filter((row) => {
      if (String(row.frequency ?? "monthly") !== "monthly") return false;
      if (!Boolean(row.include_in_projection)) return false;
      if (receivedSourceIds.has(String(row.id))) return false;

      const startsOn =
        typeof row.starts_on === "string" ? row.starts_on.slice(0, 10) : null;
      const endsOn =
        typeof row.ends_on === "string" ? row.ends_on.slice(0, 10) : null;

      if (startsOn && startsOn >= referenceNextStart) return false;
      if (endsOn && endsOn < referenceStart) return false;

      return Number(row.amount ?? 0) > 0;
    })
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    ...base,
    commitments,
    overdue,
    dueToday,
    upcoming,
    monthPending,
    remainingMonthTotal:
      total(dueToday) + total(upcoming) + total(monthPending),
    monthPendingTotal: total(monthPending),
    overdueTotal: total(overdue),
    dueTodayTotal: total(dueToday),
    monthCommitmentTotal:
      total(dueToday) + total(upcoming),
    receivableThisMonthTotal:
      base.receivableThisMonthTotal + pendingRecurringIncome,
  };
}
