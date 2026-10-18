import { compareStockAttention, stockPriority } from "@/lib/stock-attention-priority";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function StockAttentionPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner" || (access.role !== "admin" && !access.canAccessSupplements)) redirect("/company/inicio");
  const db = await createClient();
  const { data, error } = await db.from("replenishment_overview").select("product_id,product_name,available_quantity,incoming_quantity,backlog_quantity,needs_replenishment").or("needs_replenishment.eq.true,backlog_quantity.gt.0").order("product_name").limit(500);
  if (error) throw error;
  return <div className="company-workspace-v2 company-stock-attention"><header className="company-workspace-head"><div><h1>Estoque Suplementos · atenção</h1><p>Demanda aguardando estoque não é o mesmo que entrega pendente. Prioridade: demanda sem disponível primeiro, depois outras reservas e reposição. Confira pedidos a caminho antes de comprar.</p></div><Link href="/company/compras">Conferir compras e fornecedores</Link></header><section className="panel"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Disponível</th><th>A caminho</th><th>Demanda sem estoque</th><th>Ação</th></tr></thead><tbody>{[...(data ?? [])].sort(compareStockAttention).map(row => <tr key={row.product_id} className={`priority-${stockPriority(row).rank}`}><td><Link href={`/company/produtos/${row.product_id}`}>{row.product_name}</Link></td><td>{row.available_quantity}</td><td>{row.incoming_quantity}</td><td>{row.backlog_quantity}</td><td><span className="priority-label">{stockPriority(row).label}</span>{Number(row.backlog_quantity)>0 && <Link href={`/company/concluir?operacao=Suplementos&fila=deliver&produto=${row.product_id}`}>Resolver vendas deste produto</Link>}<Link href={`/company/compras/novo/suplementos?produtos=${row.product_id}`}>Montar pedido deste produto</Link></td></tr>)}</tbody></table></div>{!data?.length ? <p>Nenhum alerta encontrado.</p> : null}<p>Até 500 produtos por consulta. “A caminho” não garante cobertura desta venda: outras reservas podem estar à frente.</p></section></div>;
}
