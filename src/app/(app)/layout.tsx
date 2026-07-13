import { AppShell } from "@/components/app-shell";
import { MANAGER_EMAIL } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = MANAGER_EMAIL;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return <AppShell userEmail={userEmail}>{children}</AppShell>;
}
