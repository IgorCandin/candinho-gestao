import Link from "next/link";
import { Boxes, PackageCheck, PackagePlus, Plus } from "lucide-react";
import { FitnessProductCatalog } from "@/components/fitness-product-catalog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess, getFitnessProducts } from "@/lib/data";

export default async function Page(){
  const [access,products]=await Promise.all([getCurrentUserAccess(),getFitnessProducts()]);
  const active=products.filter((product)=>product.active);
  const available=active.reduce((sum,product)=>sum+product.available_quantity,0);
  const incoming=active.reduce((sum,product)=>sum+product.incoming_quantity,0);
  const salesMode=access.role==="sales";

  return <>
    <PageHeader
      eyebrow="Candinho Fitness · Catálogo"
      title="Produtos"
      description={salesMode
        ?"Consulta comercial de preço, estoque e reposição prevista."
        :"Modelos, tamanhos, cores e disponibilidade com a mesma lógica visual da Candinho Suplementos."}
      action={!salesMode&&access.canWriteFitness
        ?<Link className="button gold" href="/fitness/produtos/novo"><Plus size={16}/>Novo produto</Link>
        :null}
    />

    <section className="stats-grid">
      <StatCard href="/fitness/produtos" icon={Boxes} label="Produtos ativos" value={String(active.length)} note={`${products.length} cadastrados`}/>
      <StatCard href="/fitness/estoque" icon={PackageCheck} label="Disponível" value={String(available)} note="Unidades livres para venda"/>
      <StatCard href="/fitness/estoque" icon={PackagePlus} label="A caminho" value={String(incoming)} note="Pedidos ainda não recebidos"/>
    </section>

    <FitnessProductCatalog products={products} salesMode={salesMode}/>
  </>;
}
