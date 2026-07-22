import Link from "next/link";
import { KeyRound, Smartphone, Store } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerNetworkSummary } from "@/components/partner-network-summary";
import { PartnerPageActions } from "@/components/partner-page-actions";
import { PartnersTable } from "@/components/partners-table";
import { getPartnerPortalAdminSnapshot } from "@/lib/central-data";
import { getPartnersOverview } from "@/lib/data";

export default async function PartnersPage(){
  const [partners,portal]=await Promise.all([getPartnersOverview(),getPartnerPortalAdminSnapshot()]);
  return <><DemoBanner/><PageHeader eyebrow="Rede Candinho" title="Parceiros" description="Operação da rede: parceiro, estoque no ponto, vendas, acertos e acesso individual ao Portal do Parceiro." action={<PartnerPageActions/>}/>
    <article className="panel"><div className="panel-head"><div><h2>Portal do Parceiro</h2><p>A tela mobile do parceiro já mostra estoque do próprio ponto, sabores, preço de venda, vendas e histórico. Aqui você controla quem já possui acesso.</p></div><span className={`badge ${portal.without_portal_count>0?"orange":"green"}`}><KeyRound size={12}/>{portal.active_portals} ativo(s)</span></div><div className="dashboard-action-grid"><Link href="/parceiros/gerencial#portal-parceiro"><Smartphone size={18}/><div><strong>Configurar acesso</strong><span>{portal.without_portal_count} parceiro(s) ainda sem login</span></div></Link><Link href="/parceiros/gerencial"><Store size={18}/><div><strong>Saúde dos portais</strong><span>Conferir login, vínculo e isolamento de permissões</span></div></Link></div></article>
    <PartnerNetworkSummary partners={partners}/><PartnersTable partners={partners}/>
  </>;
}
