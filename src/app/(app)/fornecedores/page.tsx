import Link from "next/link";
import { ArrowRight, Boxes, BrainCircuit, Building2, CircleDollarSign, PackageSearch, Plus, Scale } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SupplierManagementTable } from "@/components/supplier-management-table";
import { getSupplierManagementRows, getSupplierPriceComparisons } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function SuppliersManagementPage() {
  const [suppliers, comparisons] = await Promise.all([
    getSupplierManagementRows(),
    getSupplierPriceComparisons(),
  ]);
  const totalPurchase = suppliers.reduce((sum, row) => sum + row.purchase_value_365d, 0);
  const active = suppliers.filter((row) => row.active).length;
  const defaultProducts = suppliers.reduce((sum, row) => sum + row.default_product_count, 0);
  const measurable = suppliers.reduce((sum, row) => sum + row.promised_delivery_sample, 0);
  const comparedProducts = new Set(comparisons.map((row) => row.product_id)).size;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Compras · Gestão"
        title="Centro de fornecedores"
        description="Preços pagos, concentração de compras, prazo real, divergências e condições comerciais em uma visão única."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/pedidos-fornecedor/planejamento"><BrainCircuit size={16} />Planejar compras</Link>
            <Link className="button gold" href="/pedidos-fornecedor/novo"><Plus size={16} />Novo pedido</Link>
          </div>
        }
      />

      <section className="stats-grid supplier-management-stats">
        <StatCard href="/fornecedores" label="Fornecedores ativos" value={String(active)} note={`${suppliers.length} cadastrados`} icon={Building2} />
        <StatCard href="/pedidos-fornecedor" label="Comprado em 12 meses" value={formatCurrency(totalPurchase)} note="Pedidos não cancelados" icon={CircleDollarSign} />
        <StatCard href="/fornecedores" label="Fornecedores padrão" value={String(defaultProducts)} note="Produtos com fornecedor definido" icon={Boxes} />
        <StatCard href="#comparacao-precos" label="Produtos comparáveis" value={String(comparedProducts)} note="Comprados de mais de uma fonte" icon={Scale} />
      </section>

      {measurable === 0 && (
        <article className="supplier-data-notice">
          <PackageSearch size={21} />
          <div>
            <strong>Score operacional em formação</strong>
            <p>Os pedidos antigos não têm data prometida. Novos pedidos com previsão de chegada alimentarão automaticamente prazo real, atraso e score — sem estimar dados ausentes.</p>
          </div>
        </article>
      )}

      <SupplierManagementTable suppliers={suppliers} />

      <article className="panel" id="comparacao-precos">
        <div className="panel-head">
          <div><h2>Comparação de preços entre fornecedores</h2><p>Somente produtos com histórico real em mais de um fornecedor. Melhor preço considera os últimos 180 dias.</p></div>
          <Scale size={20} />
        </div>
        {comparisons.length === 0 ? (
          <div className="empty"><strong>Sem produtos comparáveis</strong>As comparações aparecerão após compras do mesmo produto em fornecedores diferentes.</div>
        ) : (
          <div className="table-wrap">
            <table className="table supplier-price-comparison-table">
              <thead><tr><th>Produto</th><th>Fornecedor</th><th>Último preço pago</th><th>Melhor preço recente</th><th>Posição</th><th></th></tr></thead>
              <tbody>{comparisons.map((row) => (
                <tr key={`${row.supplier_id}-${row.product_id}`}>
                  <td><Link className="table-link" href={`/produtos/${row.product_id}`}>{row.product_name}</Link><small>{row.brand ?? row.category}</small></td>
                  <td><Link className="table-link" href={`/fornecedores/${row.supplier_id}`}>{row.supplier_name}</Link></td>
                  <td><strong>{formatCurrency(row.last_price_paid)}</strong></td>
                  <td>{row.best_recent_price === null ? "—" : formatCurrency(row.best_recent_price)}</td>
                  <td><span className={row.recent_price_rank === 1 ? "date-status green" : "date-status"}>{row.recent_price_rank ? `${row.recent_price_rank}º de ${row.compared_supplier_count}` : "Sem base"}</span></td>
                  <td><Link className="inline-link" href={`/fornecedores/${row.supplier_id}`}>Analisar <ArrowRight size={14} /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
