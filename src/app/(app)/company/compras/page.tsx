import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Plus, Truck } from "lucide-react";
import { CompanyReplenishmentGroups, type CompanyReplenishmentGroup, type CompanyReplenishmentProduct } from "@/components/company-replenishment-groups";
import { CompanyPurchaseSuggestions, type CompanyPurchaseSuggestion } from "@/components/company-purchase-suggestions";
import { PurchaseOrderCancelAction } from "@/components/purchase-order-cancel-action";
import { getCurrentUserAccess, getFitnessPurchaseOrders, getFitnessStock, getProductCatalog } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getSupplierOrdersScaleSnapshot } from "@/lib/supplier-orders-scale-data";
import { createClient } from "@/lib/supabase/server";

async function setInventoryPolicyMode(formData: FormData) {
  "use server";
  const access = await getCurrentUserAccess();
  if (!access.active || access.role !== "admin") redirect("/company/compras");
  const mode = String(formData.get("mode")) === "standard" ? "standard" : "lean";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("inventory_policy_settings").update({ mode, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null }).eq("id", "company");
  if (error) throw error;
  revalidatePath("/company/compras");
  revalidatePath("/company/inicio");
}

function fitnessGradeCategory(category: string, productName: string) {
  return /legging/i.test(`${category} ${productName}`) ? "Legging" : category.trim() || "Vestuário";
}

function fitnessGradeSize(size: string) {
  const normalized = size.trim().toLocaleUpperCase("pt-BR");
  return normalized === "UNICO" || normalized === "ÚNICO" ? "Único" : normalized || "Único";
}

export default async function CompanyPurchasesPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  const supabase = await createClient();
  const [groupsResult, productsResult, replenishmentResult, policyResult, productCatalog, orders, fitnessOrders, fitnessStock] = await Promise.all([
    supabase.from("replenishment_groups").select("id,name,minimum_stock,ideal_stock,preferred_product_id,members:replenishment_group_products(product_id)").eq("active", true).order("name"),
    supabase.from("products").select("id,name,brand,category,min_stock,ideal_stock,sales_category,restricted").eq("active", true).order("name"),
    supabase.from("replenishment_overview").select("product_id,available_quantity,incoming_quantity"),
    supabase.from("inventory_policy_settings").select("mode").eq("id", "company").maybeSingle(),
    getProductCatalog(),
    getSupplierOrdersScaleSnapshot({ tab: "pending", sort: "date", page: 1, pageSize: 20 }),
    access.role === "admin" || access.canAccessFitness ? getFitnessPurchaseOrders() : Promise.resolve([]),
    access.role === "admin" || access.canAccessFitness ? getFitnessStock() : Promise.resolve([]),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (productsResult.error) throw productsResult.error;
  if (replenishmentResult.error) throw replenishmentResult.error;
  if (policyResult.error) throw policyResult.error;

  const catalogById = new Map(productCatalog.map((row) => [row.id, row]));
  const centralById = new Map((replenishmentResult.data ?? []).map((row) => [String(row.product_id), row]));
  const leanMode = policyResult.data?.mode !== "standard";
  const products: CompanyReplenishmentProduct[] = (productsResult.data ?? []).map((row) => ({
    id: String(row.id), name: String(row.name), brand: typeof row.brand === "string" ? row.brand : null,
    category: String(row.category ?? ""),
    quantity: Number(centralById.get(String(row.id))?.available_quantity ?? catalogById.get(String(row.id))?.available_quantity ?? 0),
    incoming: Number(centralById.get(String(row.id))?.incoming_quantity ?? catalogById.get(String(row.id))?.incoming_quantity ?? 0),
    minimum: Number(row.min_stock ?? 0),
    ideal: Math.max(Number(row.ideal_stock ?? 0), Number(row.min_stock ?? 0)),
    salesCategory: String(row.sales_category ?? "C").toUpperCase(),
    restricted: Boolean(row.restricted),
  }));

  const groups: CompanyReplenishmentGroup[] = (groupsResult.data ?? []).map((row) => ({
    id: String(row.id), name: String(row.name), minimum_stock: Number(row.minimum_stock), ideal_stock: Number(row.ideal_stock),
    preferred_product_id: typeof row.preferred_product_id === "string" ? row.preferred_product_id : null,
    product_ids: Array.isArray(row.members) ? row.members.map((member) => String(member.product_id)) : [],
  }));
  const supplementSuggestions: CompanyPurchaseSuggestion[] = groups.map((group) => {
    const members = products.filter((product) => group.product_ids.includes(product.id));
    const current = members.reduce((sum, product) => sum + product.quantity, 0);
    const incoming = members.reduce((sum, product) => sum + product.incoming, 0);
    const preferred = products.find((product) => product.id === group.preferred_product_id);
    const essential = members.some((product) => product.salesCategory === "A" && !product.restricted);
    const target = leanMode ? Math.max(group.minimum_stock, essential ? 1 : 0) : group.ideal_stock;
    return { id: `supplements-${group.id}`, operation: "Suplementos" as const, productId: preferred?.id ?? group.preferred_product_id ?? "", name: group.name, detail: `Preferência: ${preferred?.name ?? "definir produto"}`, current, incoming, target, quantity: leanMode && !essential ? 0 : Math.max(target - current - incoming, 0), minimum: group.minimum_stock };
  }).filter((group) => group.productId && group.current + group.incoming <= group.minimum && group.quantity > 0);
  const fitnessGrade = new Map<string, { category: string; size: string; rows: typeof fitnessStock }>();
  for (const row of fitnessStock) {
    if (!row.variant_active || !row.product_active) continue;
    const category = fitnessGradeCategory(row.category, row.product_name);
    const size = fitnessGradeSize(row.size);
    const key = `${category.toLocaleLowerCase("pt-BR")}::${size.toLocaleLowerCase("pt-BR")}`;
    const current = fitnessGrade.get(key) ?? { category, size, rows: [] };
    current.rows.push(row);
    fitnessGrade.set(key, current);
  }
  const fitnessSuggestions: CompanyPurchaseSuggestion[] = Array.from(fitnessGrade.entries()).flatMap(([key, grade]) => {
    const current = grade.rows.reduce((sum, row) => sum + row.available_quantity, 0);
    const incoming = grade.rows.reduce((sum, row) => sum + row.incoming_quantity, 0);
    if (current + incoming > 0) return [];
    const selected = [...grade.rows].sort((left, right) =>
      Number(Boolean(right.default_supplier_id)) - Number(Boolean(left.default_supplier_id))
      || right.reorder_target - left.reorder_target
      || left.product_name.localeCompare(right.product_name, "pt-BR")
      || left.color.localeCompare(right.color, "pt-BR")
    )[0];
    if (!selected) return [];
    return [{
      id: `fitness-grade-${key}`,
      operation: "Fitness" as const,
      productId: selected.product_id,
      variantId: selected.variant_id,
      name: `${grade.category} · tamanho ${grade.size}`,
      detail: `${grade.rows.length} opção(ões) cadastrada(s) · sugestão: ${selected.product_name} · ${selected.color}${selected.default_supplier_name ? ` · ${selected.default_supplier_name}` : ""}`,
      current,
      incoming,
      target: 1,
      quantity: 1,
    }];
  });
  const groupedProductIds = new Set(groups.flatMap((group) => group.product_ids));
  const standaloneSuggestions: CompanyPurchaseSuggestion[] = products
    .filter((product) => !groupedProductIds.has(product.id) && !product.restricted && (leanMode ? product.salesCategory === "A" : product.ideal > 0) && product.quantity + product.incoming <= product.minimum)
    .map((product) => { const target = leanMode ? Math.max(product.minimum, 1) : product.ideal; return { id: `supplements-product-${product.id}`, operation: "Suplementos" as const, productId: product.id, name: product.name, detail: `${product.brand ?? product.category} · produto individual`, current: product.quantity, incoming: product.incoming, target, quantity: Math.max(target - product.quantity - product.incoming, 0) }; })
    .filter((product) => product.quantity > 0);
  const suggestions = [...supplementSuggestions, ...standaloneSuggestions, ...fitnessSuggestions];

  return (
    <div className="company-v2-page">
      <header className="company-v2-page-head"><div><span>Company · Comprar e repor</span><h1>Comprar somente o que faz falta</h1><p>Produtos equivalentes trabalham juntos. Pedidos cancelados deixam de contar como mercadoria a caminho.</p></div><div className="page-header-actions"><form action={setInventoryPolicyMode}><input type="hidden" name="mode" value={leanMode ? "standard" : "lean"}/><button className={leanMode ? "button company-blue" : "button ghost"} type="submit">{leanMode ? "Caixa enxuto ativo" : "Estoque padrão ativo"}</button></form><Link className="button company-blue" href="/company/compras/novo"><Plus size={16} />Novo pedido</Link></div></header>
      <CompanyReplenishmentGroups groups={groups} products={products} leanMode={leanMode} />
      <CompanyPurchaseSuggestions suggestions={suggestions} leanMode={leanMode} />
      <section className="company-orders-section">
        <div className="company-section-heading"><div><span>Acompanhamento</span><h2>Pedidos em aberto</h2><p>{orders.pendingUnits} unidades a caminho em {orders.pendingCount} pedidos.</p></div></div>
        <div className="company-order-list">
          {orders.orders.map((order) => (
            <article className="panel company-order-row" key={order.id}>
              <span className="company-order-icon"><Truck size={20} /></span>
              <div className="company-order-main"><strong>{order.supplier_name}</strong><span>{order.product_summary ?? "Sem resumo"}</span><small>{formatDateOnly(order.ordered_on)} · {order.pending_units} unidades pendentes</small></div>
              <strong>{formatCurrency(order.order_total)}</strong>
              <PurchaseOrderCancelAction orderId={order.id} status={order.status} />
              <Link className="icon-button" href={`/company/compras/suplementos/${order.id}`} aria-label="Abrir pedido"><ArrowRight size={17} /></Link>
            </article>
          ))}
          {orders.orders.length === 0 && <div className="company-empty-state"><Boxes size={24} /><strong>Nenhum pedido em aberto</strong><span>Os próximos pedidos aparecerão aqui.</span></div>}
        </div>
      </section>
      <section className="company-orders-section">
        <div className="company-section-heading"><div><span>Fitness</span><h2>Pedidos e recebimentos Fitness</h2><p>{fitnessOrders.filter((order) => order.pending_units > 0).reduce((sum, order) => sum + order.pending_units, 0)} unidades ainda a receber.</p></div></div>
        <div className="company-order-list">{fitnessOrders.filter((order) => order.pending_units > 0 && order.status !== "cancelled").map((order) => <article className="panel company-order-row" key={`fitness-${order.id}`}><span className="company-order-icon"><Truck size={20}/></span><div className="company-order-main"><strong>{order.supplier_name}</strong><span>{order.product_summary || "Produtos Fitness"}</span><small>{formatDateOnly(order.ordered_on)} · {order.received_units}/{order.ordered_units} recebidas</small></div><strong>{formatCurrency(order.grand_total)}</strong><span className="company-status danger">{order.pending_units} pendentes</span><Link className="icon-button" href={`/company/compras/fitness/${order.id}`} aria-label="Abrir pedido Fitness"><ArrowRight size={17}/></Link></article>)}{fitnessOrders.filter((order) => order.pending_units > 0 && order.status !== "cancelled").length === 0 ? <div className="company-empty-state"><Boxes/><strong>Fitness sem recebimentos pendentes</strong><span>Novos pedidos aparecerão aqui.</span></div> : null}</div>
      </section>
    </div>
  );
}
