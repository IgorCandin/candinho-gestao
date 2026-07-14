import { AppShell } from "@/components/app-shell";
import { getCurrentUserAccess } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentUserAccess();
  return <AppShell access={access}>{children}</AppShell>;
}
