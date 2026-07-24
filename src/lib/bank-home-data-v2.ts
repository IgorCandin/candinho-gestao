import {
  getBankMonthHomeData,
  type BankMonthCommitment,
  type BankMonthHomeData,
} from "@/lib/bank-home-data";
import { createClient } from "@/lib/supabase/server";

function total(rows: BankMonthCommitment[]) {
  return rows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
}

export async function getBankMonthHomeDataV2(): Promise<BankMonthHomeData> {
  const base = await getBankMonthHomeData();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_month_commitment_resolutions")
    .select("commitment_key,resolution,amount_override")
    .eq("reference_month", base.referenceMonth);

  if (error) throw error;

  const resolutions = new Map(
    (data ?? []).map((row) => [String(row.commitment_key), row]),
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
  };
}
