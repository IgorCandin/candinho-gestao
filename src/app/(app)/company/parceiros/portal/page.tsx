import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { getPartnerPortalAdminSnapshot, getPartnerPortalHealthSnapshot } from "@/lib/central-data";
import { PartnerPortalAccessManager } from "@/components/partner-portal-access-manager";
import { PageHeader } from "@/components/page-header";
export const dynamic="force-dynamic";
export default async function CompanyPartnerPortalPage(){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role!=="admin") redirect("/company/parceiros");
  const [portal,health]=await Promise.all([getPartnerPortalAdminSnapshot(),getPartnerPortalHealthSnapshot()]);
  return <><PageHeader eyebrow="Company · Parceiros" title="Acessos do Portal Parceiro" description="Mesmas funções administrativas existentes: confira vínculos e permissões antes de convidar, pausar ou reativar um acesso." action={<Link className="button ghost" href="/company/parceiros/gerencial">Voltar à gestão da rede</Link>}/><section className="panel"><div className="panel-head"><h2>Saúde dos acessos</h2><span>{health.summary.ready}/{health.summary.total} prontos</span></div><div className="table-wrap"><table><thead><tr><th>Parceiro</th><th>Login</th><th>Diagnóstico</th></tr></thead><tbody>{health.items.map(item=><tr key={item.partner_id}><td><Link href={`/company/parceiros/${item.partner_id}`}>{item.partner_name}</Link></td><td>{item.portal_username??item.portal_user_email??"Sem login"}</td><td>{item.health_status}</td></tr>)}</tbody></table></div></section><PartnerPortalAccessManager partners={portal.partners}/></>;
}
