import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, ClipboardCheck, PackageSearch, ShieldAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getInventoryWorkspaceSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

function detailText(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return value == null ? null : String(value);
}

export default async function InventoryReconciliationPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements)) redirect("/dashboard");

  const workspace = await getInventoryWorkspaceSnapshot();
  const locations = workspace.attention.filter((item)=>item.attention_type==="location");
  const products = workspace.attention.filter((item)=>item.attention_type==="product");

  return <>
    <PageHeader eyebrow="Estoque" title="Reconciliação" description="Pendências que precisam de conferência humana antes de qualquer ajuste no estoque físico." action={<Link className="button ghost" href="/estoque"><ArrowLeft size={16}/>Voltar ao estoque</Link>}/>

    <article className="panel inventory-reconciliation-notice">
      <div className="panel-body"><ShieldAlert size={22}/><div><strong>Nenhuma quantidade é corrigida por suposição.</strong><span>Históricos antigos e pontos sem contagem confirmada ficam destacados até você conferir fisicamente ou registrar o ajuste pelo fluxo oficial.</span></div></div>
    </article>

    <section className="inventory-reconciliation-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>Pontos que exigem conferência</h2><p>Locais com histórico legado ou saldo inicial ainda não confirmado.</p></div><Building2 size={20}/></div>
        <div className="inventory-reconciliation-list">
          {locations.length===0 ? <div className="empty"><ClipboardCheck size={24}/><strong>Nenhum ponto pendente</strong>Todos os locais estão reconciliados no fluxo atual.</div> : locations.map((item)=><div className={`inventory-reconciliation-row ${item.status}`} key={`${item.attention_type}-${item.entity_id}`}>
            <span><TriangleAlert size={17}/></span>
            <div><strong>{item.title}</strong><small>{item.status==="legacy_not_migrated"?"Histórico antigo ainda não foi convertido para movimentos canônicos.":"O sistema não possui uma contagem física confirmada para este ponto."}</small></div>
            <b>{item.status==="legacy_not_migrated"?"Revisar legado":"Confirmar contagem"}</b>
          </div>)}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Produtos em atenção</h2><p>Itens zerados, abaixo do mínimo ou com divergência operacional.</p></div><PackageSearch size={20}/></div>
        <div className="inventory-reconciliation-list">
          {products.length===0 ? <div className="empty"><ClipboardCheck size={24}/><strong>Nenhum produto pendente</strong>Não há divergências de produto sinalizadas agora.</div> : products.slice(0,60).map((item)=><Link className={`inventory-reconciliation-row product ${item.status}`} href={`/estoque/${item.entity_id}`} key={`${item.attention_type}-${item.entity_id}`}>
            <span><ShieldAlert size={17}/></span>
            <div><strong>{item.title}</strong><small>{detailText(item.details,"location_name") ?? (item.status==="out_of_stock"?"Produto zerado com meta de estoque.":"Abra o produto para revisar o saldo e a reposição.")}</small></div>
            <b>Abrir</b>
          </Link>)}
        </div>
      </article>
    </section>
  </>;
}
