import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, ClipboardCheck, History, PackageSearch, SearchCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { InventoryReconciliationActions } from "@/components/inventory-reconciliation-actions";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getInventoryReconciliationSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function detailText(details: Record<string, unknown>, key: string) { const value = details[key]; return value == null ? null : String(value); }
const statusLabel: Record<string,string> = { open: "Aberta", reviewing: "Em análise", resolved: "Resolvida" };

export default async function InventoryReconciliationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements)) redirect("/dashboard");
  const params = await searchParams;
  const data = await getInventoryReconciliationSnapshot();
  const status = ["open","reviewing","resolved"].includes(params.status ?? "") ? params.status! : "open";
  const items = data.items.filter((item)=>item.review_status===status);
  const locations = items.filter((item)=>item.attention_type==="location");
  const products = items.filter((item)=>item.attention_type==="product");

  return <>
    <PageHeader eyebrow="Estoque" title="Reconciliação V2" description="Acompanhe divergências, coloque itens em análise e registre resoluções sem alterar o estoque automaticamente." action={<Link className="button ghost" href="/estoque"><ArrowLeft size={16}/>Voltar ao estoque</Link>}/>

    <section className="stats-grid inventory-reconciliation-stats">
      <StatCard href="/estoque/reconciliacao?status=open" label="Abertas" value={String(data.summary.open)} note="Ainda não revisadas" icon={TriangleAlert}/>
      <StatCard href="/estoque/reconciliacao?status=reviewing" label="Em análise" value={String(data.summary.reviewing)} note="Conferência em andamento" icon={SearchCheck}/>
      <StatCard href="/estoque/reconciliacao?status=resolved" label="Resolvidas atuais" value={String(data.summary.resolved_current)} note="Marcadas como revisadas" icon={CheckCircle2}/>
      <StatCard label="Total atual" value={String(data.summary.total_current)} note="Pendências detectadas pelo sistema" icon={ShieldAlert}/>
    </section>

    <article className="panel inventory-reconciliation-notice">
      <div className="panel-body"><ShieldAlert size={22}/><div><strong>Resolver uma pendência não altera nenhuma quantidade.</strong><span>O status serve para organização e auditoria. Contagem física e ajuste de saldo continuam sendo feitos pelos fluxos oficiais do estoque.</span></div></div>
    </article>

    <nav className="reconciliation-tabs">
      <Link className={status==="open"?"active":""} href="/estoque/reconciliacao?status=open">Abertas</Link>
      <Link className={status==="reviewing"?"active":""} href="/estoque/reconciliacao?status=reviewing">Em análise</Link>
      <Link className={status==="resolved"?"active":""} href="/estoque/reconciliacao?status=resolved">Resolvidas</Link>
    </nav>

    <section className="inventory-reconciliation-grid reconciliation-v2-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>Pontos de estoque</h2><p>Locais com histórico legado ou contagem física ainda não confirmada.</p></div><Building2 size={20}/></div>
        <div className="inventory-reconciliation-list">
          {locations.length===0 ? <div className="empty"><ClipboardCheck size={24}/><strong>Nenhum ponto neste status</strong>Troque o filtro para visualizar outras etapas da reconciliação.</div> : locations.map((item)=><div className={`inventory-reconciliation-row-v2 ${item.review_status}`} key={`${item.attention_type}-${item.entity_id}-${item.issue_code}`}>
            <div className="reconciliation-row-head"><span><TriangleAlert size={17}/></span><div><strong>{item.title}</strong><small>{item.issue_code==="legacy_not_migrated"?"Histórico antigo ainda não foi convertido para movimentos canônicos.":"O sistema não possui uma contagem física confirmada para este ponto."}</small></div><b>{statusLabel[item.review_status] ?? item.review_status}</b></div>
            {item.review_notes && <p className="reconciliation-note">Última observação: {item.review_notes}</p>}
            {access.canWriteSupplements && <InventoryReconciliationActions attentionType={item.attention_type} entityId={item.entity_id} issueCode={item.issue_code} currentStatus={item.review_status} currentNotes={item.review_notes}/>}          
          </div>)}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Produtos em atenção</h2><p>Itens zerados, abaixo do mínimo ou com divergência operacional.</p></div><PackageSearch size={20}/></div>
        <div className="inventory-reconciliation-list">
          {products.length===0 ? <div className="empty"><ClipboardCheck size={24}/><strong>Nenhum produto neste status</strong>Não há produtos nessa etapa da revisão.</div> : products.slice(0,80).map((item)=><div className={`inventory-reconciliation-row-v2 product ${item.review_status}`} key={`${item.attention_type}-${item.entity_id}-${item.issue_code}`}>
            <div className="reconciliation-row-head"><span><ShieldAlert size={17}/></span><div><Link href={`/estoque/${item.entity_id}`}><strong>{item.title}</strong></Link><small>{detailText(item.details,"location_name") ?? (item.issue_code==="out_of_stock"?"Produto zerado com meta de estoque.":"Abra o produto para revisar o saldo e a reposição.")}</small></div><b>{statusLabel[item.review_status] ?? item.review_status}</b></div>
            {item.review_notes && <p className="reconciliation-note">Última observação: {item.review_notes}</p>}
            {access.canWriteSupplements && <InventoryReconciliationActions attentionType={item.attention_type} entityId={item.entity_id} issueCode={item.issue_code} currentStatus={item.review_status} currentNotes={item.review_notes}/>}          
          </div>)}
        </div>
      </article>
    </section>

    <article className="panel reconciliation-history-panel">
      <div className="panel-head"><div><h2>Histórico de resoluções</h2><p>Registro auditável das últimas pendências marcadas como resolvidas.</p></div><History size={20}/></div>
      <div className="reconciliation-history-list">
        {data.history.length===0 ? <div className="empty"><History size={24}/><strong>Sem histórico ainda</strong>As resoluções registradas passarão a aparecer aqui.</div> : data.history.slice(0,80).map((item)=><div className="reconciliation-history-row" key={item.id}><span><CheckCircle2 size={16}/></span><div><strong>{item.attention_type==="location"?"Ponto de estoque":"Produto"} · {item.issue_code}</strong><small>{item.notes || "Resolvido sem observação."}</small></div><time>{item.resolved_by_name ?? "Usuário"}<br/>{formatDateTime(item.resolved_at ?? item.updated_at)}</time></div>)}
      </div>
    </article>
  </>;
}
