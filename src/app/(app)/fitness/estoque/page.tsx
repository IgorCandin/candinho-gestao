import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess,getFitnessStock } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
export default async function Page(){const access=await getCurrentUserAccess();if(!access.canAccessFitness)redirect("/dashboard");const stock=await getFitnessStock();return <><PageHeader eyebrow="Candinho Fitness" title="Estoque" description="Controle por modelo, tamanho e cor."/><article className="panel"><div className="table-wrap"><table><thead><tr><th>Peça</th><th>Tamanho</th><th>Cor</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>A caminho</th><th>Venda</th><th>Status</th></tr></thead><tbody>{stock.map((row)=><tr key={row.variant_id}><td><Link className="cell-main dashboard-inline-link" href={`/fitness/produtos/${row.product_id}`}>{row.product_name}</Link></td><td>{row.size}</td><td>{row.color}</td><td>{row.physical_quantity}</td><td>{row.reserved_quantity}</td><td>{row.available_quantity}</td><td>{row.incoming_quantity}</td><td className="amount">{formatCurrency(row.sale_price)}</td><td><Badge value={row.stock_status}/></td></tr>)}</tbody></table></div></article></>}
