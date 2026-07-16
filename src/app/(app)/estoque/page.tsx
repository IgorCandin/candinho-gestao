import { Boxes, CircleDollarSign, Clock3, PackageCheck, PackageOpen, ShieldAlert } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { InventoryActions } from "@/components/inventory-actions";
import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getInventoryLocationOverview, getInventoryOverview, getInventorySummary, getSaleLocations } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function StockPage() {
  const [summary, products, locations, locationRows] = await Promise.all([
    getInventorySummary(),
    getInventoryOverview(),
    getSaleLocations(),
    getInventoryLocationOverview(),
  ]);

  return <>
    <DemoBanner />
    <PageHeader eyebrow="Logística" title="Estoque" description="Saldo físico, reservas, disponibilidade e produtos a caminho em uma visão operacional." action={<InventoryActions products={products} locations={locations} locationRows={locationRows}/>}/>

    <section className="stats-grid inventory-stats-grid">
      <StatCard href="/estoque" label="Unidades físicas" value={String(summary.physical_units)} note={`${summary.products_with_stock} produtos com saldo`} icon={Boxes}/>
      <StatCard href="/pedidos-pendentes" label="Reservadas" value={String(summary.reserved_units)} note="Separadas para vendas abertas" icon={PackageCheck}/>
      <StatCard href="/estoque" label="Disponíveis" value={String(summary.available_units)} note="Livres para novas vendas" icon={PackageOpen}/>
      <StatCard href="/pedidos-fornecedor" label="A caminho" value={String(summary.incoming_units)} note="Pedidos de fornecedor em aberto" icon={Clock3}/>
      <StatCard href="/estoque" label="Valor de custo" value={formatCurrency(summary.stock_cost_value)} note="Capital no estoque físico" icon={CircleDollarSign}/>
      <StatCard href="/estoque" label="Precisam de atenção" value={String(summary.attention_products)} note="Zerados, reservados ou abaixo do mínimo" icon={ShieldAlert}/>
    </section>

    <article className="panel inventory-main-panel">
      <div className="panel-head"><div><h2>Produtos em estoque</h2><p>O mínimo é avaliado pelo total operacional; os detalhes mostram cada depósito separadamente.</p></div></div>
      <InventoryTable rows={products}/>
    </article>
  </>;
}
