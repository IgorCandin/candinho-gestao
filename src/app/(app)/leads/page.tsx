import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { LeadsTable } from "@/components/leads-table";
import { PageHeader } from "@/components/page-header";
import { getLeadsHistory } from "@/lib/data";
import { formatMonthYear } from "@/lib/format";
import type { LeadRow } from "@/lib/types";
function groupByMonth(leads:LeadRow[]){const groups=new Map<string,LeadRow[]>();for(const lead of leads){const key=lead.lead_month||"sem-mes";groups.set(key,[...(groups.get(key)??[]),lead]);}return Array.from(groups.entries());}
export default async function LeadsPage(){const leads=await getLeadsHistory();const groups=groupByMonth(leads);return <><DemoBanner/><PageHeader eyebrow="Comercial" title="Leads" description="Contatos e oportunidades separados das vendas, agrupados pelo mês do atendimento."/><nav className="period-tabs"><Link className="period-tab" href="/vendas">Vendas</Link><Link className="period-tab" href="/orcamentos">Orçamentos</Link><Link className="period-tab active" href="/leads">Leads</Link></nav>{groups.length===0?<article className="panel"><div className="empty"><strong>Nenhum lead registrado</strong>Use o botão Novo lead no cabeçalho.</div></article>:<div className="lead-groups">{groups.map(([month,rows])=>{const leadCount=new Set(rows.map((row)=>row.id)).size;return <section className="lead-group" key={month}><div className="lead-group-title"><div><span>Leads do mês</span><h2>{formatMonthYear(month)}</h2></div><strong>{leadCount} lead{leadCount===1?"":"s"} · {rows.length} produto{rows.length===1?"":"s"}</strong></div><article className="panel"><LeadsTable leads={rows}/></article></section>})}</div>}</>}
