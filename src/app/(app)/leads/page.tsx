import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getLeadsHistory } from "@/lib/data";
import { formatDateOnly, formatMonthYear } from "@/lib/format";
import type { LeadRow } from "@/lib/types";

function groupByMonth(leads: LeadRow[]) {
  const groups = new Map<string, LeadRow[]>();
  for (const lead of leads) {
    const key = lead.lead_month || "sem-mes";
    groups.set(key, [...(groups.get(key) ?? []), lead]);
  }
  return Array.from(groups.entries());
}

export default async function LeadsPage() {
  const leads = await getLeadsHistory();
  const groups = groupByMonth(leads);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial"
        title="Leads"
        description="Contatos e oportunidades separados das vendas, agrupados pelo mês do primeiro atendimento."
        action={<Link className="button gold" href="/leads?novo=lead"><UserRoundPlus size={16} />Novo lead</Link>}
      />

      <nav className="period-tabs" aria-label="Área comercial">
        <Link className="period-tab" href="/vendas">Vendas</Link>
        <Link className="period-tab active" href="/leads">Leads</Link>
      </nav>

      {groups.length === 0 ? (
        <article className="panel"><div className="empty"><strong>Nenhum lead registrado</strong>Os contatos comerciais aparecerão aqui.</div></article>
      ) : (
        <div className="lead-groups">
          {groups.map(([month, monthLeads]) => (
            <section className="lead-group" key={month}>
              <div className="lead-group-title">
                <div><span>Leads do mês</span><h2>{formatMonthYear(month)}</h2></div>
                <strong>{monthLeads.length}</strong>
              </div>
              <article className="panel">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Cliente</th><th>Produto de interesse</th><th>Data</th><th>Status do lead</th><th>Contato</th><th>Referência / observações</th></tr></thead>
                    <tbody>
                      {monthLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td><div className="cell-main">{lead.customer_name}</div><div className="cell-sub">{lead.city ?? lead.location_name}</div></td>
                          <td>{lead.product_summary ?? "—"}</td>
                          <td>{formatDateOnly(lead.lead_date)}</td>
                          <td>{lead.lead_status ? <Badge value={lead.lead_status} /> : <Badge value={lead.general_status} />}</td>
                          <td><div className="cell-main">{lead.phone ?? "—"}</div><div className="cell-sub">Origem {lead.location_code}</div></td>
                          <td><div className="cell-main">{lead.reference ?? "—"}</div><div className="cell-sub multiline">{lead.notes ?? "Sem observações"}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
