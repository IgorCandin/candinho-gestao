import Link from "next/link";
import { CircleDollarSign, Clock3, FileCheck2, FileText, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { QuotesTable } from "@/components/quotes-table";
import { StatCard } from "@/components/stat-card";
import { getQuotesHistory } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function QuotesPage() {
  const quotes = await getQuotesHistory();
  const open = quotes.filter((quote)=>quote.effective_status==="quoted");
  const expired = quotes.filter((quote)=>quote.effective_status==="expired");
  const confirmed = quotes.filter((quote)=>quote.status==="confirmed");
  const openValue = [...open,...expired].reduce((sum,quote)=>sum+quote.total_amount,0);
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Comercial" title="Orçamentos" description="Central de propostas enviadas, confirmações, perdas e histórico de PDFs." action={<Link className="button gold" href="/vendas/nova"><Plus size={16}/>Novo Orçamento</Link>}/>
    <nav className="period-tabs" aria-label="Área comercial"><Link className="period-tab" href="/vendas">Vendas</Link><Link className="period-tab active" href="/orcamentos">Orçamentos</Link><Link className="period-tab" href="/leads">Leads</Link></nav>
    <section className="stats-grid quote-stats-grid">
      <StatCard href="/orcamentos" icon={FileText} label="Em orçamento" value={String(open.length)} note="Dentro da validade"/>
      <StatCard href="/orcamentos" icon={Clock3} label="Vencidos" value={String(expired.length)} note="Podem ser revisados e reenviados"/>
      <StatCard href="/vendas" icon={FileCheck2} label="Confirmados" value={String(confirmed.length)} note="Já convertidos em venda"/>
      <StatCard href="/orcamentos" icon={CircleDollarSign} label="Valor em aberto" value={formatCurrency(openValue)} note="Orçamentos ativos + vencidos"/>
    </section>
    <article className="panel"><QuotesTable quotes={quotes}/></article>
  </>;
}
