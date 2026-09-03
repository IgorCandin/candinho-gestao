import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Plus, Truck } from "lucide-react";
import { CompanyReplenishmentGroups, type CompanyReplenishmentGroup, type CompanyReplenishmentProduct } from "@/components/company-replenishment-groups";
import { PurchaseOrderCancelAction } from "@/components/purchase-order-cancel-action";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getSupplierOrdersScaleSnapshot } from "@/lib/supplier-orders-scale-data";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyPurchasesPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  const supabase = await createClient();
  const [groupsResult, productsResult, orders] = await Promise.all([
    supabase.from("replenishment_groups").select("id,name,minimum_stock,ideal_stock,preferred_product_id,members:replenishment_group_products(product_id)").eq("active", true).order("name"),
    supabase.from("products").select("id,name,brand,category,balances:stock_balances(quantity,location:locations(counts_for_replenishment))").eq("active", true).order("name"),
    getSupplierOrdersScaleSnapshot({ tab: "pending", sort: "date", page: 1, pageSize: 20 }),
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

  return (
    <div className="company-v2-page">
      <header className="company-v2-page-head"><div><span>Company · Comprar e repor</span><h1>Comprar somente o que faz falta</h1><p>Produtos equivalentes trabalham juntos. Pedidos cancelados deixam de contar como mercadoria a caminho.</p></div><Link className="button gold" href="/pedidos-fornecedor/novo"><Plus size={16} />Novo pedido</Link></header>
      <CompanyReplenishmentGroups groups={groups} products={products} />
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
    </div>
  );
}
