import Link from "next/link";
import { Boxes, Building2, CircleDollarSign, ClipboardCheck, Clock3, PackageCheck, PackageOpen, ShieldAlert, TriangleAlert } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { InventoryActions } from "@/components/inventory-actions";
import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getInventoryWorkspaceSnapshot } from "@/lib/central-data";
import { getInventoryLocationOverview, getInventoryOverview, getSaleLocations } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

function detailNumber(details: Record<string, unknown>, key: string) { return Number(details[key] ?? 0); }

export default async function StockPage() {
  const [workspace, products, locations, locationRows] = await Promise.all([
    getInventoryWorkspaceSnapshot(),
    getInventoryOverview(),
    getSaleLocations(),
    getInventoryLocationOverview(),
  ]);
  const summary = workspace.summary ?? { active_products: products.length, products_with_stock: 0, physical_units: 0, reserved_units: 0, available_units: 0, incoming_units: 0, stock_cost_value: 0, stock_sale_value: 0, attention_products: 0 };
  const locationAttention = workspace.attention.filter((item) => item.attention_type === "location");
  const productAttention = workspace.attention.filter((item) => item.attention_type === "product" && (detailNumber(item.details, "ideal_stock") > 0 || detailNumber(item.details, "min_stock") > 0)).slice(0, 12);

  return <>
    <DemoBanner />
    <PageHeader eyebrow="Logística" title="Estoque" description="Aqui você controla onde cada unidade está. Cadastro e informações comerciais continuam na aba Produtos." action={<div className="page-header-actions"><Link className="button ghost" href="/estoque/reconciliacao"><ClipboardCheck size={16}/>Reconciliação</Link><InventoryActions products={products} locations={locations} locationRows={locationRows}/></div>}/>

    <section className="stats-grid inventory-stats-grid inventory-v2-stats">
      <StatCard label="Unidades físicas" value={String(summary.physical_units)} note={`${summary.products_with_stock} produtos com saldo`} icon={Boxes}/>
      <StatCard href="/pedidos-pendentes" label="Reservadas" value={String(summary.reserved_units)} note="Separadas para vendas abertas" icon={PackageCheck}/>
      <StatCard label="Disponíveis" value={String(summary.available_units)} note="Livres para novas vendas" icon={PackageOpen}/>
      <StatCard href="/pedidos-fornecedor" label="A caminho" value={String(summary.incoming_units)} note="Pedidos de fornecedor em aberto" icon={Clock3}/>
      <StatCard label="Valor de custo" value={formatCurrency(summary.stock_cost_value)} note="Capital no estoque físico" icon={CircleDollarSign}/>
      <StatCard label="Pontos monitorados" value={String(workspace.locations.length)} note="Central, parceiros e consignados" icon={Building2}/>
    </section>

    <section className="inventory-location-section">
      <div className="section-heading"><div><span>Onde está o estoque</span><h2>Saldo por local</h2><p>Uma visão física por ponto. Zeros incertos ficam sinalizados para conferência em vez de serem preenchidos por suposição.</p></div></div>
      <div className="inventory-location-grid">{workspace.locations.map((location) => {
        const alert = locationAttention.find((item) => item.entity_id === location.location_id);
        return <article className={`inventory-location-card ${alert ? "attention" : ""}`} key={location.location_id}>
          <div className="inventory-location-card-head"><span className="inventory-location-icon"><Building2 size={19}/></span><span><strong>{location.location_name}</strong><small>{location.location_code} · {location.city ?? "Sem cidade"}</small></span>{alert && <TriangleAlert size={17}/>}</div>
          <div className="inventory-location-numbers"><span><small>Físico</small><b>{location.physical_units}</b></span><span><small>Disponível</small><b>{location.available_units}</b></span><span><small>A caminho</small><b>{location.incoming_units}</b></span></div>
          <div className="inventory-location-footer"><span>{location.products_with_stock} produto(s)</span><small>{location.last_movement_at ? `Último movimento ${formatDateTime(location.last_movement_at)}` : "Sem movimento no fluxo novo"}</small></div>
          {alert && <div className="inventory-location-alert">{alert.status === "legacy_not_migrated" ? "Histórico antigo ainda não reconciliado no fluxo novo." : "Confirme a contagem inicial deste ponto."}</div>}
        </article>;
      })}</div>
    </section>

    {(locationAttention.length > 0 || productAttention.length > 0) && <article className="panel inventory-attention-panel">
      <div className="panel-head"><div><h2>Pendências de estoque</h2><p>Só o que exige ação operacional aparece aqui. Produtos sem meta de reposição não poluem esta lista.</p></div><span className="badge orange"><ShieldAlert size={13}/>{locationAttention.length + productAttention.length} itens</span></div>
      <div className="panel-body inventory-attention-list">
        {locationAttention.map((item) => <div className="inventory-attention-row location" key={`${item.attention_type}-${item.entity_id}`}><TriangleAlert size={17}/><div><strong>{item.title}</strong><span>{item.status === "legacy_not_migrated" ? "Reconciliar histórico legado" : "Confirmar contagem inicial"}</span></div><small>Local</small></div>)}
        {productAttention.map((item) => <Link className="inventory-attention-row" href={`/estoque/${item.entity_id}`} key={`${item.attention_type}-${item.entity_id}`}><ShieldAlert size={17}/><div><strong>{item.title}</strong><span>{item.status === "out_of_stock" ? "Zerado com meta de estoque" : "Abaixo do nível esperado"}</span></div><small>Produto</small></Link>)}
      </div>
    </article>}

    <article className="panel inventory-main-panel inventory-v2-products-panel">
      <div className="panel-head"><div><h2>Produtos e quantidades</h2><p>Use esta lista para consultar saldo. Para editar nome, preço, categoria ou descrição, vá em Produtos.</p></div><Link className="button ghost compact-button" href="/produtos">Abrir Produtos</Link></div>
      <InventoryTable rows={products}/>
    </article>
  </>;
}
