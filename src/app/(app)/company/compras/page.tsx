import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Lightbulb, Plus, Truck } from "lucide-react";
import { CompanyReplenishmentGroups, type CompanyReplenishmentGroup, type CompanyReplenishmentProduct } from "@/components/company-replenishment-groups";
import { PurchaseOrderCancelAction } from "@/components/purchase-order-cancel-action";
import { getCurrentUserAccess, getFitnessPurchaseOrders } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getSupplierOrdersScaleSnapshot } from "@/lib/supplier-orders-scale-data";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyPurchasesPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  const supabase = await createClient();
  const [groupsResult, productsResult, orders, fitnessOrders] = await Promise.all([
    supabase.from("replenishment_groups").select("id,name,minimum_stock,ideal_stock,preferred_product_id,members:replenishment_group_products(product_id)").eq("active", true).order("name"),
    supabase.from("products").select("id,name,brand,category,balances:stock_balances(quantity,location:locations(counts_for_replenishment))").eq("active", true).order("name"),
    getSupplierOrdersScaleSnapshot({ tab: "pending", sort: "date", page: 1, pageSize: 20 }),
    access.role === "admin" || access.canAccessFitness ? getFitnessPurchaseOrders() : Promise.resolve([]),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (productsResult.error) throw productsResult.error;

  const products: CompanyReplenishmentProduct[] = (productsResult.data ?? []).map((row) => ({
    id: String(row.id), name: String(row.name), brand: typeof row.brand === "string" ? row.brand : null,
    category: String(row.category ?? ""),
    quantity: Array.isArray(row.balances) ? row.balances.reduce((sum, balance) => {
      const location = Array.isArray(balance.location) ? balance.location[0] : balance.location;
      return sum + (location?.counts_for_replenishment === false ? 0 : Number(balance.quantity ?? 0));
    }, 0) : 0,
  }));

  const groups: CompanyReplenishmentGroup[] = (groupsResult.data ?? []).map((row) => ({
    id: String(row.id), name: String(row.name), minimum_stock: Number(row.minimum_stock), ideal_stock: Number(row.ideal_stock),
    preferred_product_id: typeof row.preferred_product_id === "string" ? row.preferred_product_id : null,
    product_ids: Array.isArray(row.members) ? row.members.map((member) => String(member.product_id)) : [],
  }));
  const suggestions = groups.map((group) => {
    const members = products.filter((product) => group.product_ids.includes(product.id));
    const current = members.reduce((sum, product) => sum + product.quantity, 0);
    return { ...group, current, quantity: Math.max(group.ideal_stock - current, 0), preferred: products.find((product) => product.id === group.preferred_product_id) };
  }).filter((group) => group.current <= group.minimum_stock && group.quantity > 0);

  return (
    <div className="company-v2-page">
      <header className="company-v2-page-head"><div><span>Company · Comprar e repor</span><h1>Comprar somente o que faz falta</h1><p>Produtos equivalentes trabalham juntos. Pedidos cancelados deixam de contar como mercadoria a caminho.</p></div><Link className="button company-blue" href="/company/compras/novo"><Plus size={16} />Novo pedido</Link></header>
      <CompanyReplenishmentGroups groups={groups} products={products} />
      <section className="company-orders-section company-purchase-suggestions">
        <div className="company-section-heading"><div><span>Nexus · Reposição</span><h2>Sugestões de compra</h2><p>O sistema soma os produtos equivalentes e sugere apenas o necessário para alcançar o estoque ideal.</p></div></div>
        {suggestions.length ? <div className="company-suggestion-strip">{suggestions.map((group) => <article key={group.id}><Lightbulb/><div><strong>{group.name}</strong><span>Comprar {group.quantity} un. de {group.preferred?.name ?? "produto preferido"}</span><small>Estoque atual {group.current} · ideal {group.ideal_stock}</small></div></article>)}</div> : <div className="company-empty-state"><Lightbulb/><strong>Nenhuma compra sugerida agora</strong><span>Os grupos estão acima do mínimo definido.</span></div>}
      </section>
      <section className="company-orders-section">
        <div className="company-section-heading"><div><span>Acompanhamento</span><h2>Pedidos em aberto</h2><p>{orders.pendingUnits} unidades a caminho em {orders.pendingCount} pedidos.</p></div></div>
        <div className="company-order-list">
          {orders.orders.map((order) => (
            <article className="panel company-order-row" key={order.id}>
              <span className="company-order-icon"><Truck size={20} /></span>
              <div className="company-order-main"><strong>{order.supplier_name}</strong><span>{order.product_summary ?? "Sem resumo"}</span><small>{formatDateOnly(order.ordered_on)} · {order.pending_units} unidades pendentes</small></div>
              <strong>{formatCurrency(order.order_total)}</strong>
              <PurchaseOrderCancelAction orderId={order.id} status={order.status} />
              <Link className="icon-button" href={`/pedidos-fornecedor/${order.id}`} aria-label="Abrir pedido"><ArrowRight size={17} /></Link>
            </article>
          ))}
          {orders.orders.length === 0 && <div className="company-empty-state"><Boxes size={24} /><strong>Nenhum pedido em aberto</strong><span>Os próximos pedidos aparecerão aqui.</span></div>}
        </div>
      </section>
      <section className="company-orders-section">
        <div className="company-section-heading"><div><span>Fitness</span><h2>Pedidos e recebimentos Fitness</h2><p>{fitnessOrders.filter((order) => order.pending_units > 0).reduce((sum, order) => sum + order.pending_units, 0)} unidades ainda a receber.</p></div></div>
        <div className="company-order-list">{fitnessOrders.filter((order) => order.pending_units > 0 && order.status !== "cancelled").map((order) => <article className="panel company-order-row" key={`fitness-${order.id}`}><span className="company-order-icon"><Truck size={20}/></span><div className="company-order-main"><strong>{order.supplier_name}</strong><span>{order.product_summary || "Produtos Fitness"}</span><small>{formatDateOnly(order.ordered_on)} · {order.received_units}/{order.ordered_units} recebidas</small></div><strong>{formatCurrency(order.grand_total)}</strong><span className="company-status danger">{order.pending_units} pendentes</span><Link className="icon-button" href={`/fitness/pedidos/${order.id}`} aria-label="Abrir pedido Fitness"><ArrowRight size={17}/></Link></article>)}{fitnessOrders.filter((order) => order.pending_units > 0 && order.status !== "cancelled").length === 0 ? <div className="company-empty-state"><Boxes/><strong>Fitness sem recebimentos pendentes</strong><span>Novos pedidos aparecerão aqui.</span></div> : null}</div>
      </section>
    </div>
  );
}
