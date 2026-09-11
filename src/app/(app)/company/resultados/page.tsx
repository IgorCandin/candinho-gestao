import Link from "next/link";
import { BarChart3, Dumbbell, PackageSearch, ShoppingBag, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess, getFitnessSales, getPanelCS } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Operation = "company" | "suplementos" | "fitness";
type Result = { label: string; revenue: number; profit: number; sales: number; firstSale: string | null };

function card(result: Result, tone: "supplements" | "fitness" | "company") {
  const margin = result.revenue ? (result.profit / result.revenue) * 100 : 0;
  return <article className={`company-result-card ${tone}`} key={result.label}><span>{result.label}</span><strong>{formatCurrency(result.revenue)}</strong><small>Faturamento desde a primeira venda</small><div><b>{result.sales} vendas</b><b>{formatCurrency(result.profit)} de resultado</b><b>{margin.toFixed(1).replace(".", ",")}% margem</b></div><em>{result.firstSale ? `De ${formatDateOnly(result.firstSale)} até hoje` : "Ainda não há venda entregue"}</em></article>;
}

export default async function CompanyResultsPage({ searchParams }: { searchParams: Promise<{ operacao?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const query = await searchParams;
  const operation: Operation = query.operacao === "suplementos" || query.operacao === "fitness" ? query.operacao : "company";
  const [supplements, fitnessSales] = await Promise.all([access.role === "admin" || access.canAccessSupplements ? getPanelCS("all") : Promise.resolve(null), access.role === "admin" || access.canAccessFitness ? getFitnessSales() : Promise.resolve([])]);
  const deliveredFitness = fitnessSales.filter((sale) => sale.general_status !== "cancelled" && Boolean(sale.delivered_on));
  const supplement: Result = { label: "Candinho Suplementos", revenue: supplements?.grossRevenue ?? 0, profit: supplements?.profit ?? 0, sales: supplements?.saleCount ?? 0, firstSale: supplements?.sales.map((sale) => sale.delivered_at).filter((date): date is string => Boolean(date)).sort()[0] ?? null };
  const fitness: Result = { label: "Candinho Fitness", revenue: deliveredFitness.reduce((sum, sale) => sum + sale.total_amount, 0), profit: deliveredFitness.reduce((sum, sale) => sum + sale.total_profit, 0), sales: deliveredFitness.length, firstSale: deliveredFitness.map((sale) => sale.delivered_on).filter((date): date is string => Boolean(date)).sort()[0] ?? null };
  const company: Result = { label: "Candinho Company", revenue: supplement.revenue + fitness.revenue, profit: supplement.profit + fitness.profit, sales: supplement.sales + fitness.sales, firstSale: [supplement.firstSale, fitness.firstSale].filter((date): date is string => Boolean(date)).sort()[0] ?? null };
  const selected = operation === "supplements" ? supplement : operation === "fitness" ? fitness : company;
  return <main className="company-results-page"><header><div><span>COMPANY · RESULTADOS</span><h1>Resultados da operação</h1><p>Leitura desde a primeira venda entregue até hoje, sem misturar Suplementos e Fitness.</p></div><Link className="button ghost" href="/company/gestao"><BarChart3 size={16}/>Gestão</Link></header><nav><Link className={operation === "company" ? "active" : ""} href="/company/resultados">Company</Link><Link className={operation === "supplements" ? "active" : ""} href="/company/resultados?operacao=suplementos">Suplementos</Link><Link className={operation === "fitness" ? "active" : ""} href="/company/resultados?operacao=fitness">Fitness</Link></nav><section className="company-results-feature"><div><TrendingUp/><span>{selected.label}</span><strong>{formatCurrency(selected.revenue)}</strong><p>{selected.sales} venda(s) entregue(s) · {formatCurrency(selected.profit)} de resultado</p><small>{selected.firstSale ? `Período: ${formatDateOnly(selected.firstSale)} até hoje` : "Sem vendas entregues no período"}</small></div><div className="company-results-chart" aria-label="Comparação visual de faturamento"><i style={{ width: `${company.revenue ? Math.max(8, (supplement.revenue / company.revenue) * 100) : 8}%` }}><PackageSearch/>Suplementos</i><i style={{ width: `${company.revenue ? Math.max(8, (fitness.revenue / company.revenue) * 100) : 8}%` }}><Dumbbell/>Fitness</i></div></section><section className="company-results-grid">{operation === "company" ? <>{card(supplement, "supplements")}{card(fitness, "fitness")}</> : card(selected, operation === "supplements" ? "supplements" : "fitness")}</section><p className="company-results-note">O painel considera somente venda entregue: orçamento, reserva e venda cancelada não entram no resultado.</p></main>;
}
