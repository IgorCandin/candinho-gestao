import Link from "next/link";
import { BarChart3, Dumbbell, PackageSearch, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess, getFitnessSales, getPanelCS } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { ProfitEvolutionChart } from "@/components/profit-evolution-portal";

export const dynamic = "force-dynamic";

type Operation = "company" | "suplementos" | "fitness";
type OperationResult = {
  label: string;
  revenue: number;
  profit: number;
  sales: number;
  firstSale: string | null;
};

function firstDate(dates: Array<string | null>) {
  const validDates = dates.filter((date): date is string => Boolean(date));
  validDates.sort((left, right) => left.localeCompare(right));
  return validDates[0] ?? null;
}

function resultCard(result: OperationResult, tone: "supplements" | "fitness") {
  const margin = result.revenue > 0 ? (result.profit / result.revenue) * 100 : 0;
  return (
    <article className={`company-result-card ${tone}`} key={result.label}>
      <span>{result.label}</span>
      <strong>{formatCurrency(result.revenue)}</strong>
      <small>Faturamento desde a primeira venda entregue</small>
      <div>
        <b>{result.sales} vendas</b>
        <b>{formatCurrency(result.profit)} de resultado</b>
        <b>{margin.toFixed(1).replace(".", ",")}% de margem</b>
      </div>
      <em>{result.firstSale ? `De ${formatDateOnly(result.firstSale)} até hoje` : "Ainda não há venda entregue"}</em>
    </article>
  );
}

export default async function CompanyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  const query = await searchParams;
  const operation: Operation =
    query.operacao === "suplementos" || query.operacao === "fitness"
      ? query.operacao
      : "company";

  const canReadSupplements = access.role === "admin" || access.canAccessSupplements;
  const canReadFitness = access.role === "admin" || access.canAccessFitness;
  const [supplementsPanel, fitnessSales] = await Promise.all([
    canReadSupplements ? getPanelCS("all").catch(() => null) : Promise.resolve(null),
    canReadFitness ? getFitnessSales().catch(() => []) : Promise.resolve([]),
  ]);

  const deliveredFitness = fitnessSales.filter(
    (sale) => sale.general_status !== "cancelled" && Boolean(sale.delivered_on),
  );
  const supplements: OperationResult = {
    label: "Candinho Suplementos",
    revenue: supplementsPanel?.grossRevenue ?? 0,
    profit: supplementsPanel?.profit ?? 0,
    sales: supplementsPanel?.saleCount ?? 0,
    firstSale: firstDate((supplementsPanel?.sales ?? []).map((sale) => sale.delivered_at)),
  };
  const fitness: OperationResult = {
    label: "Candinho Fitness",
    revenue: deliveredFitness.reduce((total, sale) => total + sale.total_amount, 0),
    profit: deliveredFitness.reduce((total, sale) => total + sale.total_profit, 0),
    sales: deliveredFitness.length,
    firstSale: firstDate(deliveredFitness.map((sale) => sale.delivered_on)),
  };
  const company: OperationResult = {
    label: "Candinho Company",
    revenue: supplements.revenue + fitness.revenue,
    profit: supplements.profit + fitness.profit,
    sales: supplements.sales + fitness.sales,
    firstSale: firstDate([supplements.firstSale, fitness.firstSale]),
  };
  const selected = operation === "suplementos" ? supplements : operation === "fitness" ? fitness : company;
  const chartMaximum = Math.max(supplements.revenue, fitness.revenue, 1);

  return (
    <main className="company-results-page">
      <header>
        <div>
          <span>COMPANY · RESULTADOS</span>
          <h1>Resultados da operação</h1>
          <p>Da primeira venda entregue até hoje, com Suplementos e Fitness separados.</p>
        </div>
        <Link className="button ghost" href="/company/gestao">
          <BarChart3 size={16} /> Gestão
        </Link>
      </header>

      <nav aria-label="Escolher operação">
        <Link className={operation === "company" ? "active" : ""} href="/company/resultados">Company</Link>
        <Link className={operation === "suplementos" ? "active" : ""} href="/company/resultados?operacao=suplementos">Suplementos</Link>
        <Link className={operation === "fitness" ? "active" : ""} href="/company/resultados?operacao=fitness">Fitness</Link>
      </nav>

      <section className="company-results-feature">
        <div>
          <TrendingUp />
          <span>{selected.label}</span>
          <strong>{formatCurrency(selected.revenue)}</strong>
          <p>{selected.sales} venda(s) entregue(s) · {formatCurrency(selected.profit)} de resultado</p>
          <small>{selected.firstSale ? `Período: ${formatDateOnly(selected.firstSale)} até hoje` : "Sem vendas entregues"}</small>
        </div>
        <div className="company-results-chart" aria-label="Comparação de faturamento por operação">
          <i style={{ width: `${Math.max(8, (supplements.revenue / chartMaximum) * 100)}%` }}>
            <PackageSearch /> Suplementos
          </i>
          <i style={{ width: `${Math.max(8, (fitness.revenue / chartMaximum) * 100)}%` }}>
            <Dumbbell /> Fitness
          </i>
        </div>
      </section>

      <ProfitEvolutionChart operation={operation} />

      <section className="company-results-grid">
        {operation === "company" ? (
          <>{resultCard(supplements, "supplements")}{resultCard(fitness, "fitness")}</>
        ) : operation === "suplementos" ? (
          resultCard(supplements, "supplements")
        ) : (
          resultCard(fitness, "fitness")
        )}
      </section>
      <p className="company-results-note">Orçamentos, reservas e vendas canceladas não entram nestes resultados.</p>
    </main>
  );
}
