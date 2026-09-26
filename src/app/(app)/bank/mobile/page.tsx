import Link from "next/link";
import { ArrowLeft, LayoutList } from "lucide-react";
import { BankMobileAgenda } from "@/components/bank-mobile-agenda";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import type { BankMonthCommitment, BankMonthHomeData } from "@/lib/bank-home-data";
import { getBankDashboardData } from "@/lib/bank-data";

export const dynamic = "force-dynamic";

function nextMonth(referenceMonth: string) {
  const [year, month] = referenceMonth.slice(0, 7).split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default async function BankMobilePage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const dashboardPromise = getBankDashboardData();
  const current = configured ? await getBankMonthHomeDataV2() : previewMonth("2026-09-01", "setembro de 2026", [
    previewCommitment("Academia", 89.9, "2026-09-28"),
    previewCommitment("Internet", 119.9, "2026-09-30"),
  ]);
  const following = configured ? await getBankMonthHomeDataV2(nextMonth(current.referenceMonth)) : previewMonth("2026-10-01", "outubro de 2026", [
    previewCommitment("Aluguel", 850, "2026-10-02"),
    previewCommitment("Fatura Cartão", 643.2, "2026-10-05", "invoice"),
    previewCommitment("Sistema", 79.9, "2026-10-10"),
  ]);
  const dashboard = await dashboardPromise;
  const balance = configured ? dashboard.summary.totalBalance : 2250;
  const currentReceivable = configured ? current.receivableThisMonthTotal : 820;
  const currentCommitments = current.commitments.reduce((sum, row) => sum + row.amount, 0);
  const currentDifference = balance + currentReceivable - currentCommitments;
  const nextProjection = dashboard.annualProjection.find((item) => item.referenceMonth.slice(0, 7) === following.referenceMonth.slice(0, 7));
  const followingReceivable = configured ? Number(nextProjection?.totalExpectedIncome ?? following.receivableThisMonthTotal) : 1250;
  return <main className="bank-mobile-page">
    <header className="bank-mobile-page-head"><div><span>CANDINHO BANK</span><h1>Contas por dia</h1><p>Mês atual e próximo mês juntos, sem carregar a tela com detalhes desnecessários.</p></div><div><Link href="/bank"><ArrowLeft size={16}/>Visão completa</Link><span><LayoutList size={16}/>Área Mobile</span></div></header>
    <BankMobileAgenda months={[
      { label: current.monthLabel, referenceMonth: current.referenceMonth, rows: current.commitments, openingBalance: balance, receivable: currentReceivable },
      { label: following.monthLabel, referenceMonth: following.referenceMonth, rows: following.commitments, openingBalance: currentDifference, receivable: followingReceivable },
    ]}/>
  </main>;
}

function previewCommitment(title: string, amount: number, dueDate: string, kind: BankMonthCommitment["kind"] = "subscription"): BankMonthCommitment {
  return { id: `${kind}:00000000-0000-4000-8000-${String(Math.round(amount * 100)).padStart(12, "0")}`, kind, title, amount, dueDate, dueMode: "fixed_day", status: "pending", origin: "Prévia local", href: "/bank" };
}

function previewMonth(referenceMonth: string, monthLabel: string, commitments: BankMonthCommitment[]): BankMonthHomeData {
  return { referenceMonth, monthLabel, today: "2026-09-26", commitments, overdue: [], dueToday: [], upcoming: commitments, monthPending: [], remainingMonthTotal: commitments.reduce((sum, row) => sum + row.amount, 0), monthPendingTotal: 0, overdueTotal: 0, dueTodayTotal: 0, monthCommitmentTotal: commitments.reduce((sum, row) => sum + row.amount, 0), receivableThisMonthTotal: 0 };
}
