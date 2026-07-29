import { AppShell } from "@/components/app-shell";
import { CentralCostsShortcut } from "@/components/central-costs-shortcut";
import { CentralKnowledgeNav } from "@/components/central-knowledge-nav";
import { DesktopEscapeBack } from "@/components/desktop-escape-back";
import { DesktopSidebarController } from "@/components/desktop-sidebar-controller";
import { OperationToolSearch } from "@/components/operation-tool-search";
import { PurchasingNavigation } from "@/components/purchasing-navigation";
import { getCurrentUserAccess } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentUserAccess();

  const canAccessSharedCosts =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness;

  const canManageCentralKnowledge =
    access.role === "admin" ||
    access.canManageUsers;

  return (
    <DesktopSidebarController>
      <DesktopEscapeBack />
      <OperationToolSearch access={access} />
      <CentralCostsShortcut enabled={canAccessSharedCosts} />

      <AppShell access={access}>
        <CentralKnowledgeNav
          canManageUsers={canManageCentralKnowledge}
        />
        <PurchasingNavigation />
        {children}
      </AppShell>
    </DesktopSidebarController>
  );
}
