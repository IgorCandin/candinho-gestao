import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthBounds() {
  const today = todayInBrazil();
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const nextStart = `${next.getUTCFullYear()}-${String(
    next.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  return { start, nextStart };
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
      {
        fixedExpected: 0,
        fixedReceived: 0,
        fixedPending: 0,
        fixedPendingCount: 0,
        fixedReceivedCount: 0,
        operationsTotal: 0,
        operationsCount: 0,
        manualTotal: 0,
        manualCount: 0,
      },
      { status: 403 },
    );
  }

  const { start, nextStart } = monthBounds();
  const supabase = await createClient();

  const [
    sourcesResult,
    receiptsResult,
    supplementResult,
    fitnessResult,
    manualResult,
  ] = await Promise.all([
    supabase
      .from("bank_income_sources")
      .select(
        "id,amount,frequency,include_in_projection,is_active,starts_on,ends_on",
      )
      .eq("is_active", true),
    supabase
      .from("bank_income_source_receipts")
      .select("source_id,amount")
      .eq("reference_month", start),
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
      .from("bank_receivables")
      .select("amount,received_amount,status,due_date")
      .gte("due_date", start)
      .lt("due_date", nextStart)
      .not("status", "in", "(received,cancelled)"),
  ]);

  const errors = [
    sourcesResult.error,
    receiptsResult.error,
    supplementResult.error,
    fitnessResult.error,
    manualResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Não foi possível montar o resumo de recebimentos." },
      { status: 500 },
    );
  }

  const receiptMap = new Map(
    (receiptsResult.data ?? []).map((row) => [
      String(row.source_id),
      number(row.amount),
    ]),
  );

  const fixedSources = (sourcesResult.data ?? []).filter((row) => {
    if (String(row.frequency ?? "monthly") !== "monthly") return false;
    if (!Boolean(row.include_in_projection)) return false;

    const startsOn =
      typeof row.starts_on === "string" ? row.starts_on.slice(0, 10) : null;
    const endsOn =
      typeof row.ends_on === "string" ? row.ends_on.slice(0, 10) : null;

    if (startsOn && startsOn >= nextStart) return false;
    if (endsOn && endsOn < start) return false;

    return true;
  });

  const fixedExpected = fixedSources.reduce(
    (sum, row) => sum + number(row.amount),
    0,
  );

  let fixedReceived = 0;
  let fixedPending = 0;
  let fixedPendingCount = 0;
  let fixedReceivedCount = 0;

  for (const source of fixedSources) {
    const id = String(source.id);
    const expected = number(source.amount);

    if (receiptMap.has(id)) {
      fixedReceived += receiptMap.get(id) ?? expected;
      fixedReceivedCount += 1;
    } else {
      fixedPending += expected;
      fixedPendingCount += 1;
    }
  }

  const supplementRows = (supplementResult.data ?? []).filter((row) =>
    dateInMonth(
      row.payment_due_at ?? row.quoted_at,
      start,
      nextStart,
    ),
  );

  const fitnessRows = (fitnessResult.data ?? []).filter((row) =>
    dateInMonth(
      row.payment_due_on ?? row.quoted_on,
      start,
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

  const manualRows = manualResult.data ?? [];
  const manualTotal = manualRows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        number(row.amount) - number(row.received_amount),
        0,
      ),
    0,
  );

  return NextResponse.json({
    fixedExpected,
    fixedReceived,
    fixedPending,
    fixedPendingCount,
    fixedReceivedCount,
    operationsTotal,
    operationsCount: supplementRows.length + fitnessRows.length,
    manualTotal,
    manualCount: manualRows.length,
  });
}
