import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PeriodKey = "7d" | "30d" | "3m" | "6m" | "12m";
type BucketKind = "day" | "week" | "month";

type DateOnly = {
  year: number;
  month: number;
  day: number;
};

type ProfitPoint = {
  key: string;
  label: string;
  fullLabel: string;
  profit: number;
  revenue: number;
  salesCount: number;
};

type SaleProfitRow = {
  delivered_at: string | null;
  total_profit: number | string | null;
  total_amount: number | string | null;
};

type Operation = "company" | "suplementos" | "fitness";

const PERIODS: Record<
  PeriodKey,
  { label: string; bucket: BucketKind; days?: number; months?: number }
> = {
  "7d": { label: "7 dias", bucket: "day", days: 7 },
  "30d": { label: "30 dias", bucket: "day", days: 30 },
  "3m": { label: "3 meses", bucket: "week", days: 90 },
  "6m": { label: "6 meses", bucket: "month", months: 6 },
  "12m": { label: "12 meses", bucket: "month", months: 12 },
};

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSaoPauloToday(): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function toUtcDate(date: DateOnly) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function fromUtcDate(date: Date): DateOnly {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addDays(date: DateOnly, amount: number) {
  const next = toUtcDate(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return fromUtcDate(next);
}

function addMonths(date: DateOnly, amount: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1 + amount, 1));
  return fromUtcDate(next);
}

function firstDayOfMonth(date: DateOnly): DateOnly {
  return { year: date.year, month: date.month, day: 1 };
}

function dateKey(date: DateOnly) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function monthKey(date: DateOnly) {
  return `${date.year}-${String(date.month).padStart(2, "0")}`;
}

function toDatabaseTimestamp(date: DateOnly) {
  return `${dateKey(date)}T00:00:00-03:00`;
}

function diffDays(start: DateOnly, end: DateOnly) {
  return Math.round((toUtcDate(end).getTime() - toUtcDate(start).getTime()) / 86_400_000);
}

function localDateFromTimestamp(timestamp: string): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function formatShortDate(date: DateOnly) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}`;
}

function formatFullDate(date: DateOnly) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`;
}

function monthLabel(date: DateOnly) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(toUtcDate(date))
    .replace(".", "");

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildPeriod(period: PeriodKey) {
  const config = PERIODS[period];
  const today = getSaoPauloToday();
  const currentEnd = addDays(today, 1);

  if (config.months) {
    const currentStart = addMonths(firstDayOfMonth(today), -(config.months - 1));
    const previousStart = addMonths(currentStart, -config.months);

    return {
      config,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd: currentStart,
    };
  }

  const days = config.days ?? 30;
  const currentStart = addDays(today, -(days - 1));
  const previousStart = addDays(currentStart, -days);

  return {
    config,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd: currentStart,
  };
}

function createEmptyPoints(
  bucket: BucketKind,
  start: DateOnly,
  endExclusive: DateOnly,
): ProfitPoint[] {
  if (bucket === "day") {
    const count = diffDays(start, endExclusive);

    return Array.from({ length: count }, (_, index) => {
      const date = addDays(start, index);
      return {
        key: dateKey(date),
        label: formatShortDate(date),
        fullLabel: formatFullDate(date),
        profit: 0,
        revenue: 0,
        salesCount: 0,
      };
    });
  }

  if (bucket === "week") {
    const count = Math.ceil(diffDays(start, endExclusive) / 7);

    return Array.from({ length: count }, (_, index) => {
      const date = addDays(start, index * 7);
      const weekEnd = addDays(date, 6);

      return {
        key: `week-${index}`,
        label: formatShortDate(date),
        fullLabel: `${formatShortDate(date)} a ${formatShortDate(weekEnd)}`,
        profit: 0,
        revenue: 0,
        salesCount: 0,
      };
    });
  }

  const points: ProfitPoint[] = [];
  let cursor = firstDayOfMonth(start);

  while (
    cursor.year < endExclusive.year ||
    (cursor.year === endExclusive.year && cursor.month < endExclusive.month) ||
    (cursor.year === endExclusive.year &&
      cursor.month === endExclusive.month &&
      cursor.day < endExclusive.day)
  ) {
    points.push({
      key: monthKey(cursor),
      label: monthLabel(cursor),
      fullLabel: monthLabel(cursor),
      profit: 0,
      revenue: 0,
      salesCount: 0,
    });

    cursor = addMonths(cursor, 1);
  }

  return points;
}

function bucketKey(
  bucket: BucketKind,
  date: DateOnly,
  periodStart: DateOnly,
) {
  if (bucket === "day") return dateKey(date);
  if (bucket === "month") return monthKey(date);

  const index = Math.max(0, Math.floor(diffDays(periodStart, date) / 7));
  return `week-${index}`;
}

export async function GET(request: NextRequest) {
  const access = await getCurrentUserAccess();
  const requestedOperation = request.nextUrl.searchParams.get("operation");
  const operation: Operation = requestedOperation === "fitness" || requestedOperation === "company"
    ? requestedOperation
    : "suplementos";
  const canReadSupplements = access.role === "admin" || access.canAccessSupplements;
  const canReadFitness = access.role === "admin" || access.canAccessFitness;

  if (
    !access.active ||
    (operation === "suplementos" && !canReadSupplements) ||
    (operation === "fitness" && !canReadFitness) ||
    (operation === "company" && !canReadSupplements && !canReadFitness)
  ) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get("period") as PeriodKey | null;
  const period: PeriodKey = requested && requested in PERIODS ? requested : "30d";
  const { config, currentStart, currentEnd, previousStart, previousEnd } =
    buildPeriod(period);

  const supabase = await createClient();

  const supplementsQuery = canReadSupplements && operation !== "fitness"
    ? supabase.from("sales").select("delivered_at,total_profit,total_amount")
        .eq("record_type", "sale").eq("delivery_status", "delivered")
        .neq("general_status", "cancelled")
        .gte("delivered_at", toDatabaseTimestamp(previousStart))
        .lt("delivered_at", toDatabaseTimestamp(currentEnd))
        .order("delivered_at", { ascending: true })
    : Promise.resolve({ data: [], error: null });
  const fitnessQuery = canReadFitness && operation !== "suplementos"
    ? supabase.from("fitness_sales_operational").select("delivered_on,total_profit,total_amount")
        .eq("delivery_status", "delivered").neq("general_status", "cancelled")
        .gte("delivered_on", dateKey(previousStart)).lt("delivered_on", dateKey(currentEnd))
        .order("delivered_on", { ascending: true })
    : Promise.resolve({ data: [], error: null });
  const [supplementsResult, fitnessResult] = await Promise.all([supplementsQuery, fitnessQuery]);

  if (supplementsResult.error || fitnessResult.error) {
    const error = supplementsResult.error ?? fitnessResult.error;
    return NextResponse.json(
      { error: `Não foi possível carregar a evolução do lucro: ${error?.message ?? "erro desconhecido"}` },
      { status: 500 },
    );
  }

  const rows: SaleProfitRow[] = [
    ...((supplementsResult.data ?? []) as SaleProfitRow[]),
    ...((fitnessResult.data ?? []) as Array<{ delivered_on: string | null; total_profit: number | string | null; total_amount: number | string | null }>).map((row) => ({
      delivered_at: row.delivered_on,
      total_profit: row.total_profit,
      total_amount: row.total_amount,
    })),
  ].sort((left, right) => (left.delivered_at ?? "").localeCompare(right.delivered_at ?? ""));
  const points = createEmptyPoints(config.bucket, currentStart, currentEnd);
  const pointMap = new Map(points.map((point) => [point.key, point]));

  let currentTotal = 0;
  let currentRevenue = 0;
  let currentSales = 0;
  let previousTotal = 0;

  for (const row of rows) {
    if (!row.delivered_at) continue;

    const deliveredDate = localDateFromTimestamp(row.delivered_at);
    const profit = numberValue(row.total_profit);
    const revenue = numberValue(row.total_amount);

    const deliveredTime = toUtcDate(deliveredDate).getTime();
    const currentStartTime = toUtcDate(currentStart).getTime();
    const currentEndTime = toUtcDate(currentEnd).getTime();
    const previousStartTime = toUtcDate(previousStart).getTime();
    const previousEndTime = toUtcDate(previousEnd).getTime();

    if (deliveredTime >= currentStartTime && deliveredTime < currentEndTime) {
      currentTotal += profit;
      currentRevenue += revenue;
      currentSales += 1;

      const key = bucketKey(config.bucket, deliveredDate, currentStart);
      const point = pointMap.get(key);

      if (point) {
        point.profit += profit;
        point.revenue += revenue;
        point.salesCount += 1;
      }

      continue;
    }

    if (deliveredTime >= previousStartTime && deliveredTime < previousEndTime) {
      previousTotal += profit;
    }
  }

  const roundedPoints = points.map((point) => ({
    ...point,
    profit: Number(point.profit.toFixed(2)),
    revenue: Number(point.revenue.toFixed(2)),
  }));

  const bestPoint = roundedPoints.reduce<ProfitPoint | null>(
    (best, point) => (!best || point.profit > best.profit ? point : best),
    null,
  );

  const activeBuckets = roundedPoints.filter((point) => point.profit > 0);
  const averageActive =
    activeBuckets.length > 0
      ? activeBuckets.reduce((sum, point) => sum + point.profit, 0) /
        activeBuckets.length
      : 0;

  const percentageChange =
    previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  return NextResponse.json(
    {
      period,
      periodLabel: config.label,
      bucket: config.bucket,
      currentTotal: Number(currentTotal.toFixed(2)),
      currentRevenue: Number(currentRevenue.toFixed(2)),
      currentSales,
      previousTotal: Number(previousTotal.toFixed(2)),
      percentageChange:
        percentageChange === null ? null : Number(percentageChange.toFixed(1)),
      averageActive: Number(averageActive.toFixed(2)),
      bestPoint,
      points: roundedPoints,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
