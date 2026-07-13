import { Plus, Search } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getProducts } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function ProductsPage() {
  const products = await getProducts();
  return <><DemoBanner /><PageHeader eyebrow="Catálogo" title="Produtos" description="Cadastro único de produto, preço, custo, categoria e estoque mínimo." action={<button className="button gold"><Plus size={16} />Novo produto</button>} />
    <div className="filters"><div style={{ position: "relative" }}><Search size={16} style={{ position: "absolute", left: 13, top: 13, color: "var(--muted)" }} /><input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar produto" /></div><select className="select"><option>Todas as categorias</option></select></div>
    <article className="panel"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>
      {products.map((p) => <tr key={p.id}><td><div className="product-cell"><span className="product-avatar">{p.name.slice(0,2).toUpperCase()}</span><div><div className="cell-main">{p.name}</div><div className="cell-sub">{p.sku ?? "Sem SKU"} · {p.brand ?? "Sem marca"}</div></div></div></td><td>{p.category}</td><td>{formatCurrency(p.cost_price)}</td><td className="amount">{formatCurrency(p.sale_price)}</td><td>{formatCurrency(p.sale_price - p.cost_price)}</td><td>{p.min_stock}</td><td><span className={`badge ${p.active ? "green" : "gray"}`}><span className="dot" />{p.active ? "Ativo" : "Inativo"}</span></td></tr>)}
    </tbody></table></div></article></>;
}
