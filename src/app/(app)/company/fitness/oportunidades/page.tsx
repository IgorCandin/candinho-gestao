import Link from "next/link";
import { getFitnessSizeOpportunities } from "@/lib/fitness-size-opportunities-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function FitnessOpportunitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ opportunities, sampledSales }, params] = await Promise.all([getFitnessSizeOpportunities(), searchParams]);
  const q = (params.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const visible = opportunities.filter(row => `${row.evidence.customerName} ${row.evidence.size} ${row.evidence.category}`.toLocaleLowerCase("pt-BR").includes(q));
  return <div className="company-workspace-v2 company-opportunities"><header className="company-workspace-head"><div><h1>Fitness · possibilidades de venda</h1><p>Tamanho observado em compra anterior + estoque disponível da mesma categoria. Confirme com a cliente: pode ter sido presente ou o tamanho pode variar por modelo.</p></div><Link href="/company/escritorio">Voltar ao escritório</Link></header><form className="company-workspace-toolbar"><label>Cliente, categoria ou tamanho<input name="q" defaultValue={params.q} placeholder="Ex.: G ou nome da cliente"/></label><button className="button ghost">Pesquisar</button></form><p>{visible.length} combinação(ões) · amostra das últimas {sampledSales} vendas válidas (máximo 500). Não é certeza de tamanho nem reserva de estoque.</p>
    {visible.map(({ evidence, products }) => <article className="panel" key={`${evidence.customerId}:${evidence.category}`}><div className="panel-head"><div><h2>{evidence.customerName}</h2><p>Observação: {evidence.productName}, {evidence.size}, em {formatDateOnly(evidence.date)} · {evidence.category}</p></div><Link href={`/company/clientes/fitness/${evidence.customerId}`}>Abrir ficha</Link></div><ul className="opportunity-products">{products.map(product => <li key={product.variant_id}><div><Link href={`/company/produtos/fitness/${product.product_id}`}>{product.product_name}</Link> · {product.size} · {product.color} · disponível {product.available_quantity} · {formatCurrency(product.sale_price)}</div><Link className="button ghost" href={`/company/vendas/nova/fitness?cliente=${encodeURIComponent(evidence.customerId)}&variante=${encodeURIComponent(product.variant_id)}`}>Preparar venda com esta peça</Link></li>)}</ul></article>)}
    {!visible.length ? <p>Nenhuma combinação encontrada neste recorte. Isso não significa ausência de oportunidades fora da amostra.</p> : null}
  </div>;
}
