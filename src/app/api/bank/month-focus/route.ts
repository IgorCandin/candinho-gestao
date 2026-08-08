import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextMonthStart(referenceMonth: string) {
  const [year, month] = referenceMonth.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;
}

function dateInMonth(
  value: unknown,
  start: string,
  nextStart: string,
) {
  const date =
    typeof value === "string" && value.length >= 10
      ? value.slice(0, 10)
      : "";

  return Boolean(date && date >= start && date < nextStart);
}

export async function GET() {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    (!access.canAccessBank && access.role !== "admin")
  ) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  const month = await getBankMonthHomeDataV2();
  const supabase = await createClient();
  const referenceMonth = month.referenceMonth;
  const nextStart = nextMonthStart(referenceMonth);
  const tomorrow = addDays(month.today, 1);

  const [
    sourcesResult,
    receiptsResult,
    manualResult,
    supplementsResult,
    fitnessResult,
    debtsResult,
  ] = await Promise.all([
    supabase
      .from("bank_income_sources")
      .select(
        "id,name,payer_name,amount,frequency,include_in_projection,is_active,starts_on,ends_on,expected_day,origin",
      )
      .eq("is_active", true),
    supabase
      .from("bank_income_source_receipts")
      .select("source_id,amount,received_on")
      .eq("reference_month", referenceMonth),
    supabase
      .from("bank_receivables")
      .select(
        "id,title,payer_name,origin,amount,received_amount,status,due_date",
      )
      .gte("due_date", referenceMonth)
      .lt("due_date", nextStart)
      .not("status", "in", "(received,cancelled)")
      .order("due_date", { ascending: true }),
    supabase
      .from("sales")
      .select(
        "total_amount,payment_due_at,quoted_at,payment_status,general_status,record_type",
      )
      .eq("record_type", "sale")
      .eq("payment_status", "receivable")
      .neq("general_status", "cancelled"),
    supabase
      .from("fitness_sales")
      .select(
        "total_amount,payment_due_on,quoted_on,payment_status,general_status",
      )
      .eq("payment_status", "receivable")
      .neq("general_status", "cancelled"),
    supabase
      .from("bank_debts_overview")
      .select("id,debt_type,monthly_amount,effective_status")
      .not("effective_status", "in", "(paid,cancelled)"),
  ]);

  const errors = [
    sourcesResult.error,
    receiptsResult.error,
    manualResult.error,
    supplementsResult.error,
    fitnessResult.error,
    debtsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Não foi possível montar o foco mensal do Bank." },
      { status: 500 },
    );
  }

  const receivedSourceIds = new Set(
    (receiptsResult.data ?? []).map((row) => String(row.source_id)),
  );

  const fixedSources = (sourcesResult.data ?? []).filter((row) => {
    if (String(row.frequency ?? "monthly") !== "monthly") return false;
    if (!Boolean(row.include_in_projection)) return false;

    const startsOn =
      typeof row.starts_on === "string"
        ? row.starts_on.slice(0, 10)
        : null;
    const endsOn =
      typeof row.ends_on === "string"
        ? row.ends_on.slice(0, 10)
        : null;

    if (startsOn && startsOn >= nextStart) return false;
    if (endsOn && endsOn < referenceMonth) return false;

    return true;
  });

  const fixedPending = fixedSources
    .filter((row) => !receivedSourceIds.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: String(row.name ?? "Entrada"),
      payerName:
        typeof row.payer_name === "string" && row.payer_name.trim()
          ? row.payer_name
          : typeof row.origin === "string" && row.origin.trim()
            ? row.origin
            : "Sem origem informada",
      amount: number(row.amount),
      expectedDay:
        row.expected_day === null || row.expected_day === undefined
          ? null
          : Number(row.expected_day),
    }));

  const fixedPendingTotal = fixedPending.reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const manualPending = (manualResult.data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "Recebimento"),
    payerName:
      typeof row.payer_name === "string" && row.payer_name.trim()
        ? row.payer_name
        : typeof row.origin === "string" && row.origin.trim()
          ? row.origin
          : "Sem pagador informado",
    amount: Math.max(
      number(row.amount) - number(row.received_amount),
      0,
    ),
    dueDate: String(row.due_date ?? ""),
  }));

  const manualPendingTotal = manualPending.reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const supplementRows = (supplementsResult.data ?? []).filter((row) =>
    dateInMonth(
      row.payment_due_at ?? row.quoted_at,
      referenceMonth,
      nextStart,
    ),
  );

  const fitnessRows = (fitnessResult.data ?? []).filter((row) =>
    dateInMonth(
      row.payment_due_on ?? row.quoted_on,
      referenceMonth,
      nextStart,
    ),
  );

  const operationsTotal =
    supplementRows.reduce(
      (sum, row) => sum + number(row.total_amount),
      0,
    ) +
    fitnessRows.reduce(
      (sum, row) => sum + number(row.total_amount),
      0,
    );

  const recent = [...month.dueToday, ...month.upcoming]
    .filter(
      (item) =>
        Boolean(item.dueDate) &&
        String(item.dueDate) >= month.today &&
        String(item.dueDate) <= tomorrow,
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount,
      dueDate: item.dueDate,
      origin: item.origin,
      kind: item.kind,
      href: item.href,
    }));

  const laterCommitmentCount = [...month.dueToday, ...month.upcoming].filter(
    (item) =>
      Boolean(item.dueDate) && String(item.dueDate) > tomorrow,
  ).length;

  return NextResponse.json({
    today: month.today,
    tomorrow,
    mandatoryCommitments:
      Number(month.remainingMonthTotal ?? 0) +
      Number(month.overdueTotal ?? 0),
    recent,
    laterCommitmentCount,
    debts: (debtsResult.data ?? []).map((row) => ({
      id: String(row.id),
      debtType: String(row.debt_type ?? "loan"),
      monthlyAmount:
        row.monthly_amount === null || row.monthly_amount === undefined
          ? null
          : number(row.monthly_amount),
    })),
    income: {
      fixedPendingTotal,
      fixedPendingCount: fixedPending.length,
      fixedReceivedCount: receivedSourceIds.size,
      operationsTotal,
      operationsCount:
        supplementRows.length + fitnessRows.length,
      manualPendingTotal,
      manualPendingCount: manualPending.length,
      fixedPending: fixedPending.slice(0, 6),
      manualPending: manualPending.slice(0, 6),
    },
  });
}
