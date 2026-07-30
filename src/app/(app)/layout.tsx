import { AppShell } from "@/components/app-shell";
import { AutoPartnershipSaleUX } from "@/components/auto-partnership-sale-ux";
import { CentralCostsShortcut } from "@/components/central-costs-shortcut";
import { CentralKnowledgeNav } from "@/components/central-knowledge-nav";
import { CustomerRelationshipsPortal } from "@/components/customer-relationships-portal";
import { DesktopEscapeBack } from "@/components/desktop-escape-back";
import { DesktopSidebarController } from "@/components/desktop-sidebar-controller";
import { NexusActivityTracker } from "@/components/nexus-activity-tracker";
import { NexusCopilotDock } from "@/components/nexus-copilot-dock";
import { OperationToolSearch } from "@/components/operation-tool-search";
import { PartnerUxOverlay } from "@/components/partner-ux-overlay";
import { ProductPublicPageShortcutPortal } from "@/components/product-public-page-shortcut-portal";
import { PurchasingNavigation } from "@/components/purchasing-navigation";
import { SaleProductStockUX } from "@/components/sale-product-stock-ux";
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
    access.role === "admin" || access.canManageUsers;

  const canUseNexusOperating =
    access.active &&
    access.canAccessSupplements &&
    (access.role === "admin" || access.canWriteSupplements);

  const canManagePublicProducts =
    access.active &&
    (access.role === "admin" || access.canWriteSupplements);

  const canUseSupplementUx =
    access.active &&
    (access.canAccessSupplements || access.role === "admin");

  return (
    <DesktopSidebarController>
      <DesktopEscapeBack />
      <OperationToolSearch access={access} />
      <CentralCostsShortcut enabled={canAccessSharedCosts} />

      <NexusActivityTracker enabled={access.active} />
      <AutoPartnershipSaleUX enabled={canUseNexusOperating} />
      <CustomerRelationshipsPortal enabled={canUseNexusOperating} />
      <NexusCopilotDock enabled={canUseNexusOperating} />
      <ProductPublicPageShortcutPortal enabled={canManagePublicProducts} />

      <SaleProductStockUX enabled={canUseSupplementUx} />
      <PartnerUxOverlay enabled={canUseSupplementUx} />

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
