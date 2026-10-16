import { BankMonthPlanner } from "@/components/bank-month-planner";
import { getBankPlanningData } from "@/lib/bank-planning-data";

export const dynamic = "force-dynamic";

export default async function BankMobilePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [data, params] = await Promise.all([getBankPlanningData(), searchParams]);
  return <BankMonthPlanner data={data} initialMonth={params.mes} />;
}
