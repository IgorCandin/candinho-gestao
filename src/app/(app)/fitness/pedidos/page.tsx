import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessPurchaseOrders } from "@/lib/data";
import { formatCurrency,formatDateOnly } from "@/lib/format";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");const orders=await getFitnessPurchaseOrders();return <><PageHeader eyebrow="Candinho Fitness" title="Pedidos de fornecedor" description="Pedidos em lote com recebimento parcial por peça." action={access.canWriteFitness?<Link className="button gold" href="/fitness/pedidos/novo"><Plus size={16}/>Novo pedido</Link>:undefined}/><article className="panel"><div className="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Itens</th><th>Data</th><th>Pedido</th><th>Recebido</th><th>Pendente</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order)=><tr key={order.id}><td><Link className="cell-main dashboard-inline-link" href={`/fitness/pedidos/${order.id}`}>{order.supplier_name}</Link></td><td>{order.product_summary}</td><td>{formatDateOnly(order.ordered_on)}</td><td>{order.ordered_units}</td><td>{order.received_units}</td><td>{order.pending_units}</td><td>{formatCurrency(order.order_total)}</td><td><Badge value={order.status}/></td></tr>)}</tbody></table></div></article></>}
