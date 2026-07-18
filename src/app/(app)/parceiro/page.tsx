import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, CircleDollarSign, Gift, Handshake, KeyRound, LogOut, PackageOpen, Target, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getPartnerMonthlyHistory, getPartnerPortalDashboard } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateTime, formatMonthYear } from "@/lib/format";

export default async function PartnerPortalPage() {
  const access = await getCurrentUserAccess();
  if (access.role !== "partner") redirect("/dashboard");
  let dashboard;
  let history;
  try {
    [dashboard, history] = await Promise.all([getPartnerPortalDashboard(), getPartnerMonthlyHistory(12)]);
  } catch (error) {
    console.error("partner portal load error", error);
    return <section className="partner-portal-error-wrap">
      <article className="panel"><div className="empty"><TriangleAlert size={28}/><strong>Não foi possível carregar seu Portal agora</strong>Seu login está ativo, mas houve uma falha ao consultar os dados da parceria. Saia e entre novamente; se continuar, a Candinho consegue revisar o vínculo sem criar outra conta.</div></article>
      <form action="/auth/signout" method="post"><button className="button ghost" type="submit"><LogOut size={15}/>Sair e entrar novamente</button></form>
    </section>;
  }
  if (!dashboard?.profile || !dashboard.summary) {
    return <section className="partner-portal-error-wrap">
      <article className="panel"><div className="empty"><Handshake size={28}/><strong>Seu login existe, mas o vínculo com a parceria está incompleto</strong>Fale com a Candinho para vincular este usuário ao parceiro correto. Não é necessário criar outra conta.</div></article>
      <form action="/auth/signout" method="post"><button className="button ghost" type="submit"><LogOut size={15}/>Sair</button></form>
    </section>;
  }
  const { profile, summary } = dashboard;
  const isGiftPerSales = profile.reward_type === "gift_per_sales" && Boolean(summary.target_sales);
  const isFixedRepasse = profile.reward_type === "manual" && Number(profile.reward_value ?? 0) > 0;
  const completedCycles = isGiftPerSales && summary.target_sales ? Math.floor(summary.qualifying_sales_count / summary.target_sales) : 0;
  const nextCycleSales = isGiftPerSales && summary.target_sales ? summary.qualifying_sales_count % summary.target_sales : 0;
  const conditionValue = isGiftPerSales
    ? `1 benefício a cada ${summary.target_sales} vendas`
    : isFixedRepasse
      ? `${formatCurrency(profile.reward_value)} por unidade`
      : `${profile.partnership_percent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const benefitTitle = isFixedRepasse
    ? "Repasse fixo"
    : profile.reward_description ?? profile.reward_type ?? "Conforme parceria";
  const benefitNote = isFixedRepasse
    ? "O preço final de venda pode ser definido pelo parceiro; o acerto com a Candinho segue o valor de repasse cadastrado."
    : profile.settlement_frequency
      ? `Acerto: ${profile.settlement_frequency}`
      : "Acompanhe os ciclos junto à Candinho.";

  return <>
    <PageHeader eyebrow="Portal do Parceiro" title={profile.partner_name} description="Acompanhe os números da sua parceria com transparência. Você visualiza apenas os dados ligados ao seu próprio perfil." action={<div className="partner-header-actions"><Link className="button ghost" href="/parceiro/seguranca"><KeyRound size={15}/>Segurança</Link><form action="/auth/signout" method="post"><button className="button ghost" type="submit"><LogOut size={15}/>Sair</button></form></div>} />

    <section className="partner-portal-hero">
      <article className="partner-portal-contract panel"><div className="panel-body"><span className="partner-portal-icon"><Handshake size={26}/></span><div><small>{isFixedRepasse ? "Condição comercial" : "Regra da parceria"}</small><strong>{conditionValue}</strong><p>{profile.settlement_rule ?? profile.reward_description ?? "Regra de parceria cadastrada pela Candinho."}</p></div></div></article>
      <article className="partner-portal-contract panel"><div className="panel-body"><span className="partner-portal-icon"><Gift size={26}/></span><div><small>{isFixedRepasse ? "Modelo de acerto" : "Benefício / recompensa"}</small><strong>{benefitTitle}</strong><p>{benefitNote}</p></div></div></article>
    </section>

    <section className="stats-grid partner-portal-stats">
      <StatCard label="Vendas" value={String(summary.sales_count)} note={`${summary.units_sold} unidade(s) vendida(s)`} icon={CircleDollarSign}/>
      <StatCard label="Faturamento atribuído" value={formatCurrency(summary.gross_sales)} note={`${summary.delivered_sales_count} venda(s) entregue(s)`} icon={Handshake}/>
      <StatCard label="Estoque no ponto" value={String(dashboard.stock.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0))} note={`${dashboard.stock.length} produto(s) com saldo`} icon={Boxes}/>
      <StatCard
        label={isGiftPerSales ? "Próximo benefício" : "Progresso da meta"}
        value={isGiftPerSales && summary.target_sales ? `${nextCycleSales}/${summary.target_sales}` : summary.progress_percent === null ? "—" : `${Math.min(summary.progress_percent, 100).toFixed(0)}%`}
        note={isGiftPerSales ? `${completedCycles} ciclo(s) de benefício já concluído(s)` : summary.target_sales ? `${summary.qualifying_sales_count} de ${summary.target_sales} vendas` : "Sem meta numérica cadastrada"}
        icon={Target}
      />
    </section>

    <div className="partner-portal-grid">
      <article className="panel"><div className="panel-head"><div><h2>Meu estoque</h2><p>Saldo físico registrado no seu ponto parceiro.</p></div><strong>{dashboard.stock.length}</strong></div>{dashboard.stock.length === 0 ? <div className="empty"><PackageOpen size={25}/><strong>{profile.partner_type === "Consignado" ? "Aguardando conferência de estoque" : "Sem saldo registrado"}</strong>{profile.partner_type === "Consignado" ? "O ponto está cadastrado, mas o saldo físico consignado ainda precisa ser conferido pela Candinho." : "Se houver produto físico no ponto, peça uma conferência de estoque à Candinho."}</div> : <div className="table-wrap"><table className="partner-portal-table"><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço</th><th>Atualizado</th></tr></thead><tbody>{dashboard.stock.map((row) => <tr key={row.product_id}><td><strong>{row.product_name}</strong><small>{[row.category, row.brand].filter(Boolean).join(" · ")}</small></td><td className="amount positive">{row.quantity}</td><td>{formatCurrency(row.sale_price)}</td><td>{formatDateTime(row.updated_at)}</td></tr>)}</tbody></table></div>}</article>

      <article className="panel"><div className="panel-head"><div><h2>Últimas vendas</h2><p>Movimentos associados à sua parceria.</p></div><strong>{dashboard.recent_sales.length}</strong></div>{dashboard.recent_sales.length === 0 ? <div className="empty"><CircleDollarSign size={25}/><strong>Nenhuma venda no período</strong>As próximas vendas atribuídas aparecerão aqui.</div> : <div className="table-wrap"><table className="partner-portal-table"><thead><tr><th>Data</th><th>Produto</th><th>Qtd.</th><th>Valor</th><th>Status</th></tr></thead><tbody>{dashboard.recent_sales.map((sale) => <tr key={`${sale.sale_id}-${sale.product_id}`}><td>{formatDateTime(sale.sold_at)}</td><td>{sale.product_name}</td><td>{sale.quantity}</td><td>{formatCurrency(sale.total_price)}</td><td><span className={`badge ${sale.delivery_status === "delivered" ? "green" : "orange"}`}>{sale.delivery_status}</span></td></tr>)}</tbody></table></div>}</article>
    </div>

    <article className="panel partner-monthly-panel"><div className="panel-head"><div><h2>Histórico mensal</h2><p>Vendas e faturamento atribuídos ao seu perfil nos últimos 12 meses.</p></div></div><div className="table-wrap"><table className="partner-portal-table"><thead><tr><th>Mês</th><th>Vendas</th><th>Unidades</th><th>Faturamento</th>{!isGiftPerSales && !isFixedRepasse ? <><th>% parceria</th><th>Referência estimada</th></> : null}</tr></thead><tbody>{history.map((month) => <tr key={month.month_start}><td>{formatMonthYear(month.month_start)}</td><td>{month.sales_count}</td><td>{month.units_sold}</td><td>{formatCurrency(month.gross_sales)}</td>{!isGiftPerSales && !isFixedRepasse ? <><td>{month.partnership_percent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</td><td>{formatCurrency(month.estimated_partner_share)}</td></> : null}</tr>)}</tbody></table></div></article>
  </>;
}
