import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { UserPermissionsManager } from "@/components/user-permissions-manager";
import { getCurrentUserAccess, getUserPermissions } from "@/lib/data";

export default async function SettingsPage(){
  const access=await getCurrentUserAccess();
  if(!access.canManageUsers) redirect("/dashboard");
  const users=await getUserPermissions();
  return <>
    <PageHeader eyebrow="Candinho Company" title="Perfis e permissões" description="Uma visão simples dos perfis criados e do que cada pessoa pode visualizar ou alterar em cada operação."/>
    <UserPermissionsManager users={users} currentUserId={access.id}/>
  </>;
}
