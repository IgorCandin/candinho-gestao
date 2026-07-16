import Link from "next/link";
import { FlaskConical, ShieldCheck, UserCheck, UserCog, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { UserPermissionsManager } from "@/components/user-permissions-manager";
import { getCurrentUserAccess, getUserPermissions } from "@/lib/data";

export default async function SettingsPage({searchParams}:{searchParams:Promise<{operacao?:string}>}) {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers) redirect("/dashboard");
  const params=await searchParams;
  const operation=params.operacao==="fitness"?"fitness":params.operacao==="suplementos"?"supplements":null;
  const operationLabel=operation==="fitness"?"Candinho Fitness":operation==="supplements"?"Candinho Suplementos":"Candinho Company";
  const users = await getUserPermissions();
  const active = users.filter((user) => user.active).length;
  const admins = users.filter((user) => user.active && user.role === "admin").length;
  const operations = users.reduce((total, user) => total + Number(user.can_access_supplements) + Number(user.can_access_fitness) + Number(user.can_access_bank), 0);

  return (
    <>
      <PageHeader eyebrow={operationLabel} title="Configurações" description="Controle acessos e use o laboratório isolado para validar funções sem tocar nos dados reais." />

      {operation ? (
        <article className="panel test-lab-entry-card">
          <div className="panel-body">
            <div className="test-lab-entry-icon"><FlaskConical size={24}/></div>
            <div className="test-lab-entry-copy"><span>Ferramenta temporária de desenvolvimento</span><h2>Área de Teste</h2><p>Uma cópia operacional isolada de {operationLabel}, com 3 produtos fictícios e estoque próprio. Vendas, cancelamentos, pedidos e recebimentos daqui nunca entram nos números reais.</p></div>
            <Link className="button gold" href={`/teste/${operation}`}>Entrar na Área de Teste</Link>
          </div>
        </article>
      ) : (
        <section className="test-lab-entry-grid">
          <article className="panel test-lab-entry-card"><div className="panel-body"><div className="test-lab-entry-icon"><FlaskConical size={22}/></div><div className="test-lab-entry-copy"><span>Laboratório isolado</span><h2>Suplementos</h2><p>Teste vendas, reservas, estoque e pedidos sem afetar a Candinho Suplementos real.</p></div><Link className="button gold" href="/teste/supplements">Abrir teste</Link></div></article>
          <article className="panel test-lab-entry-card"><div className="panel-body"><div className="test-lab-entry-icon"><FlaskConical size={22}/></div><div className="test-lab-entry-copy"><span>Laboratório isolado</span><h2>Fitness</h2><p>Teste vendas, peças, reservas e recebimentos sem afetar a Candinho Fitness real.</p></div><Link className="button gold" href="/teste/fitness">Abrir teste</Link></div></article>
        </section>
      )}

      <section className="stats-grid settings-stats-grid">
        <StatCard href="/configuracoes" icon={UsersRound} label="Usuários" value={String(users.length)} note="Contas cadastradas" />
        <StatCard href="/configuracoes" icon={UserCheck} label="Ativos" value={String(active)} note="Com acesso liberado" />
        <StatCard href="/configuracoes" icon={ShieldCheck} label="Administradores" value={String(admins)} note="Controle total" />
        <StatCard href="/configuracoes" icon={UserCog} label="Acessos a operações" value={String(operations)} note="Suplementos + Fitness + Bank" />
      </section>
      <UserPermissionsManager users={users} currentUserId={access.id} />
    </>
  );
}
