import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralIntegrationsPausedPage() {
  const access = await getCurrentUserAccess();

  if (access.canManageUsers) {
    redirect("/company/gestao/central/governanca");
  }

  redirect("/company/gestao/central");
}
