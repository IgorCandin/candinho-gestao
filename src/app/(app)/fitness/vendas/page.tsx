import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { getFitnessSales } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function FitnessSalesPage(){const sales=await getFitnessSales();return <><PageHeader eyebrow="Candinho Fitness · Comercial" title="Vendas" description="Histórico de vendas, pagamentos, entregas e reservas de estoque." action={<Link className="button gold" href="/fitness/vendas/nova"><Plus size={16}/>Nova venda</Link>}/><article className="panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Produtos</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Reserva</th><th>Total</th></tr></thead><tbody>{sales.map((sale)=><tr key={sale.id}><td><Link className="table-link" href={`/fitness/vendas/${sale.id}`}>{sale.customer_name}</Link><small>{sale.city||"—"}</small></td><td>{sale.product_summary}</td><td>{formatDateOnly(sale.quoted_on)}</td><td><Badge value={sale.payment_status}/></td><td><Badge value={sale.delivery_status}/></td><td><Badge value={sale.reservation_status}/></td><td>{formatCurrency(sale.total_amount)}</td></tr>)}{sales.length===0&&<tr><td colSpan={7}>Nenhuma venda registrada.</td></tr>}</tbody></table></div></article></>}
