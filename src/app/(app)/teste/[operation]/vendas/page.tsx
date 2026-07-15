import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound,redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getTestLabSales } from "@/lib/data";
import { formatCurrency,formatDateOnly } from "@/lib/format";
import { parseTestLabOperation,testLabOperationLabel } from "@/lib/test-lab";
export default async function Page({params}:{params:Promise<{operation:string}>}){const{operation:raw}=await params;const operation=parseTestLabOperation(raw);if(!operation)notFound();const access=await getCurrentUserAccess();if(!access.canManageUsers)redirect("/dashboard");const sales=await getTestLabSales(operation);return <><PageHeader eyebrow={`Área de Teste · ${testLabOperationLabel(operation)}`} title="Vendas teste" description="Somente registros fictícios e isolados." action={<Link className="button gold" href={`/teste/${operation}/vendas/nova`}><Plus size={16}/>Nova venda teste</Link>}/><article className="panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Produtos</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Reserva</th><th>Total</th></tr></thead><tbody>{sales.map((sale)=><tr key={sale.id}><td><Link className="table-link" href={`/teste/${operation}/vendas/${sale.id}`}>{sale.customer_name}</Link></td><td>{sale.product_summary}</td><td>{formatDateOnly(sale.quoted_on)}</td><td><Badge value={sale.payment_status}/></td><td><Badge value={sale.delivery_status}/></td><td>{sale.reservation_status?<Badge value={sale.reservation_status}/>:"—"}</td><td>{formatCurrency(sale.total_amount)}</td></tr>)}</tbody></table></div></article></>}
