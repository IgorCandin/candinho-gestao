import { CompanyDailyHub } from "@/components/company-daily-hub";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { companyMigrationTools } from "@/lib/company-migration-tools";

export const dynamic="force-dynamic";
export default async function CompanyToolsPage(){
  const access=await getCurrentUserAccess();
  if(!access.active || access.role==="partner") redirect("/company/inicio");
  const allowed=companyMigrationTools.filter(tool=>access.role==="admin" || (tool.operation==="fitness"?access.canAccessFitness:access.canWriteSupplements));
  return <div className="company-workspace-v2">
    <header className="company-workspace-head"><div><h1>Ferramentas da operação</h1><p>As funções de Suplementos e Fitness, agora com acesso pela Company. Os registros e as regras são os mesmos.</p></div><Link className="button ghost" href="/company/gestao">Voltar à Gestão</Link></header>
    <CompanyDailyHub supplements={access.role === "admin" || access.canAccessSupplements} fitness={access.role === "admin" || access.canAccessFitness} bank={access.role === "admin" || access.canAccessBank}/>
    {!allowed.length?<p>Não há ferramentas disponíveis para suas permissões atuais.</p>:null}
    <p>Homologação e próximos blocos: <Link href="/company/mapa">mapa da migração</Link>.</p>
  </div>;
}
