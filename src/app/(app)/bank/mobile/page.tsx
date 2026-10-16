import { BankMonthPlanner } from "@/components/bank-month-planner";
import { getBankPlanningData } from "@/lib/bank-planning-data";

export const dynamic = "force-dynamic";

export default async function BankMobilePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [data, params] = await Promise.all([getBankPlanningData(), searchParams]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <BankMonthPlanner data={data} initialMonth={params.mes} today={today} />;
}
