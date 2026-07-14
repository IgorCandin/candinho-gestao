/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Plus, Search } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getProductCatalog } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const params = await searchParams;
  const query = params.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const products = await getProductCatalog();
  const filtered = query
    ? products.filter((product) => `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(query))
    : products;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Catálogo seguro para consulta: somente preço de venda, preço a prazo e status."
        action={<button className="button gold"><Plus size={16} />Novo produto</button>}
      />

      <form className="filters" method="get">
        <div className="search-field">
          <Search size={16} />
          <input className="input" name="busca" defaultValue={params.busca ?? ""} placeholder="Buscar produto" />
        </div>
        <button className="button ghost" type="submit">Buscar</button>
        {query && <Link className="button ghost" href="/produtos">Limpar</Link>}
      </form>

      <article className="panel">
        {filtered.length === 0 ? (
          <div className="empty"><strong>Nenhum produto encontrado</strong>Tente buscar por outro nome, marca ou categoria.</div>
        ) : (
          <div className="table-wrap">
            <table className="products-table">
              <thead><tr><th>Produto</th><th>Preço à vista</th><th>Preço a prazo</th><th>Status</th><th aria-label="Abrir produto" /></tr></thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link className="product-cell product-link" href={`/produtos/${product.id}`}>
                        {product.image_url ? (
                          <img className="product-thumb" src={product.image_url} alt="" />
                        ) : (
                          <span className="product-avatar">{product.name.slice(0, 2).toUpperCase()}</span>
                        )}
                        <div><div className="cell-main">{product.name}</div><div className="cell-sub">{product.category} · {product.brand ?? "Sem marca"}</div></div>
                      </Link>
                    </td>
                    <td className="amount">{formatCurrency(product.sale_price)}</td>
                    <td className="amount">{formatCurrency(product.installment_price)}</td>
                    <td><span className={`badge ${product.active ? "green" : "gray"}`}><span className="dot" />{product.active ? "Ativo" : "Inativo"}</span></td>
                    <td><Link className="icon-link" href={`/produtos/${product.id}`} aria-label={`Abrir ${product.name}`}><ArrowRight size={18} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
