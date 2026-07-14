import { ShieldCheck, UserCheck, UserCog, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { UserPermissionsManager } from "@/components/user-permissions-manager";
import { getCurrentUserAccess, getUserPermissions } from "@/lib/data";

export default async function SettingsPage() {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers) redirect("/dashboard");
  const users = await getUserPermissions();
  const active = users.filter((user) => user.active).length;
  const admins = users.filter((user) => user.active && user.role === "admin").length;
  const operations = users.reduce((total, user) => total + Number(user.can_access_supplements) + Number(user.can_access_fitness), 0);

  return (
    <>
      <PageHeader eyebrow="Sistema" title="Usuários e permissões" description="Controle quem entra em cada operação e qual nível de acesso possui." />
      <section className="stats-grid settings-stats-grid">
        <StatCard icon={UsersRound} label="Usuários" value={String(users.length)} note="Contas cadastradas" />
        <StatCard icon={UserCheck} label="Ativos" value={String(active)} note="Com acesso liberado" />
        <StatCard icon={ShieldCheck} label="Administradores" value={String(admins)} note="Controle total" />
        <StatCard icon={UserCog} label="Acessos a operações" value={String(operations)} note="Suplementos + Fitness" />
      </section>
      <UserPermissionsManager users={users} currentUserId={access.id} />
    </>
  );
}
