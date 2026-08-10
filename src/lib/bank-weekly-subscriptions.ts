export type BankWeeklyOccurrenceResolution = "paid" | "skipped";

export type BankWeeklyOccurrence = {
  subscription_id: string;
  occurrence_on: string;
  resolution: BankWeeklyOccurrenceResolution;
  amount: number;
  paid_on?: string | null;
};

export function getBrazilToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getMonthBounds(referenceDate = getBrazilToday()) {
  const [year, month] = referenceDate.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const nextStart = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { year, month, start, nextStart, lastDay };
}

export function getWeeklyOccurrenceDates(referenceDate: string) {
  const { year, month, lastDay } = getMonthBounds(referenceDate);
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return [7, 14, 21, lastDay].map(
    (day) => `${prefix}-${String(day).padStart(2, "0")}`,
  );
}

export function getWeeklyOccurrenceLabel(index: number) {
  return `${index + 1}ª semana`;
}

export function getWeeklyOccurrenceRange(referenceDate: string, index: number) {
  const { lastDay } = getMonthBounds(referenceDate);
  const ranges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, lastDay],
  ];
  const [start, end] = ranges[index] ?? ranges[0];
  return `${String(start).padStart(2, "0")} a ${String(end).padStart(2, "0")}`;
}
