import { redirect } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PartnerPasswordForm } from "@/components/partner-password-form";
import { getCurrentUserAccess } from "@/lib/data";

export default async function PartnerSecurityPage() {
  const access = await getCurrentUserAccess();
  if (access.role !== "partner") redirect("/dashboard");
  return <>
    <PageHeader eyebrow="Portal do Parceiro" title="Segurança" description="Gerencie a senha usada para acessar seu painel da Candinho." />
    <div className="partner-security-grid">
      <PartnerPasswordForm/>
      <article className="panel partner-security-card"><div className="panel-head"><div><h2>Seu acesso é isolado</h2><p>O perfil parceiro não recebe acesso às operações internas da Candinho.</p></div><ShieldCheck size={20}/></div><div className="panel-body partner-security-points"><p><LockKeyhole size={16}/>Use uma senha diferente das suas redes sociais e do seu e-mail.</p><p><ShieldCheck size={16}/>A Candinho pode pausar seu acesso sem apagar seu histórico de parceria.</p></div></article>
    </div>
  </>;
}
