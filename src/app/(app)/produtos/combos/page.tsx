/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { AlertTriangle, Boxes, Layers3, PackageCheck, PackagePlus, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getProductCombos } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function ProductCombosPage(){
  const combos=await getProductCombos();
  const active=combos.filter((combo)=>combo.active);
  const ready=active.filter((combo)=>combo.component_count>=2);
  const pending=combos.filter((combo)=>combo.component_count<2);
  return <>
    <PageHeader eyebrow="Catálogo" title="Combos" description="Ofertas montadas com produtos reais. A disponibilidade é calculada pela composição, sem criar estoque fictício." action={<div className="page-header-actions"><Link className="button ghost" href="/produtos"><Boxes size={16}/>Produtos</Link><Link className="button gold" href="/produtos/combos/novo"><Plus size={16}/>Novo combo</Link></div>}/>
    <section className="stats-grid product-stats-grid combo-stats-grid">
      <StatCard href="/produtos/combos" icon={Layers3} label="Combos ativos" value={String(active.length)} note={`${combos.length} cadastrados`}/>
      <StatCard href="/produtos/combos" icon={PackageCheck} label="Prontos para uso" value={String(ready.length)} note="Com 2 ou mais produtos configurados"/>
      <StatCard href="/produtos/combos" icon={PackagePlus} label="Unidades possíveis" value={String(ready.reduce((sum,combo)=>sum+combo.available_quantity,0))} note="Calculadas pelo estoque dos componentes"/>
      <StatCard href="/produtos/combos" icon={AlertTriangle} label="Precisam configurar" value={String(pending.length)} note="Combos antigos sem composição cadastrada"/>
    </section>
    <article className="panel combo-list-panel"><div className="table-wrap"><table className="combo-table"><thead><tr><th>Combo</th><th>Composição</th><th>Disponível</th><th>A caminho</th><th>Custo calculado</th><th>Preço</th><th/></tr></thead><tbody>{combos.map((combo)=><tr key={combo.id}>
      <td><div className="product-cell">{combo.image_url?<img className="product-thumb" src={combo.image_url} alt=""/>:<span className="product-avatar"><Layers3 size={17}/></span>}<div><div className="cell-main">{combo.name}</div><div className="cell-sub">{combo.active?"Ativo":"Inativo"}</div></div></div></td>
      <td>{combo.component_count>=2?<span>{combo.component_summary}</span>:<span className="badge orange"><span className="dot"/>Configuração pendente</span>}</td>
      <td><strong className={combo.available_quantity>0?"positive":"muted-number"}>{combo.available_quantity}</strong></td>
      <td><strong className={combo.incoming_quantity>0?"incoming-text":"muted-number"}>{combo.incoming_quantity}</strong></td>
      <td className="amount">{formatCurrency(combo.calculated_cost)}</td><td className="amount"><strong>{formatCurrency(combo.sale_price)}</strong></td>
      <td><Link className="icon-link" href={`/produtos/combos/${combo.id}/editar`} aria-label={`Editar ${combo.name}`}><Pencil size={17}/></Link></td>
    </tr>)}{combos.length===0&&<tr><td colSpan={7}><div className="empty"><strong>Nenhum combo cadastrado</strong>Crie a primeira oferta combinando seus produtos.</div></td></tr>}</tbody></table></div></article>
  </>;
}
