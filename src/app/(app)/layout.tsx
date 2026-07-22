import { AppShell } from "@/components/app-shell";
import { DesktopEscapeBack } from "@/components/desktop-escape-back";
import { DesktopSidebarController } from "@/components/desktop-sidebar-controller";
import { getCurrentUserAccess } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentUserAccess();

  return (
    <DesktopSidebarController>
      <DesktopEscapeBack />
      <AppShell access={access}>{children}</AppShell>
    </DesktopSidebarController>
  );
}
